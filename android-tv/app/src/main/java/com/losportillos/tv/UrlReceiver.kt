package com.losportillos.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Receives URL configuration broadcasts from ADB:
 *
 *   adb shell am broadcast -a com.restaurantgm.tv.SET_URL \
 *     --es url "https://your-domain.com/tv?token=tv_abc123"
 *
 * This lets you batch-configure all 7 Aiwa TVs from a laptop — no remote
 * typing required. After receiving, the active MainActivity is restarted
 * so the new URL takes effect immediately.
 */
class UrlReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.restaurantgm.tv.SET_URL") return
        val url = intent.getStringExtra("url")?.trim().orEmpty()
        if (url.isBlank() || !url.startsWith("http")) return

        Prefs.setUrl(context, url)

        // Bring MainActivity to the front and let it reload from prefs.
        val launch = Intent(context, MainActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }
        context.startActivity(launch)
    }
}
