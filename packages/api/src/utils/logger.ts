/**
 * Unified logging utility for BookLibrio API
 * Usage: log.d('message'), log.i('message'), log.w('message'), log.e('message')
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'network'

interface LogConfig {
  enabled: boolean
  minLevel: LogLevel
  showTimestamp: boolean
  showCaller: boolean
}

const config: LogConfig = {
  enabled: process.env.NODE_ENV !== 'test',
  minLevel: process.env.LOG_LEVEL as LogLevel || 'debug',
  showTimestamp: true,
  showCaller: true,
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  network: 1,
}

const levelConfig: Record<LogLevel, { emoji: string; color: string; label: string }> = {
  debug: { emoji: '🔍', color: colors.gray, label: 'DEBUG' },
  info: { emoji: 'ℹ️ ', color: colors.blue, label: 'INFO' },
  warn: { emoji: '⚠️ ', color: colors.yellow, label: 'WARN' },
  error: { emoji: '❌', color: colors.red, label: 'ERROR' },
  network: { emoji: '🌐', color: colors.cyan, label: 'NET' },
}

function getTimestamp(): string {
  return new Date().toISOString()
}

function getCaller(): string {
  const stack = new Error().stack
  if (!stack) return ''

  const lines = stack.split('\n')
  // Find the first line that's not from this file
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('logger.ts') && !line.includes('logger.js')) {
      const match = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):\d+\)?/)
      if (match) {
        const file = match[1].split('/').pop()
        return `${file}:${match[2]}`
      }
    }
  }
  return ''
}

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false
  return levelPriority[level] >= levelPriority[config.minLevel]
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const { emoji, color, label } = levelConfig[level]

  let output = `${emoji} ${color}[${label}]${colors.reset}`

  if (config.showTimestamp) {
    output += ` ${colors.gray}${getTimestamp()}${colors.reset}`
  }

  if (config.showCaller) {
    const caller = getCaller()
    if (caller) {
      output += ` ${colors.dim}[${caller}]${colors.reset}`
    }
  }

  output += ` ${message}`

  if (data !== undefined) {
    if (typeof data === 'object') {
      output += `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`
    } else {
      output += ` ${colors.dim}${data}${colors.reset}`
    }
  }

  return output
}

export const log = {
  /**
   * Configure logging
   */
  configure(options: Partial<LogConfig>) {
    Object.assign(config, options)
  },

  /**
   * Debug log - detailed info for debugging
   */
  d(message: string, data?: unknown) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, data))
    }
  },

  /**
   * Info log - general information
   */
  i(message: string, data?: unknown) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, data))
    }
  },

  /**
   * Warning log
   */
  w(message: string, data?: unknown) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, data))
    }
  },

  /**
   * Error log
   */
  e(message: string, error?: Error | unknown) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message))
      if (error instanceof Error) {
        console.error(`${colors.red}   Stack: ${error.stack}${colors.reset}`)
      } else if (error) {
        console.error(`${colors.red}   Details: ${JSON.stringify(error)}${colors.reset}`)
      }
    }
  },

  /**
   * Network request log
   */
  request(method: string, path: string, body?: unknown) {
    if (shouldLog('network')) {
      let message = `${colors.cyan}➡️  ${method}${colors.reset} ${path}`
      if (body) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
        if (bodyStr.length > 200) {
          message += `\n${colors.dim}   Body: ${bodyStr.substring(0, 200)}...${colors.reset}`
        } else {
          message += `\n${colors.dim}   Body: ${bodyStr}${colors.reset}`
        }
      }
      console.log(formatMessage('network', message))
    }
  },

  /**
   * Network response log
   */
  response(method: string, path: string, status: number, duration: number, body?: unknown) {
    if (shouldLog('network')) {
      const statusColor = status >= 200 && status < 300 ? colors.green : colors.red
      const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌'
      let message = `${colors.cyan}⬅️  ${method}${colors.reset} ${path} ${statusColor}${statusEmoji} ${status}${colors.reset} ${colors.dim}(${duration.toFixed(0)}ms)${colors.reset}`

      if (body && process.env.LOG_RESPONSE_BODY === 'true') {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
        if (bodyStr.length > 500) {
          message += `\n${colors.dim}   Response: ${bodyStr.substring(0, 500)}...${colors.reset}`
        } else {
          message += `\n${colors.dim}   Response: ${bodyStr}${colors.reset}`
        }
      }
      console.log(formatMessage('network', message))
    }
  },

  /**
   * Database query log
   */
  db(operation: string, table: string, duration?: number) {
    if (shouldLog('debug')) {
      let message = `${colors.magenta}🗄️  ${operation}${colors.reset} ${table}`
      if (duration !== undefined) {
        message += ` ${colors.dim}(${duration.toFixed(0)}ms)${colors.reset}`
      }
      console.log(formatMessage('debug', message))
    }
  },

  /**
   * Measure execution time
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      log.i(`⏱️  ${label}`, `${duration.toFixed(2)}ms`)
      return result
    } catch (error) {
      const duration = performance.now() - start
      log.e(`⏱️  ${label} failed after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  },

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string) {
    return {
      d: (message: string, data?: unknown) => log.d(`[${prefix}] ${message}`, data),
      i: (message: string, data?: unknown) => log.i(`[${prefix}] ${message}`, data),
      w: (message: string, data?: unknown) => log.w(`[${prefix}] ${message}`, data),
      e: (message: string, error?: Error | unknown) => log.e(`[${prefix}] ${message}`, error),
    }
  },
}

export default log
