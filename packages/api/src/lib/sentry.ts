/**
 * Sentry Integration for BookLibrio API Server
 *
 * Initializes error tracking and performance monitoring.
 * Must be called before any other imports in the application entry point.
 */
import * as Sentry from '@sentry/node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization')
    return
  }

  // Get version from package.json
  const version = process.env.npm_package_version || '1.0.0'

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `booklibrio-api@${version}`,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 0.1,

    // Integrations
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],

    // Filter sensitive data before sending
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data?.headers) {
            delete crumb.data.headers['authorization']
            delete crumb.data.headers['cookie']
          }
          return crumb
        })
      }

      return event
    },

    // Filter breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't capture SQL queries with potential sensitive data
      if (breadcrumb.category === 'query' && breadcrumb.message) {
        if (breadcrumb.message.toLowerCase().includes('password')) {
          return null
        }
      }
      return breadcrumb
    },
  })

  console.log(`[Sentry] Initialized for ${process.env.NODE_ENV || 'development'} environment`)
}

// Re-export Sentry for use in other modules
export { Sentry }
