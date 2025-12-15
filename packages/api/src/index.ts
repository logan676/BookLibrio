// Initialize Sentry first - must be before any other imports
import { initSentry, Sentry } from './lib/sentry'
initSentry()

import { serve } from '@hono/node-server'
import { app } from './app'
import { testConnection } from './db/client'
import { initializeJobs, stopJobs } from './jobs'
import 'dotenv/config'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  // Test database connection
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...')
    process.exit(1)
  }

  // Start server
  console.log(`Starting BookLibrio API server...`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',  // Listen on all interfaces for Docker/Fly.io
  }, (info) => {
    console.log(`Server running at http://0.0.0.0:${info.port}`)
    console.log(`OpenAPI docs at http://0.0.0.0:${info.port}/api/openapi.json`)

    // Initialize background jobs after server starts
    initializeJobs()
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...')
    stopJobs()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...')
    stopJobs()
    process.exit(0)
  })
}

main().catch(console.error)
