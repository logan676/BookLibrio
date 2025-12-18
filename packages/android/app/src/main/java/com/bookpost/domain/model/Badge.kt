package com.bookpost.domain.model

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import kotlinx.serialization.Serializable

/**
 * Badge Category Enum
 * Defines the 16 badge categories matching iOS implementation
 */
enum class BadgeCategory(val value: String) {
    READING_STREAK("reading_streak"),
    READING_DURATION("reading_duration"),
    READING_DAYS("reading_days"),
    BOOKS_FINISHED("books_finished"),
    WEEKLY_CHALLENGE("weekly_challenge"),
    MONTHLY_CHALLENGE("monthly_challenge"),
    SOCIAL("social"),
    SPECIAL("special"),
    EARLY_BIRD("early_bird"),
    NIGHT_OWL("night_owl"),
    SPEED_READER("speed_reader"),
    REVIEWER("reviewer"),
    COLLECTOR("collector"),
    EXPLORER("explorer"),
    MILESTONE("milestone"),
    SEASONAL("seasonal");

    val displayName: String
        get() = when (this) {
            READING_STREAK -> "阅读连续"
            READING_DURATION -> "阅读时长"
            READING_DAYS -> "阅读天数"
            BOOKS_FINISHED -> "读完书籍"
            WEEKLY_CHALLENGE -> "周挑战"
            MONTHLY_CHALLENGE -> "月挑战"
            SOCIAL -> "社交"
            SPECIAL -> "特殊"
            EARLY_BIRD -> "早起鸟"
            NIGHT_OWL -> "夜猫子"
            SPEED_READER -> "速读者"
            REVIEWER -> "评论家"
            COLLECTOR -> "收藏家"
            EXPLORER -> "探索者"
            MILESTONE -> "里程碑"
            SEASONAL -> "季节性"
        }

    val icon: String
        get() = when (this) {
            READING_STREAK -> "local_fire_department"
            READING_DURATION -> "schedule"
            READING_DAYS -> "calendar_month"
            BOOKS_FINISHED -> "menu_book"
            WEEKLY_CHALLENGE -> "star"
            MONTHLY_CHALLENGE -> "workspace_premium"
            SOCIAL -> "group"
            SPECIAL -> "auto_awesome"
            EARLY_BIRD -> "wb_sunny"
            NIGHT_OWL -> "nightlight"
            SPEED_READER -> "speed"
            REVIEWER -> "rate_review"
            COLLECTOR -> "collections_bookmark"
            EXPLORER -> "explore"
            MILESTONE -> "flag"
            SEASONAL -> "eco"
        }

    val color: Color
        get() = when (this) {
            READING_STREAK -> Color(0xFFFF9800)  // Orange
            READING_DURATION -> Color(0xFF2196F3)  // Blue
            READING_DAYS -> Color(0xFF4CAF50)  // Green
            BOOKS_FINISHED -> Color(0xFF9C27B0)  // Purple
            WEEKLY_CHALLENGE -> Color(0xFF00BCD4)  // Cyan
            MONTHLY_CHALLENGE -> Color(0xFFFFEB3B)  // Yellow
            SOCIAL -> Color(0xFFE91E63)  // Pink
            SPECIAL -> Color(0xFF3F51B5)  // Indigo
            EARLY_BIRD -> Color(0xFFFF9966)  // Warm sunrise
            NIGHT_OWL -> Color(0xFF4D4D99)  // Deep night blue
            SPEED_READER -> Color(0xFF33CC66)  // Fast green
            REVIEWER -> Color(0xFF66B2E5)  // Sky blue
            COLLECTOR -> Color(0xFFCC8033)  // Bronze
            EXPLORER -> Color(0xFF339980)  // Teal
            MILESTONE -> Color(0xFFE5B319)  // Gold
            SEASONAL -> Color(0xFF99CC4D)  // Fresh green
        }

