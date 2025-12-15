package com.bookpost

import android.app.Application
import com.bookpost.util.SentryManager
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class BookPostApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize Sentry for error tracking
        SentryManager.initialize(this)
    }
}
