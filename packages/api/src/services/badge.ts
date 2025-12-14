/**
 * Badge Service
 * Handles badge definitions, user badge awards, and progress tracking
 */

import { db } from '../db/client'
import { badges, userBadges, users } from '../db/schema'
import { eq, sql, asc } from 'drizzle-orm'

// Badge condition types
export type BadgeConditionType =
  | 'streak_days'           // 连续阅读天数
  | 'max_streak_days'       // 最长连续阅读
  | 'total_hours'           // 累计阅读小时
  | 'total_days'            // 累计阅读天数
  | 'books_finished'        // 读完书籍数
  | 'books_read'            // 阅读书籍数
  | 'weekly_perfect'        // 完美阅读周
  | 'monthly_perfect'       // 完美阅读月
  | 'likes_received'        // 收到的赞
  | 'reviews_written'       // 点评书籍数
  | 'new_user'              // 新用户注册
  // Time habits
  | 'early_bird_sessions'   // 早起阅读次数 (5:00-7:00)
  | 'night_owl_sessions'    // 深夜阅读次数 (23:00-2:00)
  | 'weekend_sessions'      // 周末阅读次数
  | 'lunch_sessions'        // 午间阅读次数 (12:00-14:00)
  // Genre badges
  | 'genre_fiction'         // 小说类书籍
  | 'genre_scifi'           // 科幻类书籍
  | 'genre_history'         // 历史类书籍
  | 'genre_philosophy'      // 哲学类书籍
  | 'genre_tech'            // 科技类书籍
  | 'genre_biography'       // 传记类书籍
  | 'genre_children'        // 儿童读物
  | 'genre_psychology'      // 心理/自助类
  | 'genre_business'        // 商业管理类
  | 'genre_art'             // 艺术类
  | 'genre_lifestyle'       // 生活类
  | 'all_genres'            // 全类型阅读
  // Speed reading
  | 'books_in_hour'         // 1小时内读完
  | 'books_in_day'          // 1天内读完多本
  | 'books_in_week'         // 1周内读完多本
  | 'books_in_month'        // 1月内读完多本
  | 'books_in_year'         // 1年内读完多本
  // Collection
  | 'collection_count'      // 收藏书籍数
  // Achievements
  | 'single_day_hours'      // 单日阅读小时数
  | 'marathon_session'      // 单次马拉松阅读
  | 'monthly_books'         // 月读书籍数
  | 'yearly_books'          // 年读书籍数
  | 'weekly_avg_hours'      // 周均阅读小时
  | 'reading_speed_pages'   // 阅读速度（页/分钟）
  // Social
  | 'shares_count'          // 分享次数
  | 'friends_invited'       // 邀请好友数
  | 'comments_count'        // 评论数
  | 'followers_count'       // 粉丝数
  | 'following_count'       // 关注数
  // Recovery & Persistence
  | 'streak_recovery'       // 连续阅读恢复
  | 'year_no_break'         // 全年无间断
  | 'holidays_reading'      // 节日期间阅读
  // Series
  | 'series_completed'      // 完成书籍系列数
  // Festival/Special events
  | 'spring_festival'       // 春节阅读
  | 'national_day'          // 国庆阅读
  | 'world_book_day'        // 世界读书日
  | 'new_year'              // 元旦阅读
  | 'mid_autumn'            // 中秋阅读
  | 'summer_reading'        // 暑期阅读
  // Milestones
  | 'first_book'            // 第一本书
  | 'first_review'          // 第一条书评
  | 'first_share'           // 第一次分享

// Badge categories
export type BadgeCategory =
  | 'reading_streak'     // 连续阅读
  | 'reading_duration'   // 阅读时长
  | 'reading_days'       // 阅读天数
  | 'books_finished'     // 读完书籍
  | 'weekly_challenge'   // 每周挑战
  | 'monthly_challenge'  // 每月挑战
  | 'social'             // 社交互动
  | 'special'            // 特殊勋章
  | 'early_bird'         // 早起阅读
  | 'night_owl'          // 夜猫子
  | 'speed_reader'       // 阅读速度
  | 'reviewer'           // 书评家
  | 'collector'          // 收藏家
  | 'explorer'           // 探索者
  | 'milestone'          // 里程碑
  | 'seasonal'           // 季节/节日
  | 'time_habit'         // 时段习惯
  | 'genre'              // 阅读类型
  | 'achievement'        // 成就挑战
  | 'persistence'        // 坚持与恢复
  | 'series'             // 系列完成

interface BadgeRequirement {
  id: number
  description: string
  current: number
  target: number
}

interface BadgeData {
  id: number
  category: string
  level: number
  name: string
  description: string | null
  requirement: string | null
  iconUrl: string | null
  backgroundColor: string | null
  earnedCount: number
  // New fields for enhanced badge UI
  tier: string | null
  rarity: string | null
  lore: string | null
  xpValue: number | null
  requirements: BadgeRequirement[] | null
}

interface BadgeProgress {
  badge: BadgeData
  progress: {
    current: number
    target: number
    percentage: number
    remaining: string
  }
}

interface EarnedBadge extends BadgeData {
  earnedAt: Date
  startDate: string | null
}

class BadgeService {
  /**
   * Get all badges for a user (earned + in progress)
   */
  async getUserBadges(userId: number) {
    // Get user's current stats
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) throw new Error('User not found')

    // Get all active badges
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(asc(badges.category), asc(badges.level))

