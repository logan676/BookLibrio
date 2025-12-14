/**
 * Ranking Computation Service
 *
 * Handles scheduled computation of various book rankings including:
 * - Trending (based on recent reading activity)
 * - Hot Search (based on search volume)
 * - New Books (recent releases)
 * - Category-specific rankings (fiction, non-fiction, etc.)
 * - Top 200 (all-time favorites)
 * - Masterpiece/Potential Masterpiece (high ratings)
 */

import { db } from '../db'
import {
  rankings,
  rankingItems,
  ebooks,
  bookStats,
  readingSessions,
  dailyReadingStats,
  weeklyLeaderboard,
  ebookCategories,
  type Ranking,
  type NewRanking,
  type RankingItem,
  type NewRankingItem,
} from '../db/schema'
import { eq, sql, desc, gte, lte, and, count, sum, avg } from 'drizzle-orm'

// Ranking type definitions
type RankingType =
  | 'trending'
  | 'hot_search'
  | 'new_books'
  | 'fiction'
  | 'non_fiction'
  | 'film_tv'
  | 'audiobook'
  | 'top_200'
  | 'masterpiece'
  | 'potential_masterpiece'

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time'

interface RankingConfig {
  type: RankingType
  displayName: string
  themeColor: string
  description: string
  periodType: PeriodType
  limit: number
}

// Ranking configurations
const RANKING_CONFIGS: RankingConfig[] = [
  {
    type: 'trending',
    displayName: 'Rising Stars',
    themeColor: '#FF6B6B',
    description: 'Books with the fastest growing readership',
    periodType: 'weekly',
    limit: 100,
  },
  {
    type: 'hot_search',
    displayName: 'Hot Searches',
    themeColor: '#FFB347',
    description: 'Most searched books right now',
    periodType: 'daily',
    limit: 50,
  },
  {
    type: 'new_books',
    displayName: 'New Releases',
    themeColor: '#77DD77',
    description: 'Popular newly added books',
    periodType: 'monthly',
    limit: 50,
  },
  {
    type: 'fiction',
    displayName: 'Fiction',
    themeColor: '#AEC6CF',
    description: 'Most popular fiction works',
    periodType: 'weekly',
    limit: 100,
  },
  {
    type: 'non_fiction',
    displayName: 'Non-Fiction',
    themeColor: '#FFDAB9',
    description: 'Most popular non-fiction works',
    periodType: 'weekly',
    limit: 100,
  },
  {
    type: 'film_tv',
    displayName: 'Screen Adaptations',
    themeColor: '#DDA0DD',
    description: 'Books adapted into movies and TV shows',
    periodType: 'weekly',
    limit: 50,
  },
  {
    type: 'audiobook',
    displayName: 'Audiobooks',
    themeColor: '#87CEEB',
    description: 'Most popular audiobooks',
    periodType: 'weekly',
    limit: 50,
  },
  {
    type: 'top_200',
    displayName: 'Top 200',
    themeColor: '#FFD700',
    description: 'The 200 highest rated books of all time',
    periodType: 'all_time',
    limit: 200,
  },
  {
    type: 'masterpiece',
    displayName: 'Masterpieces',
    themeColor: '#E6E6FA',
    description: 'Timeless classics rated 9.5 and above',
    periodType: 'all_time',
    limit: 50,
  },
  {
    type: 'potential_masterpiece',
    displayName: 'Hidden Gems',
    themeColor: '#98FB98',
    description: 'Highly rated books waiting to be discovered',
    periodType: 'monthly',
    limit: 30,
  },
]

interface BookScore {
  ebookId: number
  score: number
  readerCount: number
  rating: number | null
  title: string
  author: string | null
  coverUrl: string | null
}

interface ComputeResult {
  rankingId: number
  itemCount: number
  computedAt: Date
}

class RankingService {

  /**
   * Get all ranking configurations
   */
  getRankingConfigs(): RankingConfig[] {
    return RANKING_CONFIGS
  }

