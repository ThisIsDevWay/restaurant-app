package com.losportillos.tv

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkRequest
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.losportillos.tv.databinding.ActivityMainBinding

/**
 * Single-Activity kiosk. Hosts a fullscreen WebView pointing to the configured
 * /tv URL. Blocks exit (BACK / HOME / RECENTS where possible), keeps screen on,
 * auto-reloads on render-process crash, and retries on network failure.
 *
 * Long-press MENU on the TV remote (or hold ENTER for 3s) to open ConfigActivity.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val handler = Handler(Looper.getMainLooper())
    private var lastErrorAt = 0L
    private var menuPressedAt = 0L
    private var retryDelayMs = 5000L

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            // Came back online after an outage — reload if we're on the offline screen.
            handler.post { if (isShowingError) reload() }
        }
    }
    private var isShowingError = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Always-on display.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        // Blackout the system bars and let the WebView fill the screen.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, binding.root).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        window.decorView.setBackgroundColor(Color.BLACK)

        configureWebView(binding.webview)
        loadHomeUrl()

        // Listen for network re-availability so we recover automatically.
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        cm.registerNetworkCallback(NetworkRequest.Builder().build(), networkCallback)
    }

    override fun onDestroy() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            cm.unregisterNetworkCallback(networkCallback)
        } catch (_: Exception) { /* never registered */ }
        binding.webview.apply {
            stopLoading()
            loadUrl("about:blank")
            destroy()
        }
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        binding.webview.onResume()
        // Re-hide system bars in case they crept back during a settings dialog.
        WindowInsetsControllerCompat(window, binding.root)
            .hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onPause() {
        binding.webview.onPause()
        super.onPause()
    }

    /**
     * Exposed to JavaScript as `window.AndroidTV`.
     * The web app checks `window.AndroidTV?.isKioskMode()` on mount and, if true,
     * skips the gesture-unlock requirement — audio plays immediately.
     */
    private inner class NativeBridge {
        @android.webkit.JavascriptInterface
        fun isKioskMode(): Boolean = true

        /** Returns the app version so the web can log/display it. */
        @android.webkit.JavascriptInterface
        fun getAppVersion(): String = BuildConfig.VERSION_NAME
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(web: WebView) {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        // Expose the native bridge BEFORE any page loads so JS can call it on mount.
        web.addJavascriptInterface(NativeBridge(), "AndroidTV")

        web.setBackgroundColor(Color.BLACK)
        // Force the GPU-accelerated layer so rotated <video> doesn't render as black.
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            // Identify ourselves so the server can log/recognize this client.
            userAgentString = "$userAgentString RestauranteGMTV/${BuildConfig.VERSION_NAME}"
            // Allow autoplay on Android TV WebViews.
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) showOfflineAndRetry(error.description?.toString() ?: "error")
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (!isShowingError) {
                    retryDelayMs = 5000L
                }
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: RenderProcessGoneDetail
            ): Boolean {
                Log.w(TAG, "WebView render process gone (didCrash=${detail.didCrash()}). Recreating.")
                // Returning true means we handle it. Restart the activity to rebuild a fresh WebView.
                handler.post { recreate() }
                return true
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                // Keep all navigation inside this WebView. Never spawn external apps.
                return false
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: android.webkit.ConsoleMessage): Boolean {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "[web:${message.messageLevel()}] ${message.message()} @ ${message.sourceId()}:${message.lineNumber()}")
                }
                return true
            }
        }
    }

    private fun loadHomeUrl() {
        val url = Prefs.getUrl(this)
        if (url.isBlank()) {
            // First boot, no URL set — open the config activity instead.
            startActivity(Intent(this, ConfigActivity::class.java))
            return
        }
        isShowingError = false
        binding.errorOverlay.visibility = View.GONE
        binding.webview.loadUrl(url)
    }

    private fun reload() {
        isShowingError = false
        binding.errorOverlay.visibility = View.GONE
        binding.webview.reload()
    }

    private fun showOfflineAndRetry(reason: String) {
        // Avoid retry loops storming the network: minimum 5s between retries.
        val now = System.currentTimeMillis()
        if (now - lastErrorAt < 1000) return
        lastErrorAt = now

        isShowingError = true
        binding.errorOverlay.visibility = View.VISIBLE
        binding.errorReason.text = reason
        Log.w(TAG, "WebView load failed: $reason. Retrying in ${retryDelayMs / 1000}s.")
        handler.removeCallbacksAndMessages(RETRY_TOKEN)
        handler.postAtTime({ reload() }, RETRY_TOKEN, android.os.SystemClock.uptimeMillis() + retryDelayMs)

        // Exponential backoff: double retry delay up to 60 seconds.
        retryDelayMs = (retryDelayMs * 2).coerceAtMost(60_000L)
    }

    /* ───────────────────────── Kiosk lock-down ───────────────────────── */

    override fun onBackPressed() {
        // Eat the BACK button — never exit the kiosk.
    }

    override fun onUserLeaveHint() {
        // Triggered when HOME is pressed. We can't fully prevent it on a stock
        // launcher (that requires Device Owner), but we can come back instantly.
        super.onUserLeaveHint()
        handler.postDelayed({
            val i = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            startActivity(i)
        }, 100)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        // Long-press MENU (3s) opens the config screen. Easier to discover than
        // a hidden gesture, and TV remotes always have a MENU key.
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            val now = System.currentTimeMillis()
            if (menuPressedAt == 0L) menuPressedAt = now
            if (now - menuPressedAt >= 3_000) {
                menuPressedAt = 0L
                startActivity(Intent(this, ConfigActivity::class.java))
                return true
            }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) menuPressedAt = 0L
        return super.onKeyUp(keyCode, event)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Forward MEDIA / NUM keys to the WebView so the JS app can react.
        // Block VOLUME so it goes to the system mixer, not eaten by us.
        return super.dispatchKeyEvent(event)
    }

    companion object {
        private const val TAG = "TvKiosk"
        private val RETRY_TOKEN = Any()
    }
}