    // Get user's earned badges
    const earnedBadges = await db
      .select({
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))

    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId))
    const earnedBadgeMap = new Map(
      earnedBadges.map((b) => [b.badgeId, b.earnedAt])
    )

    // Categorize badges
    const earned: EarnedBadge[] = []
    const inProgress: BadgeProgress[] = []

    for (const badge of allBadges) {
      // Calculate tier and rarity based on level/conditionValue if not set
      const tier = badge.tier || this.calculateTier(badge.level || 1, badge.conditionValue)
      const rarity = badge.rarity || this.calculateRarity(badge.level || 1, badge.conditionValue)
      const xpValue = badge.xpValue || this.calculateXpValue(badge.level || 1, badge.conditionValue)

      // Build requirements array from badge
      const requirements = this.buildRequirements(user, badge)

      if (earnedBadgeIds.has(badge.id)) {
        // Already earned
        earned.push({
          id: badge.id,
          category: badge.category,
          level: badge.level || 1,
          name: badge.name,
          description: badge.description,
          requirement: badge.requirement,
          iconUrl: badge.iconUrl,
          backgroundColor: badge.backgroundColor,
          earnedAt: earnedBadgeMap.get(badge.id)!,
          earnedCount: badge.earnedCount || 0,
          tier,
          rarity,
          lore: badge.lore,
          xpValue,
          requirements,
          startDate: null, // Can be computed from first progress if needed
        })
      } else {
        // In progress - calculate current progress
        const progress = this.calculateProgress(user, badge)
        if (progress) {
          inProgress.push({
            badge: {
              id: badge.id,
              category: badge.category,
              level: badge.level || 1,
              name: badge.name,
              description: badge.description,
              requirement: badge.requirement,
              iconUrl: badge.iconUrl,
              backgroundColor: badge.backgroundColor,
              earnedCount: badge.earnedCount || 0,
              tier,
              rarity,
              lore: badge.lore,
              xpValue,
              requirements,
            },
            progress,
          })
        }
      }
    }

    // Calculate category summary
    const categories: Record<string, { earned: number; total: number }> = {}
    for (const badge of allBadges) {
      if (!categories[badge.category]) {
        categories[badge.category] = { earned: 0, total: 0 }
      }
      categories[badge.category].total++
      if (earnedBadgeIds.has(badge.id)) {
        categories[badge.category].earned++
      }
    }

    return {
      earned,
      inProgress,
      categories,
    }
  }

  /**
   * Calculate progress for a badge
   */
  private calculateProgress(
    user: typeof users.$inferSelect,
    badge: typeof badges.$inferSelect
  ): { current: number; target: number; percentage: number; remaining: string } | null {
    const target = badge.conditionValue
    let current = 0

    switch (badge.conditionType) {
      case 'streak_days':
        current = user.currentStreakDays || 0
        break
      case 'max_streak_days':
        current = user.maxStreakDays || 0
        break
      case 'total_hours':
        current = Math.floor((user.totalReadingDuration || 0) / 3600)
        break
      case 'total_days':
        current = user.totalReadingDays || 0
        break
      case 'books_finished':
        current = user.booksFinishedCount || 0
        break
      case 'books_read':
        current = user.booksReadCount || 0
        break
      default:
        return null
    }

    const percentage = Math.min(100, (current / target) * 100)
    const remaining = this.formatRemaining(badge.conditionType, target - current)

    return {
      current,
      target,
      percentage: Math.round(percentage * 10) / 10,
      remaining,
    }
  }

  /**
   * Format remaining text
   */
  private formatRemaining(conditionType: string, remaining: number): string {
    if (remaining <= 0) return 'Achieved'

    switch (conditionType) {
      case 'streak_days':
      case 'max_streak_days':
      case 'total_days':
        return `${remaining} more day${remaining === 1 ? '' : 's'} to earn`
      case 'total_hours':
        return `${remaining} more hour${remaining === 1 ? '' : 's'} to earn`
      case 'books_finished':
      case 'books_read':
        return `${remaining} more book${remaining === 1 ? '' : 's'} to earn`
      default:
        return `${remaining} more to earn`
    }
  }

  /**
   * Calculate tier based on badge level and condition value
   * Mapping: 1-2 = iron, 3 = bronze, 4 = silver, 5+ = gold
   */
  private calculateTier(level: number, conditionValue: number): string {
    if (level >= 5) return 'gold'
    if (level >= 4) return 'silver'
    if (level >= 3) return 'bronze'
    return 'iron'
  }

  /**
   * Calculate rarity based on badge level and condition value
   * Mapping: 1-2 = common, 3 = rare, 4 = epic, 5+ = legendary
   */
  private calculateRarity(level: number, conditionValue: number): string {
    if (level >= 5) return 'legendary'
    if (level >= 4) return 'epic'
    if (level >= 3) return 'rare'
    return 'common'
  }

  /**
   * Calculate XP value based on badge level and condition value
   */
  private calculateXpValue(level: number, conditionValue: number): number {
    // Base XP by level
    const baseXp = [50, 100, 200, 400, 800, 1200]
    return baseXp[Math.min(level - 1, baseXp.length - 1)] || 50
  }

  /**
   * Build requirements array from badge data and user progress
   */
  private buildRequirements(
    user: typeof users.$inferSelect,
    badge: typeof badges.$inferSelect
  ): BadgeRequirement[] {
    // If badge has custom requirements array, use it with user progress
    if (badge.requirements && Array.isArray(badge.requirements)) {
      return (badge.requirements as Array<{ id: number; description: string; conditionType: string; conditionValue: number }>).map((req, index) => {
        const current = this.getCurrentValueForCondition(user, req.conditionType)
        return {
          id: req.id || index + 1,
          description: req.description,
          current: Math.min(current, req.conditionValue),
          target: req.conditionValue,
        }
      })
    }

    // Default: single requirement from badge's main condition
    const current = this.getCurrentValueForCondition(user, badge.conditionType)
    return [{
      id: 1,
      description: badge.requirement || badge.name,
      current: Math.min(current, badge.conditionValue),
      target: badge.conditionValue,
    }]
  }

  /**
   * Get current value for a condition type from user data
   */
  private getCurrentValueForCondition(user: typeof users.$inferSelect, conditionType: string): number {
    switch (conditionType) {
      case 'streak_days':
        return user.currentStreakDays || 0
      case 'max_streak_days':
        return user.maxStreakDays || 0
      case 'total_hours':
        return Math.floor((user.totalReadingDuration || 0) / 3600)
      case 'total_days':
        return user.totalReadingDays || 0
      case 'books_finished':
        return user.booksFinishedCount || 0
      case 'books_read':
        return user.booksReadCount || 0
      default:
        return 0
    }
  }

  /**
   * Check and award badges for a user
   */
  async checkAndAwardBadges(userId: number): Promise<EarnedBadge[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) return []

    // Get all active badges not yet earned
    const allBadges = await db.select().from(badges).where(eq(badges.isActive, true))

    const earnedBadgeIds = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))

    const earnedSet = new Set(earnedBadgeIds.map((b) => b.badgeId))
    const newlyEarned: EarnedBadge[] = []

    for (const badge of allBadges) {
      if (earnedSet.has(badge.id)) continue

      const qualified = this.checkBadgeQualification(user, badge)
      if (qualified) {
        // Award the badge
        await db.insert(userBadges).values({
          userId,
          badgeId: badge.id,
        })

        // Update earned count
        await db
          .update(badges)
          .set({ earnedCount: sql`${badges.earnedCount} + 1` })
          .where(eq(badges.id, badge.id))

        // Calculate tier and rarity
        const tier = badge.tier || this.calculateTier(badge.level || 1, badge.conditionValue)
        const rarity = badge.rarity || this.calculateRarity(badge.level || 1, badge.conditionValue)
        const xpValue = badge.xpValue || this.calculateXpValue(badge.level || 1, badge.conditionValue)
        const requirements = this.buildRequirements(user, badge)

        newlyEarned.push({
          id: badge.id,
          category: badge.category,
          level: badge.level || 1,
          name: badge.name,
          description: badge.description,
          requirement: badge.requirement,
          iconUrl: badge.iconUrl,
          backgroundColor: badge.backgroundColor,
          earnedAt: new Date(),
          earnedCount: (badge.earnedCount || 0) + 1,
          tier,
          rarity,
          lore: badge.lore,
          xpValue,
          requirements,
          startDate: null,
        })
      }
    }

    return newlyEarned
  }

  /**
   * Check if user qualifies for a badge
   */
  private checkBadgeQualification(
    user: typeof users.$inferSelect,
    badge: typeof badges.$inferSelect
  ): boolean {
    const target = badge.conditionValue

    switch (badge.conditionType) {
      case 'streak_days':
        return (user.currentStreakDays || 0) >= target
      case 'max_streak_days':
        return (user.maxStreakDays || 0) >= target
      case 'total_hours':
        return Math.floor((user.totalReadingDuration || 0) / 3600) >= target
      case 'total_days':
        return (user.totalReadingDays || 0) >= target
      case 'books_finished':
        return (user.booksFinishedCount || 0) >= target
      case 'books_read':
        return (user.booksReadCount || 0) >= target
      default:
        return false
    }
  }

  /**
   * Get badge by ID
   */
  async getBadge(badgeId: number) {
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId))
    return badge || null
  }

  /**
   * Award welcome badge to new user
   */
  async awardWelcomeBadge(userId: number): Promise<EarnedBadge | null> {
    // Find the welcome badge (category: special, conditionType: new_user)
    const [welcomeBadge] = await db
      .select()
      .from(badges)
      .where(eq(badges.conditionType, 'new_user'))
      .limit(1)

    if (!welcomeBadge) {
      console.log('Welcome badge not found in database')
      return null
    }

    // Check if user already has this badge
    const [existing] = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .limit(1)

    if (existing && existing.badgeId === welcomeBadge.id) {
      return null // Already has badge
    }

    // Award the badge
    await db.insert(userBadges).values({
      userId,
      badgeId: welcomeBadge.id,
    })

    // Update earned count
    await db
      .update(badges)
      .set({ earnedCount: sql`${badges.earnedCount} + 1` })
      .where(eq(badges.id, welcomeBadge.id))

    // Calculate tier and rarity for welcome badge
    const tier = welcomeBadge.tier || this.calculateTier(welcomeBadge.level || 1, welcomeBadge.conditionValue)
    const rarity = welcomeBadge.rarity || this.calculateRarity(welcomeBadge.level || 1, welcomeBadge.conditionValue)
    const xpValue = welcomeBadge.xpValue || this.calculateXpValue(welcomeBadge.level || 1, welcomeBadge.conditionValue)

    return {
      id: welcomeBadge.id,
      category: welcomeBadge.category,
      level: welcomeBadge.level || 1,
      name: welcomeBadge.name,
      description: welcomeBadge.description,
      requirement: welcomeBadge.requirement,
      iconUrl: welcomeBadge.iconUrl,
      backgroundColor: welcomeBadge.backgroundColor,
      earnedAt: new Date(),
      earnedCount: (welcomeBadge.earnedCount || 0) + 1,
      tier,
      rarity,
      lore: welcomeBadge.lore,
      xpValue,
      requirements: [{
        id: 1,
        description: welcomeBadge.requirement || welcomeBadge.name,
        current: 1,
        target: 1,
      }],
      startDate: null,
    }
  }

  /**
   * Get all badges grouped by category
   */
  async getAllBadges() {
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(asc(badges.category), asc(badges.level))

    // Group by category
    const grouped: Record<string, typeof allBadges> = {}
    for (const badge of allBadges) {
      if (!grouped[badge.category]) {
        grouped[badge.category] = []
      }
      grouped[badge.category].push(badge)
    }

    return grouped
  }

  /**
   * Initialize default badges (adds any missing badges)
   */
  async initializeDefaultBadges() {
    // Get existing badges to check which ones need to be added
    const existingBadges = await db
      .select({ category: badges.category, level: badges.level, conditionType: badges.conditionType })
      .from(badges)

    // Create a Set of existing badge keys for quick lookup
    const existingKeys = new Set(
      existingBadges.map(b => `${b.category}-${b.level}-${b.conditionType}`)
    )

    const defaultBadges = [
      // =====================================================
      // 1. 阅读连续 (Reading Streak) - 6枚 (#1-6)
      // =====================================================
      { category: 'reading_streak', level: 1, name: '初燃', requirement: '连续阅读7天', conditionType: 'streak_days', conditionValue: 7, description: '习惯养成的第一步', backgroundColor: '#71797E', iconUrl: 'flame.fill', tier: 'iron', rarity: 'common', xpValue: 50, lore: '每一个伟大的旅程都始于一个小小的火花。七日之火，照亮前行的道路。' },
      { category: 'reading_streak', level: 2, name: '恒温', requirement: '连续阅读30天', conditionType: 'streak_days', conditionValue: 30, description: '一个月的坚持', backgroundColor: '#CD7F32', iconUrl: 'flame.fill', tier: 'bronze', rarity: 'common', xpValue: 100, lore: '恒温的火焰，是最可靠的光源。三十日的坚持，铸就不凡的意志。' },
      { category: 'reading_streak', level: 3, name: '烈焰', requirement: '连续阅读90天', conditionType: 'streak_days', conditionValue: 90, description: '季度达人', backgroundColor: '#C0C0C0', iconUrl: 'flame.fill', tier: 'silver', rarity: 'rare', xpValue: 200, lore: '当火焰燃烧了一个季节，它便不再是火花，而是熊熊烈焰。你已证明自己不只是过客。' },
      { category: 'reading_streak', level: 4, name: '永燃', requirement: '连续阅读180天', conditionType: 'streak_days', conditionValue: 180, description: '半年不间断', backgroundColor: '#FFD700', iconUrl: 'flame.fill', tier: 'gold', rarity: 'epic', xpValue: 400, lore: '永燃之火，从不熄灭。半年的坚持，让你成为传说中的守护者。' },
      { category: 'reading_streak', level: 5, name: '不灭', requirement: '连续阅读365天', conditionType: 'streak_days', conditionValue: 365, description: '整年阅读达人', backgroundColor: '#E5E4E2', iconUrl: 'flame.fill', tier: 'gold', rarity: 'legendary', xpValue: 800, lore: '不灭之焰，跨越四季轮回。整年不断的阅读，你已超越凡人的境界。' },
      { category: 'reading_streak', level: 6, name: '传奇之焰', requirement: '连续阅读1000天', conditionType: 'streak_days', conditionValue: 1000, description: '千日传奇', backgroundColor: '#B9F2FF', iconUrl: 'flame.fill', tier: 'gold', rarity: 'legendary', xpValue: 1200, lore: '千日之火，足以照亮整个世界。你的名字将被刻入永恒的殿堂，成为后人仰望的传奇。' },

      // =====================================================
      // 2. 阅读时长 (Reading Duration) - 6枚 (#7-12)
      // =====================================================
      { category: 'reading_duration', level: 1, name: '萌芽', requirement: '累计阅读100小时', conditionType: 'total_hours', conditionValue: 100, description: '阅读之旅开始', backgroundColor: '#71797E', iconUrl: 'clock.fill', tier: 'iron', rarity: 'common', xpValue: 50, lore: '种子破土而出，这是你阅读生涯的第一棵幼苗。百小时的积累，是一切的开始。' },
      { category: 'reading_duration', level: 2, name: '成长', requirement: '累计阅读500小时', conditionType: 'total_hours', conditionValue: 500, description: '认真的读者', backgroundColor: '#CD7F32', iconUrl: 'clock.fill', tier: 'bronze', rarity: 'common', xpValue: 100, lore: '幼苗成长为小树，根系深入大地。五百小时的阅读，让你的知识之树日渐茁壮。' },
      { category: 'reading_duration', level: 3, name: '繁茂', requirement: '累计阅读1000小时', conditionType: 'total_hours', conditionValue: 1000, description: '阅读达人', backgroundColor: '#C0C0C0', iconUrl: 'clock.fill', tier: 'silver', rarity: 'rare', xpValue: 200, lore: '枝繁叶茂，绿荫如盖。千小时的积累，你已成为知识森林中的一棵大树。' },
      { category: 'reading_duration', level: 4, name: '参天', requirement: '累计阅读2000小时', conditionType: 'total_hours', conditionValue: 2000, description: '阅读专家', backgroundColor: '#FFD700', iconUrl: 'clock.fill', tier: 'gold', rarity: 'epic', xpValue: 400, lore: '参天大树，俯瞰森林。两千小时的阅读，让你的视野超越常人。' },
      { category: 'reading_duration', level: 5, name: '擎天', requirement: '累计阅读3000小时', conditionType: 'total_hours', conditionValue: 3000, description: '阅读学者', backgroundColor: '#E5E4E2', iconUrl: 'clock.fill', tier: 'gold', rarity: 'legendary', xpValue: 800, lore: '擎天巨木，直入云霄。三千小时的沉淀，你已成为学识的巨人。' },
      { category: 'reading_duration', level: 6, name: '永恒之树', requirement: '累计阅读5000小时', conditionType: 'total_hours', conditionValue: 5000, description: '传说中的读者', backgroundColor: '#B9F2FF', iconUrl: 'clock.fill', tier: 'gold', rarity: 'legendary', xpValue: 1200, lore: '世界树的化身，连接天地万物。五千小时的智慧结晶，你已成为永恒知识的守护者。' },

      // =====================================================
      // 3. 阅读天数 (Reading Days) - 5枚 (#13-17)
      // =====================================================
      { category: 'reading_days', level: 1, name: '百日行', requirement: '累计阅读100天', conditionType: 'total_days', conditionValue: 100, description: '百日里程碑', backgroundColor: '#71797E', iconUrl: 'calendar' },
      { category: 'reading_days', level: 2, name: '双百行', requirement: '累计阅读200天', conditionType: 'total_days', conditionValue: 200, description: '双百突破', backgroundColor: '#CD7F32', iconUrl: 'calendar' },
      { category: 'reading_days', level: 3, name: '年轮', requirement: '累计阅读365天', conditionType: 'total_days', conditionValue: 365, description: '一年的时光', backgroundColor: '#C0C0C0', iconUrl: 'calendar' },
      { category: 'reading_days', level: 4, name: '五百里', requirement: '累计阅读500天', conditionType: 'total_days', conditionValue: 500, description: '半千日成就', backgroundColor: '#FFD700', iconUrl: 'calendar' },
      { category: 'reading_days', level: 5, name: '千里行', requirement: '累计阅读1000天', conditionType: 'total_days', conditionValue: 1000, description: '千日大成', backgroundColor: '#E5E4E2', iconUrl: 'calendar' },

      // =====================================================
      // 4. 读完书籍 (Books Finished) - 6枚 (#18-23)
      // =====================================================
      { category: 'books_finished', level: 1, name: '书虫', requirement: '读完10本书', conditionType: 'books_finished', conditionValue: 10, description: '初入书海', backgroundColor: '#71797E', iconUrl: 'book.closed.fill', tier: 'iron', rarity: 'common', xpValue: 50, lore: '你已经完成了十本书的阅读，书海中的小小探险家，未来充满无限可能。' },
      { category: 'books_finished', level: 2, name: '书痴', requirement: '读完50本书', conditionType: 'books_finished', conditionValue: 50, description: '沉迷书海', backgroundColor: '#CD7F32', iconUrl: 'book.closed.fill', tier: 'bronze', rarity: 'common', xpValue: 100, lore: '五十本书籍，五十个世界。你已深深沉迷于文字的海洋，无法自拔。' },
      { category: 'books_finished', level: 3, name: '书狂', requirement: '读完100本书', conditionType: 'books_finished', conditionValue: 100, description: '百书达人', backgroundColor: '#C0C0C0', iconUrl: 'book.closed.fill', tier: 'silver', rarity: 'rare', xpValue: 200, lore: '百书在手，胸怀万卷。你对阅读的热爱已超越常人，成为真正的书狂。' },
      { category: 'books_finished', level: 4, name: '书圣', requirement: '读完200本书', conditionType: 'books_finished', conditionValue: 200, description: '阅读精英', backgroundColor: '#FFD700', iconUrl: 'book.closed.fill', tier: 'gold', rarity: 'epic', xpValue: 400, lore: '两百本书的智慧，铸就圣者之名。你的学识已足以启迪他人。' },
      { category: 'books_finished', level: 5, name: '书仙', requirement: '读完500本书', conditionType: 'books_finished', conditionValue: 500, description: '书库征服者', backgroundColor: '#E5E4E2', iconUrl: 'book.closed.fill', tier: 'gold', rarity: 'legendary', xpValue: 800, lore: '五百卷书，通晓古今。你已超脱凡尘，成为书中仙人。' },
      { category: 'books_finished', level: 6, name: '书神', requirement: '读完1000本书', conditionType: 'books_finished', conditionValue: 1000, description: '终极书痴', backgroundColor: '#B9F2FF', iconUrl: 'book.closed.fill', tier: 'gold', rarity: 'legendary', xpValue: 1200, lore: '千书之神，万卷藏心。你是书海中的至高存在，传说中的阅读之神。' },

      // =====================================================
      // 5. 时段习惯 (Time Habits) - 8枚 (#24-31)
      // =====================================================
      { category: 'time_habit', level: 1, name: '晨光', requirement: '早起阅读10次 (5:00-7:00)', conditionType: 'early_bird_sessions', conditionValue: 10, description: '晨起阅读者', backgroundColor: '#71797E', iconUrl: 'sunrise.fill' },
      { category: 'time_habit', level: 2, name: '朝阳', requirement: '早起阅读50次', conditionType: 'early_bird_sessions', conditionValue: 50, description: '晨读达人', backgroundColor: '#CD7F32', iconUrl: 'sunrise.fill' },
      { category: 'time_habit', level: 3, name: '曙光使者', requirement: '早起阅读100次', conditionType: 'early_bird_sessions', conditionValue: 100, description: '晨读大师', backgroundColor: '#C0C0C0', iconUrl: 'sunrise.fill' },
      { category: 'time_habit', level: 4, name: '夜猫子', requirement: '深夜阅读10次 (23:00-2:00)', conditionType: 'night_owl_sessions', conditionValue: 10, description: '夜间阅读者', backgroundColor: '#71797E', iconUrl: 'moon.stars.fill' },
      { category: 'time_habit', level: 5, name: '月光族', requirement: '深夜阅读50次', conditionType: 'night_owl_sessions', conditionValue: 50, description: '夜读达人', backgroundColor: '#CD7F32', iconUrl: 'moon.stars.fill' },
      { category: 'time_habit', level: 6, name: '暗夜守望', requirement: '深夜阅读100次', conditionType: 'night_owl_sessions', conditionValue: 100, description: '夜读大师', backgroundColor: '#C0C0C0', iconUrl: 'moon.stars.fill' },
      { category: 'time_habit', level: 7, name: '周末书友', requirement: '周末阅读20次', conditionType: 'weekend_sessions', conditionValue: 20, description: '周末阅读者', backgroundColor: '#CD7F32', iconUrl: 'sun.max.fill' },
      { category: 'time_habit', level: 8, name: '午间小憩', requirement: '午间阅读30次 (12:00-14:00)', conditionType: 'lunch_sessions', conditionValue: 30, description: '午休阅读者', backgroundColor: '#CD7F32', iconUrl: 'cup.and.saucer.fill' },

      // =====================================================
      // 6. 阅读类型 (Genre) - 12枚 (#32-43)
      // =====================================================
      { category: 'genre', level: 1, name: '故事家', requirement: '读完10本小说', conditionType: 'genre_fiction', conditionValue: 10, description: '沉浸故事世界', backgroundColor: '#C0C0C0', iconUrl: 'text.book.closed.fill' },
      { category: 'genre', level: 2, name: '星际旅人', requirement: '读完10本科幻小说', conditionType: 'genre_scifi', conditionValue: 10, description: '探索未知宇宙', backgroundColor: '#C0C0C0', iconUrl: 'sparkles' },
      { category: 'genre', level: 3, name: '时光旅者', requirement: '读完10本历史书籍', conditionType: 'genre_history', conditionValue: 10, description: '穿越历史长河', backgroundColor: '#C0C0C0', iconUrl: 'clock.arrow.circlepath' },
      { category: 'genre', level: 4, name: '思想者', requirement: '读完10本哲学书籍', conditionType: 'genre_philosophy', conditionValue: 10, description: '探索人生哲理', backgroundColor: '#C0C0C0', iconUrl: 'brain.head.profile' },
      { category: 'genre', level: 5, name: '科技达人', requirement: '读完10本科技书籍', conditionType: 'genre_tech', conditionValue: 10, description: '拥抱科技前沿', backgroundColor: '#C0C0C0', iconUrl: 'cpu.fill' },
      { category: 'genre', level: 6, name: '人物志', requirement: '读完10本传记', conditionType: 'genre_biography', conditionValue: 10, description: '阅尽人生百态', backgroundColor: '#C0C0C0', iconUrl: 'person.text.rectangle.fill' },
      { category: 'genre', level: 7, name: '童心未泯', requirement: '读完10本儿童读物', conditionType: 'genre_children', conditionValue: 10, description: '保持童真', backgroundColor: '#C0C0C0', iconUrl: 'teddybear.fill' },
      { category: 'genre', level: 8, name: '心灵疗愈', requirement: '读完10本心理/自助书籍', conditionType: 'genre_psychology', conditionValue: 10, description: '关注内心成长', backgroundColor: '#C0C0C0', iconUrl: 'heart.fill' },
      { category: 'genre', level: 9, name: '商业精英', requirement: '读完10本商业管理书籍', conditionType: 'genre_business', conditionValue: 10, description: '提升商业思维', backgroundColor: '#C0C0C0', iconUrl: 'briefcase.fill' },
      { category: 'genre', level: 10, name: '艺术鉴赏', requirement: '读完10本艺术类书籍', conditionType: 'genre_art', conditionValue: 10, description: '感受艺术之美', backgroundColor: '#C0C0C0', iconUrl: 'paintpalette.fill' },
      { category: 'genre', level: 11, name: '生活达人', requirement: '读完10本生活类书籍', conditionType: 'genre_lifestyle', conditionValue: 10, description: '热爱生活', backgroundColor: '#C0C0C0', iconUrl: 'house.fill' },
      { category: 'genre', level: 12, name: '博览群书', requirement: '读完所有类型各1本', conditionType: 'all_genres', conditionValue: 1, description: '全类型阅读者', backgroundColor: '#FFD700', iconUrl: 'books.vertical.fill' },

      // =====================================================
      // 7. 成就挑战 (Achievement) - 10枚 (#44-53)
      // =====================================================
      { category: 'achievement', level: 1, name: '专注力', requirement: '单日阅读4小时', conditionType: 'single_day_hours', conditionValue: 4, description: '专注一整天', backgroundColor: '#71797E', iconUrl: 'target' },
      { category: 'achievement', level: 2, name: '深度阅读', requirement: '单日阅读8小时', conditionType: 'single_day_hours', conditionValue: 8, description: '沉浸式阅读', backgroundColor: '#CD7F32', iconUrl: 'target' },
      { category: 'achievement', level: 3, name: '阅读马拉松', requirement: '单次阅读连续3小时', conditionType: 'marathon_session', conditionValue: 3, description: '不间断阅读', backgroundColor: '#C0C0C0', iconUrl: 'figure.run' },
      { category: 'achievement', level: 4, name: '月读达人', requirement: '一个月读完10本书', conditionType: 'monthly_books', conditionValue: 10, description: '月度阅读冠军', backgroundColor: '#FFD700', iconUrl: 'crown.fill' },
      { category: 'achievement', level: 5, name: '年度阅读王', requirement: '一年读完100本书', conditionType: 'yearly_books', conditionValue: 100, description: '年度阅读王者', backgroundColor: '#E5E4E2', iconUrl: 'trophy.fill' },
      { category: 'achievement', level: 6, name: '效率阅读', requirement: '周均阅读10小时以上', conditionType: 'weekly_avg_hours', conditionValue: 10, description: '高效阅读者', backgroundColor: '#CD7F32', iconUrl: 'gauge.with.needle.fill' },
      { category: 'achievement', level: 7, name: '完美一周', requirement: '连续7天每天都阅读', conditionType: 'weekly_perfect', conditionValue: 1, description: '一周不间断', backgroundColor: '#CD7F32', iconUrl: 'star.fill' },
      { category: 'achievement', level: 8, name: '完美一月', requirement: '连续30天每天都阅读', conditionType: 'monthly_perfect', conditionValue: 1, description: '一月不间断', backgroundColor: '#FFD700', iconUrl: 'star.circle.fill' },
      { category: 'achievement', level: 9, name: '速读高手', requirement: '阅读速度达到300页/小时', conditionType: 'reading_speed_pages', conditionValue: 300, description: '高速阅读者', backgroundColor: '#C0C0C0', iconUrl: 'hare.fill' },
      { category: 'achievement', level: 10, name: '阅读终结者', requirement: '一年读完200本书', conditionType: 'yearly_books', conditionValue: 200, description: '极限阅读挑战', backgroundColor: '#B9F2FF', iconUrl: 'bolt.fill' },

      // =====================================================
      // 8. 社交互动 (Social) - 10枚 (#54-63)
      // =====================================================
      { category: 'social', level: 1, name: '分享者', requirement: '分享10次阅读动态', conditionType: 'shares_count', conditionValue: 10, description: '乐于分享', backgroundColor: '#71797E', iconUrl: 'square.and.arrow.up.fill' },
      { category: 'social', level: 2, name: '传播者', requirement: '分享50次阅读动态', conditionType: 'shares_count', conditionValue: 50, description: '阅读传播者', backgroundColor: '#CD7F32', iconUrl: 'square.and.arrow.up.fill' },
      { category: 'social', level: 3, name: '影响力', requirement: '分享100次阅读动态', conditionType: 'shares_count', conditionValue: 100, description: '阅读影响者', backgroundColor: '#C0C0C0', iconUrl: 'megaphone.fill' },
      { category: 'social', level: 4, name: '引荐人', requirement: '邀请5位好友加入', conditionType: 'friends_invited', conditionValue: 5, description: '好友推荐', backgroundColor: '#71797E', iconUrl: 'person.badge.plus.fill' },
      { category: 'social', level: 5, name: '人气王', requirement: '邀请20位好友加入', conditionType: 'friends_invited', conditionValue: 20, description: '社交达人', backgroundColor: '#CD7F32', iconUrl: 'person.3.fill' },
      { category: 'social', level: 6, name: '点评家', requirement: '发表20条书评', conditionType: 'reviews_written', conditionValue: 20, description: '书评达人', backgroundColor: '#71797E', iconUrl: 'text.bubble.fill' },
      { category: 'social', level: 7, name: '评论大师', requirement: '发表100条书评', conditionType: 'reviews_written', conditionValue: 100, description: '书评专家', backgroundColor: '#C0C0C0', iconUrl: 'bubble.left.and.bubble.right.fill' },
      { category: 'social', level: 8, name: '受欢迎', requirement: '获得100个赞', conditionType: 'likes_received', conditionValue: 100, description: '被认可的读者', backgroundColor: '#CD7F32', iconUrl: 'hand.thumbsup.fill' },
      { category: 'social', level: 9, name: '明星读者', requirement: '获得500个赞', conditionType: 'likes_received', conditionValue: 500, description: '明星级读者', backgroundColor: '#FFD700', iconUrl: 'star.fill' },
      { category: 'social', level: 10, name: '互动达人', requirement: '发表200条评论', conditionType: 'comments_count', conditionValue: 200, description: '活跃互动者', backgroundColor: '#C0C0C0', iconUrl: 'bubble.left.and.text.bubble.right.fill' },

      // =====================================================
      // 9. 节日纪念 (Festival/Seasonal) - 6枚 (#64-69)
      // =====================================================
      { category: 'seasonal', level: 1, name: '书香年味', requirement: '春节期间阅读', conditionType: 'spring_festival', conditionValue: 1, description: '春节阅读达人', backgroundColor: '#FFD700', iconUrl: 'gift.fill' },
      { category: 'seasonal', level: 2, name: '国庆读书', requirement: '国庆期间阅读7天', conditionType: 'national_day', conditionValue: 7, description: '国庆阅读达人', backgroundColor: '#FFD700', iconUrl: 'flag.fill' },
      { category: 'seasonal', level: 3, name: '世界读书日', requirement: '4月23日阅读超过1小时', conditionType: 'world_book_day', conditionValue: 1, description: '世界读书日参与者', backgroundColor: '#FFD700', iconUrl: 'globe.asia.australia.fill' },
      { category: 'seasonal', level: 4, name: '新年新读', requirement: '元旦当天阅读', conditionType: 'new_year', conditionValue: 1, description: '新年第一读', backgroundColor: '#FFD700', iconUrl: 'sparkler.fill' },
      { category: 'seasonal', level: 5, name: '月圆书香', requirement: '中秋节阅读', conditionType: 'mid_autumn', conditionValue: 1, description: '中秋阅读达人', backgroundColor: '#FFD700', iconUrl: 'moon.fill' },
      { category: 'seasonal', level: 6, name: '暑期阅读', requirement: '暑假期间读完20本书', conditionType: 'summer_reading', conditionValue: 20, description: '暑期阅读冠军', backgroundColor: '#FFD700', iconUrl: 'sun.max.fill' },

      // =====================================================
      // 10. 里程碑 (Milestone) - 4枚 (#70-73)
      // =====================================================
      { category: 'milestone', level: 1, name: '新旅程', requirement: '注册成为书邮会员', conditionType: 'new_user', conditionValue: 1, description: '欢迎加入书邮！', backgroundColor: '#FFD700', iconUrl: 'flag.checkered', tier: 'gold', rarity: 'epic', xpValue: 100, lore: '欢迎来到书邮的世界！每一位读者都是知识殿堂的贵宾，愿你的阅读之旅充满惊喜与收获。' },
      { category: 'milestone', level: 2, name: '第一本书', requirement: '读完第一本书', conditionType: 'first_book', conditionValue: 1, description: '阅读之旅开始', backgroundColor: '#CD7F32', iconUrl: 'book.fill', tier: 'bronze', rarity: 'common', xpValue: 50, lore: '千里之行，始于足下。完成你的第一本书，就是开启了通往无限知识的大门。' },
      { category: 'milestone', level: 3, name: '第一评', requirement: '发表第一条书评', conditionType: 'first_review', conditionValue: 1, description: '分享你的观点', backgroundColor: '#CD7F32', iconUrl: 'pencil.and.outline', tier: 'bronze', rarity: 'common', xpValue: 50, lore: '每一个观点都有价值，你的第一条书评是与世界分享智慧的开始。' },
      { category: 'milestone', level: 4, name: '第一次分享', requirement: '第一次分享阅读动态', conditionType: 'first_share', conditionValue: 1, description: '分享阅读乐趣', backgroundColor: '#CD7F32', iconUrl: 'arrowshape.turn.up.right.fill', tier: 'bronze', rarity: 'common', xpValue: 50, lore: '好书共读，乐趣倍增。第一次分享，是你成为阅读传播者的第一步。' },

      // =====================================================
      // 11. 阅读速度 (Speed Reader) - 6枚 (#74-79)
      // =====================================================
      { category: 'speed_reader', level: 1, name: '闪电侠', requirement: '1小时内读完一本书', conditionType: 'books_in_hour', conditionValue: 1, description: '极速阅读', backgroundColor: '#71797E', iconUrl: 'bolt.fill' },
      { category: 'speed_reader', level: 2, name: '疾风行者', requirement: '一天内读完3本书', conditionType: 'books_in_day', conditionValue: 3, description: '日读多本', backgroundColor: '#CD7F32', iconUrl: 'wind' },
      { category: 'speed_reader', level: 3, name: '光速读者', requirement: '一周内读完10本书', conditionType: 'books_in_week', conditionValue: 10, description: '周读十本', backgroundColor: '#C0C0C0', iconUrl: 'hare.fill' },
      { category: 'speed_reader', level: 4, name: '时间大师', requirement: '一月内读完30本书', conditionType: 'books_in_month', conditionValue: 30, description: '月读三十', backgroundColor: '#FFD700', iconUrl: 'clock.badge.checkmark.fill' },
      { category: 'speed_reader', level: 5, name: '阅读机器', requirement: '一年内读完200本书', conditionType: 'books_in_year', conditionValue: 200, description: '年读两百', backgroundColor: '#E5E4E2', iconUrl: 'gearshape.fill' },
      { category: 'speed_reader', level: 6, name: '超光速', requirement: '一年内读完500本书', conditionType: 'books_in_year', conditionValue: 500, description: '年读五百', backgroundColor: '#B9F2FF', iconUrl: 'burst.fill' },

      // =====================================================
      // 12. 收藏系列 (Collection) - 5枚 (#80-84)
      // =====================================================
      { category: 'collector', level: 1, name: '收藏家', requirement: '收藏10本书', conditionType: 'collection_count', conditionValue: 10, description: '开始收藏', backgroundColor: '#71797E', iconUrl: 'bookmark.fill' },
      { category: 'collector', level: 2, name: '珍藏者', requirement: '收藏50本书', conditionType: 'collection_count', conditionValue: 50, description: '珍藏达人', backgroundColor: '#CD7F32', iconUrl: 'bookmark.fill' },
      { category: 'collector', level: 3, name: '图书馆员', requirement: '收藏100本书', conditionType: 'collection_count', conditionValue: 100, description: '百书收藏', backgroundColor: '#C0C0C0', iconUrl: 'building.columns.fill' },
      { category: 'collector', level: 4, name: '书库守护', requirement: '收藏500本书', conditionType: 'collection_count', conditionValue: 500, description: '书库管理者', backgroundColor: '#FFD700', iconUrl: 'books.vertical.fill' },
      { category: 'collector', level: 5, name: '藏书大师', requirement: '收藏1000本书', conditionType: 'collection_count', conditionValue: 1000, description: '千书收藏家', backgroundColor: '#E5E4E2', iconUrl: 'crown.fill' },

      // =====================================================
      // 13. 更多类型徽章 (More Genre) - 6枚 (#85-90)
      // =====================================================
      { category: 'genre', level: 13, name: '浪漫主义', requirement: '读完10本言情/浪漫小说', conditionType: 'genre_fiction', conditionValue: 10, description: '爱情故事爱好者', backgroundColor: '#FFB6C1', iconUrl: 'heart.text.square.fill' },
      { category: 'genre', level: 14, name: '悬疑大师', requirement: '读完10本悬疑/推理小说', conditionType: 'genre_fiction', conditionValue: 10, description: '推理达人', backgroundColor: '#4B0082', iconUrl: 'magnifyingglass' },
      { category: 'genre', level: 15, name: '奇幻冒险', requirement: '读完10本奇幻/冒险小说', conditionType: 'genre_fiction', conditionValue: 10, description: '奇幻世界探索者', backgroundColor: '#9932CC', iconUrl: 'wand.and.stars' },
      { category: 'genre', level: 16, name: '诗词雅客', requirement: '读完10本诗歌/散文', conditionType: 'genre_fiction', conditionValue: 10, description: '诗词爱好者', backgroundColor: '#20B2AA', iconUrl: 'leaf.fill' },
      { category: 'genre', level: 17, name: '科普达人', requirement: '读完10本科普书籍', conditionType: 'genre_tech', conditionValue: 10, description: '科普知识传播者', backgroundColor: '#1E90FF', iconUrl: 'lightbulb.fill' },
      { category: 'genre', level: 18, name: '教育先锋', requirement: '读完10本教育类书籍', conditionType: 'genre_psychology', conditionValue: 10, description: '教育理念探索者', backgroundColor: '#32CD32', iconUrl: 'graduationcap.fill' },

      // =====================================================
      // 14. 坚持与恢复 (Persistence & Recovery) - 5枚 (#91-95)
      // =====================================================
      { category: 'persistence', level: 1, name: '王者归来', requirement: '中断30天后重新连续阅读7天', conditionType: 'streak_recovery', conditionValue: 7, description: '重拾阅读习惯', backgroundColor: '#C0C0C0', iconUrl: 'arrow.uturn.up.circle.fill' },
      { category: 'persistence', level: 2, name: '浴火重生', requirement: '中断60天后重新连续阅读30天', conditionType: 'streak_recovery', conditionValue: 30, description: '强势回归', backgroundColor: '#FFD700', iconUrl: 'flame.circle.fill' },
      { category: 'persistence', level: 3, name: '坚如磐石', requirement: '全年无间断阅读', conditionType: 'year_no_break', conditionValue: 365, description: '365天不间断', backgroundColor: '#E5E4E2', iconUrl: 'shield.fill' },
      { category: 'persistence', level: 4, name: '风雨无阻', requirement: '连续阅读期间经历10个重大节日', conditionType: 'holidays_reading', conditionValue: 10, description: '节日也在阅读', backgroundColor: '#FFD700', iconUrl: 'cloud.rain.fill' },
      { category: 'persistence', level: 5, name: '永不言弃', requirement: '3次中断后都成功恢复并保持30天+', conditionType: 'streak_recovery', conditionValue: 90, description: '不屈不挠', backgroundColor: '#B9F2FF', iconUrl: 'heart.circle.fill' },

      // =====================================================
      // 15. 系列完成 (Series Completion) - 5枚 (#96-100)
      // =====================================================
      { category: 'series', level: 1, name: '系列追随者', requirement: '完成1个书籍系列', conditionType: 'series_completed', conditionValue: 1, description: '追完一个系列', backgroundColor: '#CD7F32', iconUrl: 'text.badge.checkmark' },
      { category: 'series', level: 2, name: '系列收割机', requirement: '完成3个书籍系列', conditionType: 'series_completed', conditionValue: 3, description: '系列爱好者', backgroundColor: '#C0C0C0', iconUrl: 'rectangle.stack.fill' },
      { category: 'series', level: 3, name: '系列专家', requirement: '完成5个书籍系列', conditionType: 'series_completed', conditionValue: 5, description: '系列达人', backgroundColor: '#FFD700', iconUrl: 'rectangle.stack.badge.plus' },
      { category: 'series', level: 4, name: '系列王者', requirement: '完成10个书籍系列', conditionType: 'series_completed', conditionValue: 10, description: '系列征服者', backgroundColor: '#E5E4E2', iconUrl: 'crown.fill' },
      { category: 'series', level: 5, name: '全系列大师', requirement: '完成20个书籍系列', conditionType: 'series_completed', conditionValue: 20, description: '系列终结者', backgroundColor: '#B9F2FF', iconUrl: 'trophy.fill' },
    ]

    // Insert only missing badges
    let addedCount = 0
    for (const badge of defaultBadges) {
      const key = `${badge.category}-${badge.level}-${badge.conditionType}`
      if (!existingKeys.has(key)) {
        await db.insert(badges).values(badge)
        addedCount++
        console.log(`Added badge: ${badge.name}`)
      }
    }

    if (addedCount > 0) {
      console.log(`Added ${addedCount} new badges`)
    } else {
      console.log('All badges already exist')
    }
  }
}

export const badgeService = new BadgeService()
