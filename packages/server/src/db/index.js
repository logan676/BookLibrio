/**
 * Drizzle ORM Database Connection
 * Provides type-safe database access with query builder
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Database path from environment or default
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'bookpost.db')

// Create better-sqlite3 instance
const sqlite = new Database(dbPath)

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL')

// Create Drizzle ORM instance with schema
export const db = drizzle(sqlite, { schema })

// Export raw sqlite connection for backward compatibility
export const rawDb = sqlite

// Export schema for use in queries
export { schema }

// Helper to close database connection
export function closeDatabase() {
  sqlite.close()
}
