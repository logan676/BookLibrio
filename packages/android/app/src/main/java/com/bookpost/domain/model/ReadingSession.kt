package com.bookpost.domain.model

import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Reading Session Models
 * Matches iOS ReadingSession.swift structure
 */

@Serializable
data class ReadingSession(
    val id: Int,
    val bookId: Int,
    val bookType: String,
    val startTime: String,
    val durationSeconds: Int
) {
    val formattedDuration: String
        get() {
            val hours = durationSeconds / 3600
            val minutes = (durationSeconds % 3600) / 60
            return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
        }
}

// Request/Response DTOs

@Serializable
data class StartSessionRequest(
    val bookId: Int,
    val bookType: String,
    val position: String? = null,
    val chapterIndex: Int? = null,
    val deviceType: String? = "android",
    val deviceId: String? = null
)

@Serializable
data class StartSessionResponse(
    val sessionId: Int,
    val startTime: String
)

@Serializable
data class HeartbeatRequest(
    val currentPosition: String? = null,
    val chapterIndex: Int? = null,
    val pagesRead: Int? = null
)

@Serializable
data class HeartbeatResponse(
    val sessionId: Int,
    val durationSeconds: Int,
    val todayDuration: Int,
    val totalBookDuration: Double,
    val isPaused: Boolean? = null
) {
    val totalBookDurationSeconds: Int
        get() = totalBookDuration.toInt()
}

@Serializable
data class PauseResumeResponse(
    val sessionId: Int,
    val isPaused: Boolean
)

@Serializable
data class EndSessionRequest(
    val endPosition: String? = null,
    val chapterIndex: Int? = null,
    val pagesRead: Int? = null
)

@Serializable
data class Milestone(
    val type: String,
    val value: Int,
    val title: String
) {
    val id: String get() = "${type}_$value"
}

@Serializable
data class EndSessionResponse(
    val sessionId: Int,
    val durationSeconds: Int,
    val totalBookDuration: Double,
    val todayDuration: Int,
    val milestonesAchieved: List<Milestone> = emptyList()
) {
    val totalBookDurationSeconds: Int
        get() = totalBookDuration.toInt()
}

@Serializable
data class TodayDurationResponse(
    val todayDuration: Int,
    val formattedDuration: String
)

// Reading Goal Models

@Serializable
data class DailyGoal(
    val id: Int,
    val targetMinutes: Int,
    val currentMinutes: Int,
    val progress: Int,
    val isCompleted: Boolean
) {
    val progressPercentage: Float
        get() = progress / 100f

    val remainingMinutes: Int
        get() = maxOf(0, targetMinutes - currentMinutes)

    val formattedTarget: String
        get() = formatMinutes(targetMinutes)

    val formattedCurrent: String
        get() = formatMinutes(currentMinutes)

    private fun formatMinutes(minutes: Int): String {
        return if (minutes >= 60) {
            val hours = minutes / 60
            val mins = minutes % 60
            if (mins > 0) "${hours}h ${mins}m" else "${hours}h"
        } else {
            "${minutes}m"
        }
    }
}

@Serializable
data class StreakInfo(
    val current: Int,
    val max: Int
)

@Serializable
data class DailyGoalResponse(
    val hasGoal: Boolean,
    val goal: DailyGoal? = null,
    val streak: StreakInfo
)

@Serializable
data class SetGoalRequest(
    val targetMinutes: Int
)

@Serializable
data class SetGoalResponse(
    val targetMinutes: Int,
    val message: String
)

enum class GoalPreset(
    val minutes: Int,
    val label: String,
    val description: String
) {
    LIGHT(15, "15 分钟", "轻松阅读"),
    MODERATE(30, "30 分钟", "养成习惯"),
    DEDICATED(60, "1 小时", "专注阅读"),
    INTENSIVE(90, "1.5 小时", "深度阅读")
}

// Active Session State
data class ActiveSessionState(
    val sessionId: Int? = null,
    val bookId: Int? = null,
    val bookType: String? = null,
    val isActive: Boolean = false,
    val isPaused: Boolean = false,
    val durationSeconds: Int = 0,
    val todayDuration: Int = 0,
    val startTime: Long = 0L
)
