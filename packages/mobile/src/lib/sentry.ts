/**
 * Sentry Integration for BookLibrio React Native App
 *
 * Provides error tracking, performance monitoring, and user context management.
 * Must be initialized before the app renders.
 */
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get DSN from environment or constants
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || Constants.expoConfig?.extra?.sentryDsn

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization')
    return
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0'
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1'

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `booklibrio-mobile@${appVersion}+${buildNumber}`,

    // Performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Enable native crash handling
    enableNative: true,
    enableNativeCrashHandling: true,

    // Session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Breadcrumbs
    maxBreadcrumbs: 100,
    enableAutoPerformanceTracing: true,

    // Attachments
    attachStacktrace: true,
    attachScreenshot: !__DEV__, // Only in production
    attachViewHierarchy: !__DEV__,

    // Privacy
    sendDefaultPii: false,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
      }

      // Filter breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data?.headers) {
            delete crumb.data.headers['Authorization']
            delete crumb.data.headers['Cookie']
          }
          return crumb
        })
      }

      return event
    },

    // Debug mode
    debug: __DEV__,
  })

  console.log(`[Sentry] Initialized for ${__DEV__ ? 'development' : 'production'} environment`)
}

// Re-export Sentry for use in other modules
export { Sentry }

/**
 * Set user context after login
 */
export function setUser(userId: number, username?: string) {
  Sentry.setUser({
    id: String(userId),
    username,
  })
}

/**
 * Clear user context on logout
 */
export function clearUser() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for navigation
 */
export function addNavigationBreadcrumb(routeName: string, params?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${routeName}`,
    level: 'info',
    data: params,
  })
}

/**
 * Add breadcrumb for user action
 */
export function addActionBreadcrumb(action: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'ui',
    message: action,
    level: 'info',
    data,
  })
}

/**
 * Capture an error with context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

/**
 * Get trace headers for API requests (distributed tracing)
 */
export function getTraceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const span = Sentry.getActiveSpan()

  if (span) {
    const traceHeader = Sentry.spanToTraceHeader(span)
    if (traceHeader) {
      headers['sentry-trace'] = traceHeader
    }

    const baggage = Sentry.spanToBaggageHeader(span)
    if (baggage) {
      headers['baggage'] = baggage
    }
  }

  return headers
}
