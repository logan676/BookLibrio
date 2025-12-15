/**
 * Sentry Middleware for Hono
 *
 * Provides distributed tracing and error capture for API requests.
 * Continues trace context from client requests for end-to-end visibility.
 */
import * as Sentry from '@sentry/node'
import type { MiddlewareHandler } from 'hono'

/**
 * Sentry tracing middleware
 * - Continues trace from client sentry-trace header
 * - Creates spans for each request
 * - Captures exceptions automatically
 */
export const sentryMiddleware: MiddlewareHandler = async (c, next) => {
  // Skip if Sentry is not initialized
  if (!process.env.SENTRY_DSN) {
    return next()
  }

  // Get trace context from client headers (for distributed tracing)
  const sentryTrace = c.req.header('sentry-trace')
  const baggage = c.req.header('baggage')

  return Sentry.continueTrace(
    { sentryTrace, baggage },
    async () => {
      return Sentry.startSpan(
        {
          op: 'http.server',
          name: `${c.req.method} ${c.req.routePath || c.req.path}`,
          attributes: {
            'http.method': c.req.method,
            'http.url': c.req.url,
            'http.route': c.req.routePath || c.req.path,
          },
        },
        async (span) => {
          try {
            // Set user context if available (from auth middleware)
            const user = c.get('user')
            if (user) {
              Sentry.setUser({ id: String(user.id) })
            }

            await next()

            // Set response status
            const status = c.res.status
            if (span) {
              span.setStatus({
                code: status < 400 ? 1 : 2, // 1 = OK, 2 = ERROR
                message: status < 400 ? 'ok' : 'error',
              })
              span.setAttribute('http.status_code', status)
            }
          } catch (error) {
            // Capture exception with request context
            Sentry.captureException(error, {
              extra: {
                method: c.req.method,
                path: c.req.path,
                query: c.req.query(),
              },
            })

            if (span) {
              span.setStatus({ code: 2, message: 'internal_error' })
            }

            throw error
          }
        }
      )
    }
  )
}

/**
 * Add breadcrumb for important events
 */
export function addBreadcrumb(
  message: string,
  category: string = 'app',
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

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level,
    extra,
  })
}

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra,
  })
}
