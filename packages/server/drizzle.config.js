/**
 * Drizzle Kit Configuration
 * For database migrations and schema introspection
 */

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_PATH || './src/bookpost.db',
  },
  verbose: true,
  strict: true,
})
