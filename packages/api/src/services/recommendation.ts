/**
 * Recommendation Engine Service
 *
 * Implements rule-based book recommendations with personalized reasons including:
 * - For You (based on reading history and preferences)
 * - Similar to Reading (based on current/recent books)
 * - Popular in Category (category-based trending)
 * - Friends Reading (social recommendations)
 * - New Releases (personalized new book suggestions)
 */

import { db } from '../db'
import {
  userRecommendations,
  ebooks,
  ebookCategories,
  readingHistory,
  userBookshelves,
  bookStats,
  relatedBooks,
  userFollowing,
  type UserRecommendation,
  type NewUserRecommendation,
  type Ebook,
} from '../db/schema'
import { eq, sql, desc, gte, lte, and, ne, inArray, notInArray, count } from 'drizzle-orm'

// Recommendation types
type RecommendationType =
  | 'for_you'
  | 'similar_to_reading'
  | 'popular_in_category'
  | 'friends_reading'
  | 'new_release'

type ReasonType =
  | 'similar_book'
  | 'same_author'
  | 'same_category'
  | 'friend_activity'
  | 'trending'
  | 'new_in_category'
  | 'high_rating'
  | 'reading_pattern'

interface RecommendationContext {
  userId: number
  readBooks: number[]
  currentlyReading: number[]
  preferredCategories: number[]
  favoriteAuthors: string[]
  followingUserIds: number[]
}

interface RecommendationCandidate {
  ebookId: number
  score: number
  reasonType: ReasonType
  reason: string
  sourceBookId?: number
  sourceBookType?: string
}

interface GenerateOptions {
  limit?: number
  excludeRead?: boolean
  minRating?: number
}

class RecommendationService {

  /**
   * Generate all recommendations for a user
   */
  async generateUserRecommendations(
    userId: number,
    options: GenerateOptions = {}
  ): Promise<UserRecommendation[]> {
    const { limit = 50, excludeRead = true, minRating = 7.0 } = options

    // Build user context
    const context = await this.buildUserContext(userId)

    // Clear old recommendations
    await this.clearExpiredRecommendations(userId)

    // Generate recommendations from each source
    const allCandidates: RecommendationCandidate[] = []

    // 1. Similar to what user is reading
    const similarCandidates = await this.generateSimilarToReading(context, minRating)
    allCandidates.push(...similarCandidates)

    // 2. Popular in user's preferred categories
    const categoryCandidates = await this.generatePopularInCategory(context, minRating)
    allCandidates.push(...categoryCandidates)

    // 3. Same author recommendations
    const authorCandidates = await this.generateSameAuthor(context)
    allCandidates.push(...authorCandidates)

    // 4. Friends reading
    const friendsCandidates = await this.generateFriendsReading(context)
    allCandidates.push(...friendsCandidates)

    // 5. Trending/New releases
    const trendingCandidates = await this.generateTrending(context, minRating)
    allCandidates.push(...trendingCandidates)

    // 6. High-rated books in general
    const highRatedCandidates = await this.generateHighRated(context)
    allCandidates.push(...highRatedCandidates)

    // Filter already read books if requested
    let filteredCandidates = allCandidates
    if (excludeRead) {
      const allUserBooks = new Set([...context.readBooks, ...context.currentlyReading])
      filteredCandidates = allCandidates.filter(c => !allUserBooks.has(c.ebookId))
    }

    // Deduplicate (keep highest scoring version of each book)
    const deduped = this.deduplicateCandidates(filteredCandidates)

    // Sort by score and take top N
    deduped.sort((a, b) => b.score - a.score)
    const topCandidates = deduped.slice(0, limit)

    // Insert recommendations
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 7) // Expire in 7 days