    val iconVector: ImageVector
        get() = when (this) {
            READING_STREAK -> Icons.Default.LocalFireDepartment
            READING_DURATION -> Icons.Default.Schedule
            READING_DAYS -> Icons.Default.CalendarMonth
            BOOKS_FINISHED -> Icons.AutoMirrored.Filled.MenuBook
            WEEKLY_CHALLENGE -> Icons.Default.Star
            MONTHLY_CHALLENGE -> Icons.Default.WorkspacePremium
            SOCIAL -> Icons.Default.Group
            SPECIAL -> Icons.Default.AutoAwesome
            EARLY_BIRD -> Icons.Default.WbSunny
            NIGHT_OWL -> Icons.Default.DarkMode
            SPEED_READER -> Icons.Default.Speed
            REVIEWER -> Icons.Default.RateReview
            COLLECTOR -> Icons.Default.CollectionsBookmark
            EXPLORER -> Icons.Default.Explore
            MILESTONE -> Icons.Default.Flag
            SEASONAL -> Icons.Default.Eco
        }

    companion object {
        fun fromString(value: String): BadgeCategory {
            return entries.find { it.value == value } ?: SPECIAL
        }
    }
}

/**
 * Badge data class
 */
@Serializable
data class Badge(
    val id: Int,
    val category: String,
    val level: Int,
    val name: String,
    val description: String? = null,
    val requirement: String? = null,
    val iconUrl: String? = null,
    val backgroundColor: String? = null,
    val earnedCount: Int = 0
) {
    val badgeCategory: BadgeCategory
        get() = BadgeCategory.fromString(category)
}

/**
 * Earned Badge data class
 */
@Serializable
data class EarnedBadge(
    val id: Int,
    val category: String,
    val level: Int,
    val name: String,
    val description: String? = null,
    val requirement: String? = null,
    val iconUrl: String? = null,
    val backgroundColor: String? = null,
    val earnedAt: String,
    val earnedCount: Int = 0
) {
    val badgeCategory: BadgeCategory
        get() = BadgeCategory.fromString(category)
}

/**
 * Badge Progress
 */
@Serializable
data class BadgeProgress(
    val current: Int,
    val target: Int,
    val percentage: Double,
    val remaining: String
)

/**
 * Badge with Progress
 */
@Serializable
data class BadgeWithProgress(
    val badge: Badge,
    val progress: BadgeProgress
)

/**
 * Category Summary
 */
@Serializable
data class CategorySummary(
    val earned: Int,
    val total: Int
) {
    val percentage: Double
        get() = if (total > 0) earned.toDouble() / total * 100 else 0.0
}

/**
 * User Badges Response
 */
@Serializable
data class UserBadgesResponse(
    val earned: List<EarnedBadge>,
    val inProgress: List<BadgeWithProgress>,
    val categories: Map<String, CategorySummary>
)

/**
 * New Badges Response
 */
@Serializable
data class NewBadgesResponse(
    val newBadges: List<EarnedBadge>
)

/**
 * Sealed class for badge display
 */
sealed class BadgeItem {
    abstract val id: Int
    abstract val name: String
    abstract val description: String?
    abstract val requirement: String?
    abstract val level: Int
    abstract val badgeCategory: BadgeCategory
    abstract val earnedCount: Int

    data class Earned(val badge: EarnedBadge) : BadgeItem() {
        override val id = badge.id
        override val name = badge.name
        override val description = badge.description
        override val requirement = badge.requirement
        override val level = badge.level
        override val badgeCategory = badge.badgeCategory
        override val earnedCount = badge.earnedCount
        val earnedAt = badge.earnedAt
    }

    data class InProgress(val badgeWithProgress: BadgeWithProgress) : BadgeItem() {
        override val id = badgeWithProgress.badge.id
        override val name = badgeWithProgress.badge.name
        override val description = badgeWithProgress.badge.description
        override val requirement = badgeWithProgress.badge.requirement
        override val level = badgeWithProgress.badge.level
        override val badgeCategory = badgeWithProgress.badge.badgeCategory
        override val earnedCount = badgeWithProgress.badge.earnedCount
        val progress = badgeWithProgress.progress
    }
}

/**
 * Rarity enum based on earned count
 */
enum class BadgeRarity(val displayName: String, val color: Color) {
    LEGENDARY("传说", Color(0xFFFF9800)),
    EPIC("史诗", Color(0xFF9C27B0)),
    RARE("稀有", Color(0xFF2196F3)),
    UNCOMMON("不常见", Color(0xFF4CAF50)),
    COMMON("普通", Color(0xFF9E9E9E));

    companion object {
        fun fromEarnedCount(count: Int): BadgeRarity {
            return when {
                count < 100 -> LEGENDARY
                count < 500 -> EPIC
                count < 2000 -> RARE
                count < 10000 -> UNCOMMON
                else -> COMMON
            }
        }
    }
}
