package com.losportillos.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Auto-launches MainActivity when the TV finishes booting (or wakes from
 * QuickBoot on Aiwa/Sony hardware). The user never has to navigate to the
 * Apps menu — the kiosk takes over the screen automatically.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                val launch = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(launch)
            }
        }
    }
}
