package com.losportillos.tv

import android.content.Context

/**
 * Single key/value store for the configured /tv URL. Persisted via
 * SharedPreferences so it survives reboots and app updates.
 */
object Prefs {
    private const val FILE = "tv_kiosk_prefs"
    private const val KEY_URL = "home_url"

    fun getUrl(context: Context): String {
        val sp = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        return sp.getString(KEY_URL, BuildConfig.DEFAULT_URL).orEmpty()
    }

    fun setUrl(context: Context, url: String) {
        context.applicationContext
            .getSharedPreferences(FILE, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_URL, url)
            .apply()
    }
}
