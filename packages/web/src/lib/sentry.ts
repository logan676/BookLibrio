/**
 * Sentry Integration for BookLibrio Web Client
 *
 * Initializes error tracking, performance monitoring, and session replay.
 * Must be called before React renders.
 */
import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    integrations: [
      // Browser performance tracing
      Sentry.browserTracingIntegration(),
      // Session replay for error debugging
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block media
      }),
    ],

    // Performance monitoring sample rate
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Session replay sample rates
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when error occurs

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive data from request
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
      }

      // Remove sensitive data from breadcrumbs
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

    // Filter URLs to track
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/booklibrio-api\.fly\.dev/,
      /^https:\/\/api\.booklibrio\.com/,
    ],
  })

  console.log(`[Sentry] Initialized for ${import.meta.env.MODE} environment`)
}

// Re-export Sentry utilities
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
 * Add breadcrumb for important events
 */
export function addBreadcrumb(
  message: string,
  category: string = 'ui',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}
