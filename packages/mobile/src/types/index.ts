// Navigation types
export type TabParamList = {
  Shelf: undefined
  Ebook: undefined
  Magazine: undefined
  Thinking: undefined
  Me: undefined
}

export type RootStackParamList = {
  MainTabs: undefined
  Login: undefined
  Home: undefined
  BookDetail: { bookId: number }
  PostDetail: { postId: number; bookId: number }
  EbookDetail: { ebookId: number }
  EbookReader: { ebookId: number }
  MagazineDetail: { magazineId: number }
  MagazineReader: { magazineId: number }
  NoteDetail: { noteId: number }
}

// Auth types
export interface User {
  id: number
  email: string
  is_admin?: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// Notes/Thinking types
export interface Note {
  id: number
  title: string
  content_preview?: string
  year?: number
  created_at: string
  author?: string
  publish_date?: string
  tags?: string
  categories?: string
}

export interface NoteContent {
  id: number
  title: string
  content: string
  year?: number
  author?: string
  publish_date?: string
  tags?: string
  categories?: string
  underlines: NoteUnderline[]
  comments: NoteComment[]
}

export interface NoteUnderline {
  id: number
  note_id: number
  text: string
  paragraph_index: number
  start_offset: number
  end_offset: number
  created_at: string
}

export interface NoteIdea {
  id: number
  underline_id: number
  content: string
  created_at: string
}

export interface NoteComment {
  id: number
  note_id: number
  nick: string
  content: string
  original_date?: string
  created_at: string
}

export interface NoteYear {
  year: number
  count: number
}

// Data types
export interface Book {
  id: number
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  created_at: string
}

export interface Post {
  id: number
  book_id: number
  content: string
  page_number?: number
  created_at: string
  updated_at: string
  images?: PostImage[]
}

export interface PostImage {
  id: number
  post_id: number
  image_url: string
  created_at: string
}

export interface EbookCategory {
  id: number
  name: string
  ebook_count?: number
}

export interface Ebook {
  id: number
  title: string
  file_path: string
  file_type?: string
  file_size?: number
  cover_url?: string
  category_id?: number
  created_at: string
}

export interface EbookDetail {
  id: number
  title: string
  author?: string
  description?: string
  publisher?: string
  language?: string
  isbn?: string
  publishDate?: string
  pageCount?: number
  chapterCount?: number
  toc?: { title: string; href?: string; level?: number }[]
  coverUrl?: string
  externalCoverUrl?: string
  fileType?: string
  fileSize?: number
  categoryId?: number
  categoryName?: string
  metadataExtracted: boolean
  metadataExtractedAt?: string
  createdAt?: string
  // External API metadata (Google Books / Open Library)
  averageRating?: number
  ratingsCount?: number
  categories?: string
  subjects?: string[]
  googleBooksId?: string
  openLibraryKey?: string
  previewLink?: string
  infoLink?: string
  externalMetadataSource?: string
  externalMetadataFetchedAt?: string
}

export interface EbookContent {
  chapters: EbookChapter[]
}

export interface EbookChapter {
  title: string
  content: string
}

export interface Publisher {
  id: number
  name: string
  magazine_count?: number
}

export interface Magazine {
  id: number
  title: string
  publisher_id: number
  year?: number
  file_path: string
  cover_url?: string
  page_count?: number
  created_at: string
}

export interface MagazineDetail {
  id: number
  title: string
  publisherId: number
  publisherName: string
  year?: number
  fileSize?: number
  pageCount?: number
  coverUrl?: string
  author?: string
  description?: string
  pdfPublisher?: string
  language?: string
  publishDate?: string
  metadataExtracted?: number
  metadataExtractedAt?: string
  createdAt?: string
}

// Reading History types
export interface ReadingHistoryEntry {
  id: number
  user_id: number
  item_type: 'ebook' | 'magazine' | 'book'
  item_id: number
  title?: string
  cover_url?: string
  last_page?: number
  last_read_at: string
  created_at: string
}

export interface UpdateReadingHistoryRequest {
  itemType: 'ebook' | 'magazine' | 'book'
  itemId: number
  title?: string
  coverUrl?: string
  lastPage?: number
}

// ======================================
// Reading Session Types
// ======================================
export interface ReadingSession {
  id: number
  user_id: number
  book_id: number
  book_type: 'ebook' | 'magazine'
  start_time: string
  end_time?: string
  duration_minutes: number
  pages_read: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export interface StartSessionRequest {
  bookId: number
  bookType: 'ebook' | 'magazine'
  bookTitle?: string
}

export interface StartSessionResponse {
  sessionId: number
  startTime: string
}

export interface EndSessionRequest {
  pagesRead?: number
}

export interface TodayDurationResponse {
  duration: number
  formattedDuration: string
  sessionsCount: number
}

// ======================================
// Reading Goals Types
// ======================================
export interface ReadingGoal {
  id: number
  user_id: number
  daily_minutes: number
  weekly_books: number
  monthly_pages: number
  created_at: string
  updated_at: string
}

export interface DailyProgress {
  date: string
  minutes_read: number
  goal_minutes: number
  completed: boolean
  streak: number
}

// ======================================
// Badge Types
// ======================================
export type BadgeCategory =
  | 'first_steps'
  | 'bookworm'
  | 'speed_reader'
  | 'night_owl'
  | 'early_bird'
  | 'marathon'
  | 'consistent'
  | 'explorer'
  | 'collector'
  | 'social'
  | 'reviewer'
  | 'challenger'
  | 'seasonal'
  | 'milestone'
  | 'special'
  | 'secret'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Badge {
  id: number
  category: BadgeCategory
  tier: BadgeTier
  name: string
  description: string
  icon: string
  requirement_value: number
  requirement_description: string
  points: number
  is_secret: boolean
  created_at: string
}

export interface UserBadge {
  id: number
  user_id: number
  badge_id: number
  earned_at: string
  progress: number
  badge: Badge
}

export interface BadgeProgress {
  badge: Badge
  current_progress: number
  target_value: number
  percentage: number
  is_earned: boolean
  earned_at?: string
}

export interface CheckBadgesResponse {
  newBadges: UserBadge[]
  updatedProgress: BadgeProgress[]
}

// ======================================
// Reading Stats Types
// ======================================
export type StatsDimension = 'week' | 'month' | 'year' | 'total' | 'calendar'

export interface DateRange {
  start: string
  end: string
}

export interface DayDuration {
  date: string
  duration: number
  label: string
}

export interface WeekStats {
  range: DateRange
  totalMinutes: number
  totalBooks: number
  totalPages: number
  averageMinutesPerDay: number
  dailyDurations: DayDuration[]
  longestStreak: number
  currentStreak: number
}

export interface MonthStats {
  year: number
  month: number
  totalMinutes: number
  totalBooks: number
  totalPages: number
  averageMinutesPerDay: number
  dailyDurations: DayDuration[]
}

export interface YearStats {
  year: number
  totalMinutes: number
  totalBooks: number
  totalPages: number
  monthlyDurations: { month: number; duration: number; label: string }[]
  topCategories: { category: string; count: number }[]
}

export interface TotalStats {
  totalMinutes: number
  totalBooks: number
  totalPages: number
  memberSince: string
  longestStreak: number
  currentStreak: number
  favoriteCategory?: string
  averageMinutesPerDay: number
  milestones: ReadingMilestone[]
}

export interface ReadingMilestone {
  type: string
  value: number
  reachedAt: string
  description: string
}

export interface CalendarDay {
  date: string
  duration: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface CalendarStats {
  year: number
  month: number
  days: CalendarDay[]
  totalMinutes: number
  activeDays: number
}

// ======================================
// Book List Types
// ======================================
export type BookListCategory =
  | 'all'
  | 'literature'
  | 'history'
  | 'science'
  | 'philosophy'
  | 'art'
  | 'business'
  | 'technology'
  | 'lifestyle'
  | 'other'

export type BookListSortOption = 'latest' | 'popular' | 'most_followed' | 'most_books'

export interface BookListCreator {
  id: number
  username: string
  avatar?: string
}

export interface BookListBook {
  id: number
  title: string
  author?: string
  coverUrl?: string
  rating?: number
  bookType: 'ebook' | 'magazine'
}

export interface BookListItem {
  id: number
  list_id: number
  book_id: number
  book_type: 'ebook' | 'magazine'
  note?: string
  added_at: string
  book?: BookListBook
}

export interface BookList {
  id: number
  title: string
  description?: string
  cover_url?: string
  user_id: number
  is_public: boolean
  category?: BookListCategory
  tags?: string[]
  item_count: number
  follower_count: number
  is_following?: boolean
  creator?: BookListCreator
  preview_books?: BookListItem[]
  created_at: string
  updated_at: string
}

export interface CreateBookListRequest {
  title: string
  description?: string
  isPublic?: boolean
  category?: BookListCategory
  tags?: string[]
}

export interface AddBookToListRequest {
  bookId: number
  bookType: 'ebook' | 'magazine'
  note?: string
}

export interface BookListsResponse {
  lists: BookList[]
  total: number
  hasMore: boolean
}

// ======================================
// Reader Settings Types
// ======================================
export type ReaderFont = 'system' | 'serif' | 'sans-serif' | 'monospace'
export type ReaderTheme = 'light' | 'sepia' | 'green' | 'dark'
export type ReaderLineSpacing = 'compact' | 'normal' | 'relaxed' | 'loose'
export type ReaderMargin = 'small' | 'medium' | 'large'

export interface ReaderSettings {
  font: ReaderFont
  fontSize: number
  theme: ReaderTheme
  lineSpacing: ReaderLineSpacing
  margin: ReaderMargin
  brightness: number
  keepScreenOn: boolean
}

// ======================================
// Navigation Types Extension
// ======================================
export type ExtendedRootStackParamList = RootStackParamList & {
  DailyGoals: undefined
  Badges: undefined
  BadgeDetail: { badgeId: number }
  ReadingStats: undefined
  BookLists: undefined
  BookListDetail: { listId: number }
  CreateBookList: undefined
}