    const recommendationsToInsert: NewUserRecommendation[] = topCandidates.map((candidate, index) => ({
      userId,
      bookType: 'ebook',
      bookId: candidate.ebookId,
      recommendationType: this.getRecommendationType(candidate.reasonType),
      reason: candidate.reason,
      reasonType: candidate.reasonType,
      sourceBookType: candidate.sourceBookType || null,
      sourceBookId: candidate.sourceBookId || null,
      relevanceScore: String(candidate.score),
      position: index,
      isViewed: false,
      isClicked: false,
      isDismissed: false,
      createdAt: now,
      expiresAt,
    }))

    if (recommendationsToInsert.length > 0) {
      await db.insert(userRecommendations).values(recommendationsToInsert)
    }

    return db.select()
      .from(userRecommendations)
      .where(eq(userRecommendations.userId, userId))
      .orderBy(userRecommendations.position)
      .limit(limit)
  }

  /**
   * Get recommendations for a user
   */
  async getUserRecommendations(
    userId: number,
    type?: RecommendationType,
    limit = 20,
    offset = 0
  ): Promise<UserRecommendation[]> {
    let query = db.select()
      .from(userRecommendations)
      .where(
        and(
          eq(userRecommendations.userId, userId),
          eq(userRecommendations.isDismissed, false)
        )
      )

    if (type) {
      query = query.where(eq(userRecommendations.recommendationType, type)) as typeof query
    }

    return query
      .orderBy(userRecommendations.position)
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get "For You" recommendations (mix of all types)
   */
  async getForYouRecommendations(userId: number, limit = 20): Promise<UserRecommendation[]> {
    // First check if we have existing recommendations
    const existing = await db.select()
      .from(userRecommendations)
      .where(
        and(
          eq(userRecommendations.userId, userId),
          eq(userRecommendations.isDismissed, false),
          gte(userRecommendations.expiresAt, new Date())
        )
      )
      .orderBy(userRecommendations.position)
      .limit(limit)

    if (existing.length >= limit / 2) {
      return existing
    }

    // Generate new recommendations if needed
    await this.generateUserRecommendations(userId, { limit: 50 })

    return db.select()
      .from(userRecommendations)
      .where(
        and(
          eq(userRecommendations.userId, userId),
          eq(userRecommendations.isDismissed, false)
        )
      )
      .orderBy(userRecommendations.position)
      .limit(limit)
  }

  /**
   * Mark recommendation as clicked
   */
  async markClicked(recommendationId: number): Promise<void> {
    await db.update(userRecommendations)
      .set({
        isClicked: true,
        isViewed: true,
      })
      .where(eq(userRecommendations.id, recommendationId))
  }

  /**
   * Mark recommendation as dismissed
   */
  async dismissRecommendation(recommendationId: number): Promise<void> {
    await db.update(userRecommendations)
      .set({ isDismissed: true })
      .where(eq(userRecommendations.id, recommendationId))
  }

  /**
   * Mark recommendations as viewed
   */
  async markViewed(recommendationIds: number[]): Promise<void> {
    await db.update(userRecommendations)
      .set({ isViewed: true })
      .where(inArray(userRecommendations.id, recommendationIds))
  }

  /**
   * Build user context for recommendations
   */
  private async buildUserContext(userId: number): Promise<RecommendationContext> {
    // Get books user has read
    const readBooksData = await db.select({ bookId: readingHistory.itemId })
      .from(readingHistory)
      .where(
        and(
          eq(readingHistory.userId, userId),
          eq(readingHistory.itemType, 'ebook')
        )
      )

    // Get currently reading
    const currentlyReadingData = await db.select({ bookId: userBookshelves.bookId })
      .from(userBookshelves)
      .where(
        and(
          eq(userBookshelves.userId, userId),
          eq(userBookshelves.bookType, 'ebook'),
          eq(userBookshelves.status, 'reading')
        )
      )

    // Get preferred categories from reading history
    const readBookIds = readBooksData.map(r => r.bookId)
    let preferredCategories: number[] = []

    if (readBookIds.length > 0) {
      const categoryData = await db.select({ categoryId: ebooks.categoryId })
        .from(ebooks)
        .where(inArray(ebooks.id, readBookIds))

      // Count occurrences
      const categoryCounts = new Map<number, number>()
      for (const c of categoryData) {
        if (c.categoryId) {
          categoryCounts.set(c.categoryId, (categoryCounts.get(c.categoryId) || 0) + 1)
        }
      }

      // Get top categories
      preferredCategories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([catId]) => catId)
    }

    // Get favorite authors
    let favoriteAuthors: string[] = []
    if (readBookIds.length > 0) {
      const authorData = await db.select({ author: ebooks.author })
        .from(ebooks)
        .where(
          and(
            inArray(ebooks.id, readBookIds),
            sql`${ebooks.author} IS NOT NULL`
          )
        )

      // Count occurrences
      const authorCounts = new Map<string, number>()
      for (const a of authorData) {
        if (a.author) {
          authorCounts.set(a.author, (authorCounts.get(a.author) || 0) + 1)
        }
      }

      // Get top authors
      favoriteAuthors = Array.from(authorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([author]) => author)
    }

    // Get following users
    const followingData = await db.select({ followingId: userFollowing.followingId })
      .from(userFollowing)
      .where(eq(userFollowing.followerId, userId))

    return {
      userId,
      readBooks: readBookIds,
      currentlyReading: currentlyReadingData.map(c => c.bookId),
      preferredCategories,
      favoriteAuthors,
      followingUserIds: followingData.map(f => f.followingId),
    }
  }

  /**
   * Generate similar to reading recommendations
   */
  private async generateSimilarToReading(
    context: RecommendationContext,
    minRating: number
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    // Get books currently being read or recently read
    const sourceBooks = [...context.currentlyReading, ...context.readBooks.slice(0, 5)]

    for (const sourceBookId of sourceBooks) {
      // Get related books
      const related = await db.select()
        .from(relatedBooks)
        .where(
          and(
            eq(relatedBooks.sourceBookType, 'ebook'),
            eq(relatedBooks.sourceBookId, sourceBookId),
            eq(relatedBooks.relatedBookType, 'ebook'),
            eq(relatedBooks.isActive, true)
          )
        )
        .orderBy(desc(relatedBooks.similarityScore))
        .limit(10)

      // Get source book info for reason text
      const [sourceBook] = await db.select({ title: ebooks.title })
        .from(ebooks)
        .where(eq(ebooks.id, sourceBookId))
        .limit(1)

      for (const rel of related) {
        const score = Number(rel.similarityScore || 0) * 100

        candidates.push({
          ebookId: rel.relatedBookId,
          score,
          reasonType: 'similar_book',
          reason: sourceBook ? `Because you enjoyed "${sourceBook.title}"` : 'Based on your reading preferences',
          sourceBookId,
          sourceBookType: 'ebook',
        })
      }
    }

    return candidates
  }

  /**
   * Generate popular in category recommendations
   */
  private async generatePopularInCategory(
    context: RecommendationContext,
    minRating: number
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    for (const categoryId of context.preferredCategories) {
      // Get category name
      const [category] = await db.select({ name: ebookCategories.displayName })
        .from(ebookCategories)
        .where(eq(ebookCategories.id, categoryId))
        .limit(1)

      // Get popular books in category
      const popularBooks = await db.select({
        id: ebooks.id,
        title: ebooks.title,
        trendingScore: ebooks.trendingScore,
      })
      .from(ebooks)
      .where(eq(ebooks.categoryId, categoryId))
      .orderBy(desc(ebooks.trendingScore))
      .limit(20)

      for (const book of popularBooks) {
        const score = Number(book.trendingScore || 0) * 0.8

        candidates.push({
          ebookId: book.id,
          score,
          reasonType: 'same_category',
          reason: category ? `Popular in ${category.name}` : 'Trending pick',
        })
      }
    }

    return candidates
  }

  /**
   * Generate same author recommendations
   */
  private async generateSameAuthor(
    context: RecommendationContext
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    for (const author of context.favoriteAuthors.slice(0, 5)) {
      const authorBooks = await db.select({
        id: ebooks.id,
        title: ebooks.title,
        viewCount: ebooks.viewCount,
      })
      .from(ebooks)
      .where(eq(ebooks.author, author))
      .orderBy(desc(ebooks.viewCount))
      .limit(5)

      for (const book of authorBooks) {
        candidates.push({
          ebookId: book.id,
          score: 80 + Math.log10((book.viewCount || 0) + 1) * 5,
          reasonType: 'same_author',
          reason: `More from ${author}`,
        })
      }
    }

    return candidates
  }

  /**
   * Generate friends reading recommendations
   */
  private async generateFriendsReading(
    context: RecommendationContext
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    if (context.followingUserIds.length === 0) return candidates

    // Get books that friends are reading
    const friendsReading = await db.select({
      bookId: userBookshelves.bookId,
      userCount: count(userBookshelves.userId),
    })
    .from(userBookshelves)
    .where(
      and(
        inArray(userBookshelves.userId, context.followingUserIds),
        eq(userBookshelves.bookType, 'ebook'),
        eq(userBookshelves.status, 'reading')
      )
    )
    .groupBy(userBookshelves.bookId)
    .orderBy(desc(count(userBookshelves.userId)))
    .limit(20)

    for (const fr of friendsReading) {
      const friendCount = Number(fr.userCount) || 1
      candidates.push({
        ebookId: fr.bookId,
        score: 70 + friendCount * 10,
        reasonType: 'friend_activity',
        reason: friendCount > 1
          ? `${friendCount} friends are reading this`
          : 'A friend is reading this',
      })
    }

    return candidates
  }

  /**
   * Generate trending recommendations
   */
  private async generateTrending(
    context: RecommendationContext,
    minRating: number
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    // Get trending books
    const trending = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      trendingScore: ebooks.trendingScore,
    })
    .from(ebooks)
    .where(gte(ebooks.trendingScore, '0.1'))
    .orderBy(desc(ebooks.trendingScore))
    .limit(30)

    for (const book of trending) {
      candidates.push({
        ebookId: book.id,
        score: Number(book.trendingScore || 0) * 0.5,
        reasonType: 'trending',
        reason: 'Trending now',
      })
    }

    // Get new releases in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newReleases = await db.select({
      id: ebooks.id,
      title: ebooks.title,
      viewCount: ebooks.viewCount,
      categoryId: ebooks.categoryId,
    })
    .from(ebooks)
    .where(gte(ebooks.createdAt, thirtyDaysAgo))
    .orderBy(desc(ebooks.viewCount))
    .limit(20)

    for (const book of newReleases) {
      // Boost if in user's preferred categories
      const categoryBoost = context.preferredCategories.includes(book.categoryId || 0) ? 20 : 0

      candidates.push({
        ebookId: book.id,
        score: 50 + Math.log10((book.viewCount || 0) + 1) * 10 + categoryBoost,
        reasonType: 'new_in_category',
        reason: 'New release',
      })
    }

    return candidates
  }

  /**
   * Generate high-rated book recommendations
   */
  private async generateHighRated(
    context: RecommendationContext
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = []

    // Get highly rated books
    const highRated = await db.select({
      bookId: bookStats.bookId,
      rating: bookStats.averageRating,
      readers: bookStats.totalReaders,
    })
    .from(bookStats)
    .where(
      and(
        eq(bookStats.bookType, 'ebook'),
        gte(bookStats.averageRating, '8.5'),
        gte(bookStats.ratingCount, 50)
      )
    )
    .orderBy(desc(bookStats.averageRating))
    .limit(30)

    for (const book of highRated) {
      const rating = Number(book.rating || 0)
      candidates.push({
        ebookId: book.bookId,
        score: rating * 10,
        reasonType: 'high_rating',
        reason: `Highly rated (${rating.toFixed(1)}/10)`,
      })
    }

    return candidates
  }

  /**
   * Deduplicate candidates, keeping highest score
   */
  private deduplicateCandidates(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
    const bookMap = new Map<number, RecommendationCandidate>()

    for (const candidate of candidates) {
      const existing = bookMap.get(candidate.ebookId)
      if (!existing || candidate.score > existing.score) {
        bookMap.set(candidate.ebookId, candidate)
      }
    }

    return Array.from(bookMap.values())
  }

  /**
   * Map reason type to recommendation type
   */
  private getRecommendationType(reasonType: ReasonType): RecommendationType {
    switch (reasonType) {
      case 'similar_book':
      case 'same_author':
        return 'similar_to_reading'
      case 'same_category':
      case 'new_in_category':
        return 'popular_in_category'
      case 'friend_activity':
        return 'friends_reading'
      case 'trending':
        return 'new_release'
      case 'high_rating':
      case 'reading_pattern':
      default:
        return 'for_you'
    }
  }

  /**
   * Clear expired recommendations
   */
  private async clearExpiredRecommendations(userId: number): Promise<void> {
    await db.delete(userRecommendations)
      .where(
        and(
          eq(userRecommendations.userId, userId),
          lte(userRecommendations.expiresAt, new Date())
        )
      )
  }

  /**
   * Compute related books for a specific book
   * This populates the related_books table for use in recommendations
   */
  async computeRelatedBooks(bookType: string, bookId: number): Promise<void> {
    if (bookType !== 'ebook') return

    const [sourceBook] = await db.select()
      .from(ebooks)
      .where(eq(ebooks.id, bookId))
      .limit(1)

    if (!sourceBook) return

    // Find same author books
    if (sourceBook.author) {
      const sameAuthorBooks = await db.select({ id: ebooks.id })
        .from(ebooks)
        .where(
          and(
            eq(ebooks.author, sourceBook.author),
            ne(ebooks.id, bookId)
          )
        )
        .limit(20)

      for (const book of sameAuthorBooks) {
        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookId,
            relatedBookType: 'ebook',
            relatedBookId: book.id,
            relationType: 'same_author',
            similarityScore: '0.9',
            confidence: '1.0',
            computedAt: new Date(),
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [relatedBooks.sourceBookType, relatedBooks.sourceBookId, relatedBooks.relatedBookType, relatedBooks.relatedBookId],
            set: {
              relationType: 'same_author',
              similarityScore: '0.9',
              computedAt: new Date(),
            },
          })
      }
    }

    // Find same category books
    if (sourceBook.categoryId) {
      const sameCategoryBooks = await db.select({ id: ebooks.id })
        .from(ebooks)
        .where(
          and(
            eq(ebooks.categoryId, sourceBook.categoryId),
            ne(ebooks.id, bookId)
          )
        )
        .orderBy(desc(ebooks.trendingScore))
        .limit(30)

      for (const book of sameCategoryBooks) {
        await db.insert(relatedBooks)
          .values({
            sourceBookType: 'ebook',
            sourceBookId: bookId,
            relatedBookType: 'ebook',
            relatedBookId: book.id,
            relationType: 'same_category',
            similarityScore: '0.6',
            confidence: '0.8',
            computedAt: new Date(),
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [relatedBooks.sourceBookType, relatedBooks.sourceBookId, relatedBooks.relatedBookType, relatedBooks.relatedBookId],
            set: {
              // Keep higher similarity score if same_author
              similarityScore: sql`GREATEST(${relatedBooks.similarityScore}, '0.6')`,
              computedAt: new Date(),
            },
          })
      }
    }

    // Find books with similar readers (readers_also_read)
    const usersWhoReadThis = await db.select({ userId: readingHistory.userId })
      .from(readingHistory)
      .where(
        and(
          eq(readingHistory.itemType, 'ebook'),
          eq(readingHistory.itemId, bookId)
        )
      )
      .limit(100)

    if (usersWhoReadThis.length > 0) {
      const userIds = usersWhoReadThis.map(u => u.userId).filter((id): id is number => id !== null)

      if (userIds.length > 0) {
        const alsoRead = await db.select({
          itemId: readingHistory.itemId,
          userCount: count(readingHistory.userId),
        })
        .from(readingHistory)
        .where(
          and(
            inArray(readingHistory.userId, userIds),
            eq(readingHistory.itemType, 'ebook'),
            ne(readingHistory.itemId, bookId)
          )
        )
        .groupBy(readingHistory.itemId)
        .orderBy(desc(count(readingHistory.userId)))
        .limit(20)

        for (const book of alsoRead) {
          const similarity = Math.min(0.8, Number(book.userCount) / userIds.length)

          await db.insert(relatedBooks)
            .values({
              sourceBookType: 'ebook',
              sourceBookId: bookId,
              relatedBookType: 'ebook',
              relatedBookId: book.itemId,
              relationType: 'readers_also_read',
              similarityScore: String(similarity),
              confidence: String(Math.min(1, userIds.length / 10)),
              computedAt: new Date(),
              isActive: true,
            })
            .onConflictDoUpdate({
              target: [relatedBooks.sourceBookType, relatedBooks.sourceBookId, relatedBooks.relatedBookType, relatedBooks.relatedBookId],
              set: {
                // Keep higher similarity score
                similarityScore: sql`GREATEST(${relatedBooks.similarityScore}, ${String(similarity)})`,
                computedAt: new Date(),
              },
            })
        }
      }
    }
  }

  /**
   * Batch compute related books for all books
   * Should be run as a scheduled job
   */
  async computeAllRelatedBooks(): Promise<{ processed: number }> {
    const allBooks = await db.select({ id: ebooks.id })
      .from(ebooks)
      .limit(1000)

    let processed = 0
    for (const book of allBooks) {
      try {
        await this.computeRelatedBooks('ebook', book.id)
        processed++
      } catch (error) {
        console.error(`Failed to compute related books for ${book.id}:`, error)
      }
    }

    return { processed }
  }

  /**
   * Generate category-based recommendations
   * Returns books popular in a specific category
   */
  async getCategoryRecommendations(
    categoryId: number,
    limit = 20,
    excludeBookIds: number[] = []
  ): Promise<Ebook[]> {
    let query = db.select()
      .from(ebooks)
      .where(eq(ebooks.categoryId, categoryId))

    if (excludeBookIds.length > 0) {
      query = query.where(notInArray(ebooks.id, excludeBookIds)) as typeof query
    }

    return query
      .orderBy(desc(ebooks.trendingScore))
      .limit(limit)
  }

  /**
   * Get personalized discovery feed
   * Mix of recommendations, trending, and editorial picks
   */
  async getDiscoveryFeed(userId: number, limit = 30): Promise<{
    forYou: UserRecommendation[]
    trending: Ebook[]
    newReleases: Ebook[]
    categories: { categoryId: number; categoryName: string; books: Ebook[] }[]
  }> {
    // Get personalized recommendations
    const forYou = await this.getForYouRecommendations(userId, 10)

    // Get trending books
    const trending = await db.select()
      .from(ebooks)
      .orderBy(desc(ebooks.trendingScore))
      .limit(10)

    // Get new releases
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newReleases = await db.select()
      .from(ebooks)
      .where(gte(ebooks.createdAt, thirtyDaysAgo))
      .orderBy(desc(ebooks.viewCount))
      .limit(10)

    // Get books by popular categories
    const categories = await db.select()
      .from(ebookCategories)
      .where(eq(ebookCategories.isActive, true))
      .orderBy(desc(ebookCategories.ebookCount))
      .limit(5)

    const categoryBooks = await Promise.all(
      categories.map(async (cat) => {
        const books = await this.getCategoryRecommendations(cat.id, 5)
        return {
          categoryId: cat.id,
          categoryName: cat.displayName || cat.name,
          books,
        }
      })
    )

    return {
      forYou,
      trending,
      newReleases,
      categories: categoryBooks,
    }
  }
}

export const recommendationService = new RecommendationService()