  /**
   * Get active rankings
   */
  async getActiveRankings(): Promise<Ranking[]> {
    const now = new Date()
    return db.select()
      .from(rankings)
      .where(
        and(
          eq(rankings.isActive, true),
          gte(rankings.expiresAt, now)
        )
      )
      .orderBy(rankings.rankingType)
  }

  /**
   * Get ranking items for a specific ranking
   */
  async getRankingItems(rankingId: number, limit = 50, offset = 0): Promise<RankingItem[]> {
    return db.select()
      .from(rankingItems)
      .where(eq(rankingItems.rankingId, rankingId))
      .orderBy(rankingItems.rank)
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get latest ranking by type
   */
  async getLatestRanking(type: RankingType): Promise<Ranking | null> {
    const result = await db.select()
      .from(rankings)
      .where(
        and(
          eq(rankings.rankingType, type),
          eq(rankings.isActive, true)
        )
      )
      .orderBy(desc(rankings.computedAt))
      .limit(1)

    return result[0] || null
  }

  /**
   * Compute all rankings
   * This should be called by a scheduled job (e.g., cron)
   */
  async computeAllRankings(): Promise<ComputeResult[]> {
    const results: ComputeResult[] = []

    for (const config of RANKING_CONFIGS) {
      try {
        const result = await this.computeRanking(config)
        results.push(result)
      } catch (error) {
        console.error(`Failed to compute ranking: ${config.type}`, error)
      }
    }

    // Update trending scores on ebooks table
    await this.updateEbookTrendingScores()

    return results
  }

  /**
   * Compute a specific ranking
   */
  async computeRanking(config: RankingConfig): Promise<ComputeResult> {
    const now = new Date()
    const { periodStart, periodEnd, expiresAt } = this.getPeriodDates(config.periodType, now)

    // Deactivate previous rankings of this type
    await db.update(rankings)
      .set({ isActive: false })
      .where(eq(rankings.rankingType, config.type))

    // Create new ranking
    const [newRanking] = await db.insert(rankings)
      .values({
        rankingType: config.type,
        periodType: config.periodType,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        displayName: config.displayName,
        themeColor: config.themeColor,
        description: config.description,
        isActive: true,
        computedAt: now,
        expiresAt,
      })
      .returning()

    // Compute scores based on ranking type
    const scores = await this.computeScores(config, periodStart, periodEnd)

    // Sort by score and assign ranks
    scores.sort((a, b) => b.score - a.score)
    const limitedScores = scores.slice(0, config.limit)

    // Get previous ranking for rank change calculation
    const previousItems = await this.getPreviousRankingItems(config.type)
    const previousRankMap = new Map(
      previousItems.map(item => [item.bookId, item.rank])
    )

    // Insert ranking items
    const rankingItemsToInsert: NewRankingItem[] = limitedScores.map((bookScore, index) => {
      const rank = index + 1
      const previousRank = previousRankMap.get(bookScore.ebookId) ?? null
      const rankChange = previousRank ? previousRank - rank : 0

      return {
        rankingId: newRanking.id,
        bookType: 'ebook',
        bookId: bookScore.ebookId,
        rank,
        previousRank,
        rankChange,
        score: String(bookScore.score),
        bookTitle: bookScore.title,
        bookAuthor: bookScore.author,
        bookCoverUrl: bookScore.coverUrl,
        readerCount: bookScore.readerCount,
        rating: bookScore.rating ? String(bookScore.rating) : null,
        evaluationTag: this.getEvaluationTag(bookScore.rating),
      }
    })

    if (rankingItemsToInsert.length > 0) {
      await db.insert(rankingItems).values(rankingItemsToInsert)
    }

    return {
      rankingId: newRanking.id,
      itemCount: rankingItemsToInsert.length,
      computedAt: now,
    }
  }

  /**
   * Compute scores based on ranking type
   */
  private async computeScores(
    config: RankingConfig,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BookScore[]> {
    switch (config.type) {
      case 'trending':
        return this.computeTrendingScores(periodStart, periodEnd)
      case 'hot_search':
        return this.computeHotSearchScores()
      case 'new_books':
        return this.computeNewBookScores(periodStart)
      case 'fiction':
        return this.computeCategoryScores('fiction', periodStart, periodEnd)
      case 'non_fiction':
        return this.computeCategoryScores('non_fiction', periodStart, periodEnd)
      case 'film_tv':
        return this.computeFilmTVScores(periodStart, periodEnd)
      case 'audiobook':
        return this.computeAudiobookScores(periodStart, periodEnd)
      case 'top_200':
        return this.computeTop200Scores()
      case 'masterpiece':
        return this.computeMasterpieceScores()
      case 'potential_masterpiece':
        return this.computePotentialMasterpieceScores()
      default:
        return []
    }
  }

  /**
   * Compute trending scores based on reading activity growth
   */
  private async computeTrendingScores(periodStart: Date, periodEnd: Date): Promise<BookScore[]> {
    // Get reading sessions in the period
    const readingData = await db.select({
      bookId: readingSessions.bookId,
      sessionCount: count(readingSessions.id),
      totalDuration: sum(readingSessions.durationSeconds),
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.bookType, 'ebook'),
        gte(readingSessions.startTime, periodStart),
        lte(readingSessions.startTime, periodEnd)
      )
    )
    .groupBy(readingSessions.bookId)

    // Join with book data and stats
    const scores: BookScore[] = []

    for (const data of readingData) {
      const [ebook] = await db.select()
        .from(ebooks)
        .where(eq(ebooks.id, data.bookId))
        .limit(1)

      if (!ebook) continue

      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, data.bookId)
          )
        )
        .limit(1)

