import { Request, Response, NextFunction } from 'express'

// User types
export interface User {
  id: number
  email: string
  password_hash: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: number
  email: string
  is_admin: boolean
}

// Book types
export interface Book {
  id: number
  title: string
  author: string | null
  isbn: string | null
  cover_url: string | null
  description: string | null
  publisher: string | null
  published_date: string | null
  page_count: number | null
  language: string | null
  created_at: string
  updated_at: string
}

// Blog post types
export interface BlogPost {
  id: number
  book_id: number
  user_id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

// Magazine types
export interface Magazine {
  id: number
  title: string
  category: string | null
  year: string | null
  month: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
  page_count: number | null
  created_at: string
}

// Ebook types
export interface Ebook {
  id: number
  title: string
  author: string | null
  category: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
  file_type: string | null
  file_size: number | null
  page_count: number | null
  created_at: string
}

// Audio types
export interface AudioSeries {
  id: number
  name: string
  folder_path: string
  cover_url: string | null
  audio_count?: number
}

export interface AudioFile {
  id: number
  series_id: number
  title: string
  file_path: string
  file_size: number | null
  file_type: string | null
  duration: number | null
}

// Lecture types
export interface LectureSeries {
  id: number
  name: string
  folder_path: string
  cover_url: string | null
  lecture_count?: number
}

export interface LectureFile {
  id: number
  series_id: number
  title: string
  file_path: string
  file_size: number | null
  file_type: string | null
  duration: number | null
}

// Speech types
export interface SpeechSeries {
  id: number
  name: string
  folder_path: string
  cover_url: string | null
  speech_count?: number
}

export interface SpeechFile {
  id: number
  series_id: number
  title: string
  file_path: string
  file_size: number | null
  file_type: string | null
  duration: number | null
}

// Movie types
export interface Movie {
  id: number
  title: string
  year: string | null
  genre: string | null
  director: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
  duration: number | null
}

// TV Show types
export interface TVShow {
  id: number
  title: string
  season: number | null
  episode: number | null
  genre: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
}

// Documentary types
export interface Documentary {
  id: number
  title: string
  year: string | null
  genre: string | null
  director: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
  duration: number | null
}

// Animation types
export interface Animation {
  id: number
  title: string
  year: string | null
  genre: string | null
  cover_url: string | null
  file_path: string | null
  r2_key: string | null
  duration: number | null
}

// NBA types
export interface NBAGame {
  id: number
  title: string
  team: string | null
  opponent: string | null
  date: string | null
  season: string | null
  file_path: string | null
  r2_key: string | null
}

// Thinking/Notes types
export interface Note {
  id: number
  user_id: number
  title: string
  content: string
  type: string | null
  created_at: string
  updated_at: string
}

// Underline types
export interface Underline {
  id: number
  book_id: number | null
  ebook_id: number | null
  magazine_id: number | null
  user_id: number
  text: string
  page_number: number | null
  position: string | null
  color: string | null
  created_at: string
}

// Idea types
export interface Idea {
  id: number
  underline_id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
}

// Reading history types
export interface ReadingHistory {
  id: number
  user_id: number
  book_id: number | null
  ebook_id: number | null
  magazine_id: number | null
  progress: number | null
  last_read_at: string
}

// JWT Payload
export interface JWTPayload {
  userId: number
  email: string
  is_admin: boolean
}

// Express Request with user
export interface AuthRequest extends Request {
  user?: JWTPayload
}

// Express middleware type
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
