/**
 * Drizzle ORM Schema for PostgreSQL
 * BookPost API Database Schema
 */

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  unique,
  bigint,
  date,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

// ============================================
// User & Authentication Tables
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').default(false),
  // Profile fields
  avatar: text('avatar'),
  gender: text('gender'), // male/female/unset
  // Reading statistics
  totalReadingDuration: integer('total_reading_duration').default(0), // 累计总阅读时长(秒)
  totalReadingDays: integer('total_reading_days').default(0), // 累计阅读天数
  currentStreakDays: integer('current_streak_days').default(0), // 当前连续阅读天数
  maxStreakDays: integer('max_streak_days').default(0), // 最长连续阅读天数
  lastReadingDate: date('last_reading_date'), // 最后阅读日期
  booksReadCount: integer('books_read_count').default(0), // 读过的书数量
  booksFinishedCount: integer('books_finished_count').default(0), // 读完的书数量
  createdAt: timestamp('created_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  token: text('token').notNull(),
  refreshToken: text('refresh_token'),
  refreshExpiresAt: timestamp('refresh_expires_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Books & Reading Tables
// ============================================

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
  author: text('author'),
  coverUrl: text('cover_url'),
  coverPhotoUrl: text('cover_photo_url'),
  isbn: text('isbn'),
  publisher: text('publisher'),
  publishYear: text('publish_year'),
  description: text('description'),
  pageCount: integer('page_count'),
  categories: text('categories'),
  language: text('language'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').references(() => books.id),
  title: text('title'),
  content: text('content'),
  pagePhotoUrl: text('page_photo_url'),
  pageNumber: integer('page_number'),
  extractedText: text('extracted_text'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
})

// ============================================
// Ebooks Tables
// ============================================

export const ebookCategories = pgTable('ebook_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ebooks = pgTable('ebooks', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => ebookCategories.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: bigint('file_size', { mode: 'number' }),
  fileType: text('file_type'),
  normalizedTitle: text('normalized_title'),
  coverUrl: text('cover_url'),
  s3Key: text('s3_key'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Magazines Tables
// ============================================

export const publishers = pgTable('publishers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const magazines = pgTable('magazines', {
  id: serial('id').primaryKey(),
  publisherId: integer('publisher_id').references(() => publishers.id),
  title: text('title').notNull(),
  filePath: text('file_path'),
  fileSize: bigint('file_size', { mode: 'number' }),
  year: integer('year'),
  pageCount: integer('page_count'),
  coverUrl: text('cover_url'),
  preprocessed: boolean('preprocessed').default(false),
  s3Key: text('s3_key'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Audio Tables
// ============================================

export const audioSeries = pgTable('audio_series', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  audioCount: integer('audio_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const audioFiles = pgTable('audio_files', {
  id: serial('id').primaryKey(),
  seriesId: integer('series_id').references(() => audioSeries.id),
  title: text('title').notNull(),
  s3Key: text('s3_key'),
  fileSize: bigint('file_size', { mode: 'number' }),
  duration: integer('duration'),
  fileType: text('file_type'),
  trackNumber: integer('track_number'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  seriesIdx: index('idx_audio_files_series').on(table.seriesId),
}))

// ============================================
// Notes Tables
// ============================================

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
  filePath: text('file_path'),
  year: integer('year'),
  contentPreview: text('content_preview'),
  author: text('author'),
  publishDate: text('publish_date'),
  tags: text('tags'),
  categories: text('categories'),
  slug: text('slug'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteComments = pgTable('note_comments', {
  id: serial('id').primaryKey(),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  nick: text('nick'),
  content: text('content'),
  originalDate: text('original_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteUnderlines = pgTable('note_underlines', {
  id: serial('id').primaryKey(),
  noteId: integer('note_id').references(() => notes.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  paragraphIndex: integer('paragraph_index'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const noteIdeas = pgTable('note_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => noteUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Underlines & Ideas (for blog posts)
// ============================================

export const underlines = pgTable('underlines', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => blogPosts.id),
  text: text('text'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ideas = pgTable('ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => underlines.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Ebook Underlines & Ideas
// ============================================

export const ebookUnderlines = pgTable('ebook_underlines', {
  id: serial('id').primaryKey(),
  ebookId: integer('ebook_id').references(() => ebooks.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  paragraph: integer('paragraph'),
  chapterIndex: integer('chapter_index'),
  paragraphIndex: integer('paragraph_index'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  cfiRange: text('cfi_range'),
  ideaCount: integer('idea_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const ebookIdeas = pgTable('ebook_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => ebookUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Magazine Underlines & Ideas
// ============================================

export const magazineUnderlines = pgTable('magazine_underlines', {
  id: serial('id').primaryKey(),
  magazineId: integer('magazine_id').references(() => magazines.id),
  userId: integer('user_id').references(() => users.id),
  text: text('text'),
  pageNumber: integer('page_number'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const magazineIdeas = pgTable('magazine_ideas', {
  id: serial('id').primaryKey(),
  underlineId: integer('underline_id').references(() => magazineUnderlines.id),
  userId: integer('user_id').references(() => users.id),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// Reading History
// ============================================

export const readingHistory = pgTable('reading_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  itemType: text('item_type').notNull(), // 'ebook', 'magazine', 'book'
  itemId: integer('item_id').notNull(),
  title: text('title'),
  coverUrl: text('cover_url'),
  lastPage: integer('last_page'),
  lastReadAt: timestamp('last_read_at'),
  // Extended fields for reading duration
  progress: decimal('progress', { precision: 5, scale: 4 }).default('0'), // 阅读进度 0.0000 - 1.0000
  lastPosition: text('last_position'), // 精确位置 (CFI for EPUB, page for PDF)
  chapterIndex: integer('chapter_index'), // 当前章节索引
  totalDurationSeconds: integer('total_duration_seconds').default(0), // 该书累计阅读时长(秒)
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueUserItem: unique().on(table.userId, table.itemType, table.itemId),
}))

// ============================================
// Reading Sessions (阅读会话记录)
// ============================================

export const readingSessions = pgTable('reading_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bookId: integer('book_id').notNull(),
  bookType: text('book_type').notNull(), // ebook/magazine/audiobook
  // Session info
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationSeconds: integer('duration_seconds').default(0),
  // Reading position
  startPosition: text('start_position'),
  endPosition: text('end_position'),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  pagesRead: integer('pages_read').default(0),
  // Device info
  deviceType: text('device_type'), // ios/android/web
  deviceId: text('device_id'),
  // Status
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTimeIdx: index('idx_reading_sessions_user_time').on(table.userId, table.startTime),
  bookIdx: index('idx_reading_sessions_book').on(table.bookId, table.bookType),
}))

// ============================================
// Daily Reading Stats (每日阅读统计)
// ============================================

export const dailyReadingStats = pgTable('daily_reading_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: date('date').notNull(),
  // Duration stats
  totalDurationSeconds: integer('total_duration_seconds').default(0),
  // Reading content stats
  booksRead: integer('books_read').default(0),
  booksFinished: integer('books_finished').default(0),
  pagesRead: integer('pages_read').default(0),
  notesCreated: integer('notes_created').default(0),
  highlightsCreated: integer('highlights_created').default(0),
  // Category stats (JSON)
  categoryDurations: jsonb('category_durations').default('{}'),
  bookDurations: jsonb('book_durations').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_daily_stats_user_date').on(table.userId, table.date),
  userDateUnique: unique().on(table.userId, table.date),
}))

// ============================================
// Weekly Leaderboard (周排行榜)
// ============================================

export const weeklyLeaderboard = pgTable('weekly_leaderboard', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  weekStart: date('week_start').notNull(),
  weekEnd: date('week_end').notNull(),
  // Ranking data
  totalDurationSeconds: integer('total_duration_seconds').default(0),
  rank: integer('rank'),
  rankChange: integer('rank_change').default(0),
  // Stats
  readingDays: integer('reading_days').default(0),
  booksRead: integer('books_read').default(0),
  // Interaction
  likesReceived: integer('likes_received').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  weekIdx: index('idx_weekly_lb_week').on(table.weekStart, table.rank),
  userWeekUnique: unique().on(table.userId, table.weekStart),
}))

// ============================================
// Leaderboard Likes (排行榜点赞)
// ============================================

export const leaderboardLikes = pgTable('leaderboard_likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(), // 点赞者
  targetUserId: integer('target_user_id').references(() => users.id).notNull(), // 被点赞者
  weekStart: date('week_start').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTargetWeekUnique: unique().on(table.userId, table.targetUserId, table.weekStart),
}))

// ============================================
// Reading Milestones (阅读里程碑)
// ============================================

export const readingMilestones = pgTable('reading_milestones', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  milestoneType: text('milestone_type').notNull(), // started_book/finished_book/streak_days/total_days/total_hours/books_finished
  milestoneValue: integer('milestone_value'),
  // Related content
  bookId: integer('book_id'),
  bookType: text('book_type'),
  bookTitle: text('book_title'),
  // Description
  title: text('title').notNull(),
  description: text('description'),
  achievedAt: timestamp('achieved_at').defaultNow(),
}, (table) => ({
  userTypeValueUnique: unique().on(table.userId, table.milestoneType, table.milestoneValue),
}))

// ============================================
// Badges (勋章定义)
// ============================================

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  // Basic info
  category: text('category').notNull(), // reading_streak/reading_duration/reading_days/books_finished/weekly_challenge/monthly_challenge
  level: integer('level').default(1),
  name: text('name').notNull(),
  description: text('description'),
  requirement: text('requirement'),
  // Condition
  conditionType: text('condition_type').notNull(), // streak_days/total_hours/total_days/books_finished/weekly_perfect/monthly_perfect
  conditionValue: integer('condition_value').notNull(),
  // Display
  iconUrl: text('icon_url'),
  backgroundColor: text('background_color'),
  // Stats
  earnedCount: integer('earned_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// User Badges (用户勋章)
// ============================================

export const userBadges = pgTable('user_badges', {
  userId: integer('user_id').references(() => users.id).notNull(),
  badgeId: integer('badge_id').references(() => badges.id).notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
}, (table) => ({
  pk: unique().on(table.userId, table.badgeId),
}))

// ============================================
// Reading Challenges (阅读挑战)
// ============================================

export const readingChallenges = pgTable('reading_challenges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  // Challenge type
  challengeType: text('challenge_type').notNull(), // weekly/monthly/custom
  // Target
  targetType: text('target_type').notNull(), // duration/books/days
  targetValue: integer('target_value').notNull(),
  // Time range
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  // Reward
  badgeId: integer('badge_id').references(() => badges.id),
  rewardDescription: text('reward_description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ============================================
// User Challenge Progress (用户挑战进度)
// ============================================

export const userChallengeProgress = pgTable('user_challenge_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  challengeId: integer('challenge_id').references(() => readingChallenges.id).notNull(),
  currentValue: integer('current_value').default(0),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userChallengeUnique: unique().on(table.userId, table.challengeId),
}))

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Book = typeof books.$inferSelect
export type Ebook = typeof ebooks.$inferSelect
export type Magazine = typeof magazines.$inferSelect
export type Note = typeof notes.$inferSelect
export type ReadingHistoryEntry = typeof readingHistory.$inferSelect
export type ReadingSession = typeof readingSessions.$inferSelect
export type NewReadingSession = typeof readingSessions.$inferInsert
export type DailyReadingStat = typeof dailyReadingStats.$inferSelect
export type WeeklyLeaderboardEntry = typeof weeklyLeaderboard.$inferSelect
export type ReadingMilestone = typeof readingMilestones.$inferSelect
export type Badge = typeof badges.$inferSelect
export type UserBadge = typeof userBadges.$inferSelect
export type ReadingChallenge = typeof readingChallenges.$inferSelect
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect
export type AudioSeries = typeof audioSeries.$inferSelect
export type NewAudioSeries = typeof audioSeries.$inferInsert
export type AudioFile = typeof audioFiles.$inferSelect
export type NewAudioFile = typeof audioFiles.$inferInsert
