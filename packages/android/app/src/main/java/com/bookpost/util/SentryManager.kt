package com.bookpost.util

import android.content.Context
import com.bookpost.BuildConfig
import io.sentry.Breadcrumb
import io.sentry.Sentry
import io.sentry.SentryLevel
import io.sentry.SentryOptions
import io.sentry.android.core.SentryAndroid
import io.sentry.protocol.User

/**
 * Manages Sentry error tracking and performance monitoring for BookPost Android.
 */
object SentryManager {

    /**
     * Initialize Sentry SDK - call this in Application.onCreate()
     */
    fun initialize(context: Context) {
        val dsn = BuildConfig.SENTRY_DSN
        if (dsn.isEmpty()) {
            return
        }

        SentryAndroid.init(context) { options ->
            options.dsn = dsn

            // Environment
            options.environment = if (BuildConfig.DEBUG) "development" else "production"

            // Release version: booklibrio-android@version+versionCode
            options.release = "booklibrio-android@${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"

            // Sample rates
            if (BuildConfig.DEBUG) {
                options.tracesSampleRate = 1.0
                options.isDebug = true
            } else {
                options.tracesSampleRate = 0.2
            }

            // Profiling
            options.profilesSampleRate = 0.1

            // Breadcrumbs
            options.maxBreadcrumbs = 100

            // Privacy - don't send PII by default
            options.isSendDefaultPii = false

            // Attach stack traces to all events
            options.isAttachStacktrace = true

            // ANR detection
            options.isAnrEnabled = true
            options.anrTimeoutIntervalMillis = 2000

            // Screenshots (disabled for privacy)
            options.isAttachScreenshot = false
            options.isAttachViewHierarchy = false

            // Filter sensitive data from requests
            options.beforeSend = SentryOptions.BeforeSendCallback { event, _ ->
                event.request?.headers?.let { headers ->
                    val filtered = headers.toMutableMap()
                    filtered.remove("Authorization")
                    filtered.remove("Cookie")
                    event.request?.headers = filtered
                }
                event
            }
        }
    }

    // MARK: - User Context

    /**
     * Set user context after login
     */
    fun setUser(userId: Int, username: String? = null, email: String? = null) {
        val user = User().apply {
            id = userId.toString()
            this.username = username
            this.email = email
        }
        Sentry.setUser(user)
    }

    /**
     * Clear user context on logout
     */
    fun clearUser() {
        Sentry.setUser(null)
    }

    // MARK: - Breadcrumbs

    /**
     * Add a breadcrumb for tracking user actions
     */
    fun addBreadcrumb(
        category: String,
        message: String,
        level: SentryLevel = SentryLevel.INFO,
        data: Map<String, Any>? = null
    ) {
        val breadcrumb = Breadcrumb().apply {
            this.category = category
            this.message = message
            this.level = level
            data?.forEach { (key, value) -> this.setData(key, value) }
        }
        Sentry.addBreadcrumb(breadcrumb)
    }

    /**
     * Add UI breadcrumb (screen views, button taps, etc.)
     */
    fun addUIBreadcrumb(message: String, data: Map<String, Any>? = null) {
        addBreadcrumb("ui", message, SentryLevel.INFO, data)
    }

    /**
     * Add navigation breadcrumb
     */
    fun addNavigationBreadcrumb(from: String?, to: String) {
        val data = mutableMapOf<String, Any>("to" to to)
        from?.let { data["from"] = it }
        addBreadcrumb("navigation", "Navigated to $to", SentryLevel.INFO, data)
    }

    /**
     * Add HTTP breadcrumb
     */
    fun addHTTPBreadcrumb(method: String, url: String, statusCode: Int? = null) {
        val data = mutableMapOf<String, Any>(
            "method" to method,
            "url" to url
        )
        statusCode?.let { data["status_code"] = it }

        val level = when {
            statusCode == null -> SentryLevel.INFO
            statusCode in 200..299 -> SentryLevel.INFO
            else -> SentryLevel.ERROR
        }

        addBreadcrumb("http", "$method $url", level, data)
    }

    // MARK: - Error Capture

    /**
     * Capture an exception with optional context
     */
    fun captureException(throwable: Throwable, context: Map<String, Any>? = null) {
        Sentry.captureException(throwable) { scope ->
            context?.forEach { (key, value) ->
                scope.setExtra(key, value)
            }
        }
    }

    /**
     * Capture a message
     */
    fun captureMessage(message: String, level: SentryLevel = SentryLevel.INFO) {
        Sentry.captureMessage(message, level)
    }

    // MARK: - Distributed Tracing

    /**
     * Get trace headers for API requests (for distributed tracing)
     */
    fun getTraceHeaders(): Map<String, String> {
        val headers = mutableMapOf<String, String>()
        Sentry.getSpan()?.let { span ->
            headers["sentry-trace"] = span.toSentryTrace().value
            span.toBaggageHeader(null)?.let { baggage ->
                headers["baggage"] = baggage.value
            }
        }
        return headers
    }
}
