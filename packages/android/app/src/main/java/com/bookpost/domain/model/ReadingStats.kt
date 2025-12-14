package com.bookpost.domain.model

import androidx.compose.ui.graphics.Color

/**
 * Reading Statistics Models
 * Data models for reading statistics and analytics
 */

// MARK: - Statistics Dimension
enum class StatsDimension(val value: String) {
    WEEK("week"),
    MONTH("month"),
    YEAR("year"),
    TOTAL("total"),
    CALENDAR("calendar");

    val displayName: String
        get() = when (this) {
            WEEK -> "本周"
            MONTH -> "本月"
            YEAR -> "年度"
            TOTAL -> "总计"
            CALENDAR -> "日历"
        }

    companion object {
        fun fromValue(value: String): StatsDimension {
            return entries.find { it.value == value } ?: WEEK
        }
    }
}

// MARK: - Date Range
data class DateRange(
    val start: String,
    val end: String
)

// MARK: - Day Duration
data class DayDuration(
    val date: String,
    val duration: Int,
    val dayOfWeek: String
) {
    val formattedDuration: String
        get() {
            val hours = duration / 3600
            val minutes = (duration % 3600) / 60
            return when {
                hours > 0 -> "${hours}h ${minutes}m"
                minutes > 0 -> "${minutes}m"
                else -> "0m"
            }
        }
}

// MARK: - Week Stats Summary
data class WeekStatsSummary(
    val totalDuration: Int,
    val dailyAverage: Int,
    val comparisonChange: Double,
    val friendRanking: Int?
) {
    val formattedTotalDuration: String
        get() {
            val hours = totalDuration / 3600
            val minutes = (totalDuration % 3600) / 60
            return "${hours}h ${minutes}m"
        }

    val formattedDailyAverage: String
        get() {
            val hours = dailyAverage / 3600
            val minutes = (dailyAverage % 3600) / 60
            return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
        }

    val comparisonChangeText: String
        get() {
            val absChange = kotlin.math.abs(comparisonChange)
            val direction = if (comparisonChange >= 0) "↑" else "↓"
            return "$direction ${String.format("%.1f", absChange)}%"
        }

    val isPositiveChange: Boolean
        get() = comparisonChange >= 0
}

// MARK: - Reading Records
data class ReadingRecords(
    val booksRead: Int,
    val readingDays: Int,
    val notesCount: Int,
    val highlightsCount: Int
)

// MARK: - Week Stats Response
data class WeekStatsResponse(
    val dimension: String,
    val dateRange: DateRange,
    val summary: WeekStatsSummary,
    val readingRecords: ReadingRecords,
    val durationByDay: List<DayDuration>
)

// MARK: - Month Stats Response (same structure as week)
typealias MonthStatsResponse = WeekStatsResponse

// MARK: - Total Stats Summary
data class TotalStatsSummary(
    val totalDuration: Int,
    val totalDays: Int,
    val currentStreak: Int,
    val longestStreak: Int,
    val booksRead: Int,
    val booksFinished: Int
) {
    val formattedTotalDuration: String
        get() {
            val hours = totalDuration / 3600
            return "${hours}小时"
        }

    val totalHours: Int
        get() = totalDuration / 3600
}

// MARK: - Total Stats Response
data class TotalStatsResponse(
    val dimension: String,
    val summary: TotalStatsSummary
)

// MARK: - Calendar Day
data class CalendarDay(
    val date: String,
    val duration: Int,
    val hasReading: Boolean
) {
    val dayNumber: Int
        get() {
            val parts = date.split("-")
            return if (parts.size == 3) parts[2].toIntOrNull() ?: 0 else 0
        }
}

// MARK: - Reading Milestone
data class ReadingMilestone(
    val id: Int,
    val date: String?,
    val type: String,
    val title: String,
    val value: Int?,
    val bookTitle: String?
)

// MARK: - Calendar Stats Response
data class CalendarStatsResponse(
    val dimension: String,
    val year: Int,
    val month: Int,
    val calendarDays: List<CalendarDay>,
    val milestones: List<ReadingMilestone>
)

// MARK: - Month Duration (for year stats)
data class MonthDuration(
    val month: Int,
    val duration: Int,
    val readingDays: Int
)

// MARK: - Year Stats Summary
data class YearStatsSummary(
    val totalDuration: Int,
    val monthlyAverage: Int,
    val totalReadingDays: Int
) {
    val totalHours: Int
        get() = totalDuration / 3600
}

// MARK: - Year Stats Response
data class YearStatsResponse(
    val dimension: String,
    val year: Int,
    val summary: YearStatsSummary,
    val durationByMonth: List<MonthDuration>
)
