package com.losportillos.tv

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.losportillos.tv.databinding.ActivityConfigBinding

/**
 * Tiny configuration screen — accessible via long-press MENU on the remote.
 * Lets a tech enter or update the /tv URL (with token) at install time.
 */
class ConfigActivity : AppCompatActivity() {

    private lateinit var binding: ActivityConfigBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityConfigBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.urlInput.setText(Prefs.getUrl(this))

        binding.saveButton.setOnClickListener {
            val newUrl = binding.urlInput.text?.toString()?.trim().orEmpty()
            if (newUrl.isBlank() || !newUrl.startsWith("http")) {
                binding.urlInput.error = getString(R.string.config_invalid_url)
                return@setOnClickListener
            }
            Prefs.setUrl(this, newUrl)
            // Bounce back to MainActivity, which will reload with the new URL.
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            )
            finish()
        }

        binding.cancelButton.setOnClickListener {
            finish()
        }

        binding.versionLabel.text = getString(R.string.config_version, BuildConfig.VERSION_NAME)
    }
}