      // Trending score = session growth * duration weight * recency boost
      const sessionCount = Number(data.sessionCount) || 0
      const totalDuration = Number(data.totalDuration) || 0
      const durationWeight = Math.log10(totalDuration + 1)

      const score = sessionCount * durationWeight * 10

      scores.push({
        ebookId: data.bookId,
        score,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute hot search scores based on searchCount
   */
  private async computeHotSearchScores(): Promise<BookScore[]> {
    const results = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      searchCount: ebooks.searchCount,
    })
    .from(ebooks)
    .where(gte(ebooks.searchCount, 1))
    .orderBy(desc(ebooks.searchCount))
    .limit(200)

    const scores: BookScore[] = []

    for (const ebook of results) {
      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, ebook.id)
          )
        )
        .limit(1)

      scores.push({
        ebookId: ebook.id,
        score: ebook.searchCount || 0,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute new book scores (recently added books with good engagement)
   */
  private async computeNewBookScores(periodStart: Date): Promise<BookScore[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const results = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      viewCount: ebooks.viewCount,
      createdAt: ebooks.createdAt,
    })
    .from(ebooks)
    .where(gte(ebooks.createdAt, thirtyDaysAgo))
    .orderBy(desc(ebooks.viewCount))
    .limit(200)

    const scores: BookScore[] = []

    for (const ebook of results) {
      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, ebook.id)
          )
        )
        .limit(1)

      // Score based on views and reader engagement
      const viewScore = (ebook.viewCount || 0) * 0.5
      const readerScore = (stats?.totalReaders || 0) * 2
      const ratingBoost = stats?.averageRating ? Number(stats.averageRating) * 10 : 0

      const score = viewScore + readerScore + ratingBoost

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute category-specific scores
   */
  private async computeCategoryScores(
    categoryName: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BookScore[]> {
    // Find category ID
    const [category] = await db.select()
      .from(ebookCategories)
      .where(eq(ebookCategories.name, categoryName))
      .limit(1)

    if (!category) return []

    const results = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      viewCount: ebooks.viewCount,
    })
    .from(ebooks)
    .where(eq(ebooks.categoryId, category.id))
    .orderBy(desc(ebooks.viewCount))
    .limit(200)

    const scores: BookScore[] = []

    for (const ebook of results) {
      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, ebook.id)
          )
        )
        .limit(1)

      // Composite score from popularity and rating
      const popularityScore = (stats?.popularityScore ? Number(stats.popularityScore) : 0) * 100
      const readerScore = (stats?.totalReaders || 0) * 0.5
      const ratingScore = stats?.averageRating ? Number(stats.averageRating) * 20 : 0

      const score = popularityScore + readerScore + ratingScore

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute film/TV adaptation scores
   */
  private async computeFilmTVScores(periodStart: Date, periodEnd: Date): Promise<BookScore[]> {
    const results = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      viewCount: ebooks.viewCount,
    })
    .from(ebooks)
    .where(eq(ebooks.isFilmAdaptation, true))
    .orderBy(desc(ebooks.viewCount))
    .limit(200)

    const scores: BookScore[] = []

    for (const ebook of results) {
      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, ebook.id)
          )
        )
        .limit(1)

      const score = (ebook.viewCount || 0) + (stats?.totalReaders || 0) * 2

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute audiobook scores
   */
  private async computeAudiobookScores(periodStart: Date, periodEnd: Date): Promise<BookScore[]> {
    const results = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      author: ebooks.author,
      coverUrl: ebooks.coverUrl,
      viewCount: ebooks.viewCount,
    })
    .from(ebooks)
    .where(eq(ebooks.hasAudiobook, true))
    .orderBy(desc(ebooks.viewCount))
    .limit(200)

    const scores: BookScore[] = []

    for (const ebook of results) {
      const [stats] = await db.select()
        .from(bookStats)
        .where(
          and(
            eq(bookStats.bookType, 'ebook'),
            eq(bookStats.bookId, ebook.id)
          )
        )
        .limit(1)

      const score = (ebook.viewCount || 0) + (stats?.totalReaders || 0) * 2

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stats?.totalReaders || 0,
        rating: stats?.averageRating ? Number(stats.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute Top 200 scores (all-time best)
   */
  private async computeTop200Scores(): Promise<BookScore[]> {
    // Get all books with stats, sorted by popularity
    const stats = await db.select()
      .from(bookStats)
      .where(eq(bookStats.bookType, 'ebook'))
      .orderBy(desc(bookStats.popularityScore))
      .limit(500)

    const scores: BookScore[] = []

    for (const stat of stats) {
      const [ebook] = await db.select()
        .from(ebooks)
        .where(eq(ebooks.id, stat.bookId))
        .limit(1)

      if (!ebook) continue

      // Composite score: popularity * rating weight
      const popularityScore = Number(stat.popularityScore || 0)
      const ratingWeight = stat.averageRating ? Number(stat.averageRating) / 5 : 0.5
      const readerBonus = Math.log10((stat.totalReaders || 0) + 1) * 10

      const score = popularityScore * ratingWeight * 100 + readerBonus

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stat.totalReaders || 0,
        rating: stat.averageRating ? Number(stat.averageRating) : null,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute masterpiece scores (rating >= 9.5)
   */
  private async computeMasterpieceScores(): Promise<BookScore[]> {
    const stats = await db.select()
      .from(bookStats)
      .where(
        and(
          eq(bookStats.bookType, 'ebook'),
          gte(bookStats.averageRating, '9.5'),
          gte(bookStats.ratingCount, 100) // Minimum ratings for credibility
        )
      )
      .orderBy(desc(bookStats.averageRating))
      .limit(100)

    const scores: BookScore[] = []

    for (const stat of stats) {
      const [ebook] = await db.select()
        .from(ebooks)
        .where(eq(ebooks.id, stat.bookId))
        .limit(1)

      if (!ebook) continue

      // Score primarily by rating, with reader count as tiebreaker
      const rating = Number(stat.averageRating || 0)
      const readerBonus = Math.log10((stat.totalReaders || 0) + 1)

      const score = rating * 100 + readerBonus

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stat.totalReaders || 0,
        rating,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Compute potential masterpiece scores (high rating but fewer readers)
   */
  private async computePotentialMasterpieceScores(): Promise<BookScore[]> {
    const stats = await db.select()
      .from(bookStats)
      .where(
        and(
          eq(bookStats.bookType, 'ebook'),
          gte(bookStats.averageRating, '9.0'),
          lte(bookStats.totalReaders, 1000), // Not yet mainstream
          gte(bookStats.ratingCount, 10) // Minimum ratings
        )
      )
      .orderBy(desc(bookStats.averageRating))
      .limit(100)

    const scores: BookScore[] = []

    for (const stat of stats) {
      const [ebook] = await db.select()
        .from(ebooks)
        .where(eq(ebooks.id, stat.bookId))
        .limit(1)

      if (!ebook) continue

      // Score by rating with bonus for recent activity
      const rating = Number(stat.averageRating || 0)
      const freshness = ebook.createdAt
        ? Math.max(0, 1 - (Date.now() - new Date(ebook.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000))
        : 0

      const score = rating * 100 + freshness * 20

      scores.push({
        ebookId: ebook.id,
        score,
        readerCount: stat.totalReaders || 0,
        rating,
        title: ebook.title,
        author: ebook.author,
        coverUrl: ebook.coverUrl,
      })
    }

    return scores
  }

  /**
   * Get previous ranking items for rank change calculation
   */
  private async getPreviousRankingItems(type: RankingType): Promise<{ bookId: number; rank: number }[]> {
    const [previousRanking] = await db.select()
      .from(rankings)
      .where(eq(rankings.rankingType, type))
      .orderBy(desc(rankings.computedAt))
      .limit(1)

    if (!previousRanking) return []

    const items = await db.select({
      bookId: rankingItems.bookId,
      rank: rankingItems.rank,
    })
    .from(rankingItems)
    .where(eq(rankingItems.rankingId, previousRanking.id))

    return items
  }

  /**
   * Get evaluation tag based on rating
   */
  private getEvaluationTag(rating: number | null): string | null {
    if (!rating) return null
    if (rating >= 9.5) return 'masterpiece'
    if (rating >= 9.0) return 'highly_praised'
    if (rating >= 8.0) return 'worth_reading'
    return null
  }

  /**
   * Get period dates based on period type
   */
  private getPeriodDates(periodType: PeriodType, now: Date): {
    periodStart: Date
    periodEnd: Date
    expiresAt: Date
  } {
    const periodStart = new Date(now)
    const periodEnd = new Date(now)
    const expiresAt = new Date(now)

    switch (periodType) {
      case 'daily':
        periodStart.setHours(0, 0, 0, 0)
        periodEnd.setHours(23, 59, 59, 999)
        expiresAt.setDate(expiresAt.getDate() + 1)
        break
      case 'weekly':
        // Start from Monday
        const dayOfWeek = periodStart.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        periodStart.setDate(periodStart.getDate() + diffToMonday)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd.setDate(periodStart.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
        expiresAt.setDate(periodEnd.getDate() + 1)
        break
      case 'monthly':
        periodStart.setDate(1)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        periodEnd.setDate(0) // Last day of current month
        periodEnd.setHours(23, 59, 59, 999)
        expiresAt.setMonth(expiresAt.getMonth() + 1)
        expiresAt.setDate(1)
        break
      case 'all_time':
        periodStart.setFullYear(2020, 0, 1)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd.setHours(23, 59, 59, 999)
        expiresAt.setDate(expiresAt.getDate() + 7) // Refresh weekly
        break
    }

    return { periodStart, periodEnd, expiresAt }
  }

  /**
   * Update trending scores on ebooks table
   */
  async updateEbookTrendingScores(): Promise<void> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get reading activity per book in last week
    const readingActivity = await db.select({
      bookId: readingSessions.bookId,
      sessionCount: count(readingSessions.id),
      totalDuration: sum(readingSessions.durationSeconds),
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.bookType, 'ebook'),
        gte(readingSessions.startTime, weekAgo)
      )
    )
    .groupBy(readingSessions.bookId)

    // Update trending scores
    for (const activity of readingActivity) {
      const sessionCount = Number(activity.sessionCount) || 0
      const totalDuration = Number(activity.totalDuration) || 0

      // Trending score formula: log(sessions) * log(duration) * recency_factor
      const trendingScore = Math.log10(sessionCount + 1) * Math.log10(totalDuration + 1) * 100

      await db.update(ebooks)
        .set({
          trendingScore: String(trendingScore),
          updatedAt: new Date(),
        })
        .where(eq(ebooks.id, activity.bookId))
    }
  }

  /**
   * Compute and update weekly leaderboard
   */
  async computeWeeklyLeaderboard(): Promise<void> {
    const now = new Date()

    // Get current week's Monday and Sunday
    const dayOfWeek = now.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() + diffToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    // Get user reading durations for the week
    const userDurations = await db.select({
      userId: readingSessions.userId,
      totalDuration: sum(readingSessions.durationSeconds),
      sessionCount: count(readingSessions.id),
    })
    .from(readingSessions)
    .where(
      and(
        gte(readingSessions.startTime, weekStart),
        lte(readingSessions.startTime, weekEnd)
      )
    )
    .groupBy(readingSessions.userId)

    // Get distinct reading days per user
    const userReadingDays = await db.select({
      userId: dailyReadingStats.userId,
      readingDays: count(dailyReadingStats.id),
    })
    .from(dailyReadingStats)
    .where(
      and(
        gte(dailyReadingStats.date, weekStart.toISOString().split('T')[0]),
        lte(dailyReadingStats.date, weekEnd.toISOString().split('T')[0])
      )
    )
    .groupBy(dailyReadingStats.userId)

    // Combine data and sort by duration
    const leaderboardData = userDurations.map(ud => {
      const readingDaysEntry = userReadingDays.find(rd => rd.userId === ud.userId)
      return {
        userId: ud.userId,
        totalDuration: Number(ud.totalDuration) || 0,
        readingDays: Number(readingDaysEntry?.readingDays) || 0,
      }
    })

    leaderboardData.sort((a, b) => b.totalDuration - a.totalDuration)

    // Get previous week's leaderboard for rank change
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    const previousLeaderboard = await db.select()
      .from(weeklyLeaderboard)
      .where(eq(weeklyLeaderboard.weekStart, prevWeekStart.toISOString().split('T')[0]))

    const prevRankMap = new Map(
      previousLeaderboard.map(entry => [entry.userId, entry.rank])
    )

    // Insert/update leaderboard entries
    for (let i = 0; i < leaderboardData.length; i++) {
      const data = leaderboardData[i]
      const rank = i + 1
      const prevRank = prevRankMap.get(data.userId) ?? null
      const rankChange = prevRank ? prevRank - rank : 0

      await db.insert(weeklyLeaderboard)
        .values({
          userId: data.userId,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          totalDurationSeconds: data.totalDuration,
          rank,
          rankChange,
          readingDays: data.readingDays,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [weeklyLeaderboard.userId, weeklyLeaderboard.weekStart],
          set: {
            totalDurationSeconds: data.totalDuration,
            rank,
            rankChange,
            readingDays: data.readingDays,
            updatedAt: now,
          },
        })
    }
  }

  /**
   * Update book stats aggregates
   */
  async updateBookStats(bookType: string, bookId: number): Promise<void> {
    // Count readers
    const readerCounts = await db.select({
      total: count(),
      current: sql<number>`SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END)`,
      finished: sql<number>`SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END)`,
    })
    .from(db.schema.userBookshelves)
    .where(
      and(
        eq(db.schema.userBookshelves.bookType, bookType),
        eq(db.schema.userBookshelves.bookId, bookId)
      )
    )

    const counts = readerCounts[0]

    await db.insert(bookStats)
      .values({
        bookType,
        bookId,
        totalReaders: counts?.total || 0,
        currentReaders: counts?.current || 0,
        finishedReaders: counts?.finished || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bookStats.bookType, bookStats.bookId],
        set: {
          totalReaders: counts?.total || 0,
          currentReaders: counts?.current || 0,
          finishedReaders: counts?.finished || 0,
          updatedAt: new Date(),
        },
      })
  }
}

export const rankingService = new RankingService()
