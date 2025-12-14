/**
 * Badge Models
 * Data models for the badge/achievement system
 */

import Foundation
import SwiftUI

// MARK: - Badge Category
enum BadgeCategory: String, Codable, CaseIterable {
    case readingStreak = "reading_streak"
    case readingDuration = "reading_duration"
    case readingDays = "reading_days"
    case booksFinished = "books_finished"
    case weeklyChallenge = "weekly_challenge"
    case monthlyChallenge = "monthly_challenge"
    case social = "social"
    case special = "special"
    // New categories for more badge variety
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case speedReader = "speed_reader"
    case reviewer = "reviewer"
    case collector = "collector"
    case explorer = "explorer"
    case milestone = "milestone"
    case seasonal = "seasonal"

    var displayName: String {
        switch self {
        case .readingStreak: return "Reading Streak"
        case .readingDuration: return "Reading Time"
        case .readingDays: return "Reading Days"
        case .booksFinished: return "Books Finished"
        case .weeklyChallenge: return "Weekly Challenge"
        case .monthlyChallenge: return "Monthly Challenge"
        case .social: return "Social"
        case .special: return "Special"
        case .earlyBird: return "Early Bird"
        case .nightOwl: return "Night Owl"
        case .speedReader: return "Speed Reader"
        case .reviewer: return "Reviewer"
        case .collector: return "Collector"
        case .explorer: return "Explorer"
        case .milestone: return "Milestone"
        case .seasonal: return "Seasonal"
        }
    }

    var icon: String {
        switch self {
        case .readingStreak: return "flame.fill"
        case .readingDuration: return "clock.fill"
        case .readingDays: return "calendar"
        case .booksFinished: return "book.closed.fill"
        case .weeklyChallenge: return "star.fill"
        case .monthlyChallenge: return "crown.fill"
        case .social: return "person.2.fill"
        case .special: return "sparkles"
        case .earlyBird: return "sunrise.fill"
        case .nightOwl: return "moon.stars.fill"
        case .speedReader: return "hare.fill"
        case .reviewer: return "text.bubble.fill"
        case .collector: return "rectangle.stack.fill"
        case .explorer: return "safari.fill"
        case .milestone: return "flag.checkered"
        case .seasonal: return "leaf.fill"
        }
    }

    /// Badge category color for consistent styling across the app
    var color: Color {
        switch self {
        case .readingStreak: return .orange
        case .readingDuration: return .blue
        case .readingDays: return .green
        case .booksFinished: return .purple
        case .weeklyChallenge: return .cyan
        case .monthlyChallenge: return .yellow
        case .social: return .pink
        case .special: return .indigo
        case .earlyBird: return Color(red: 1.0, green: 0.6, blue: 0.2)  // Warm sunrise
        case .nightOwl: return Color(red: 0.3, green: 0.3, blue: 0.6)   // Deep night blue
        case .speedReader: return Color(red: 0.2, green: 0.8, blue: 0.4) // Fast green
        case .reviewer: return Color(red: 0.4, green: 0.7, blue: 0.9)   // Sky blue
        case .collector: return Color(red: 0.8, green: 0.5, blue: 0.2)  // Bronze
        case .explorer: return Color(red: 0.2, green: 0.6, blue: 0.5)   // Teal
        case .milestone: return Color(red: 0.9, green: 0.7, blue: 0.1)  // Gold
        case .seasonal: return Color(red: 0.6, green: 0.8, blue: 0.3)   // Fresh green
        }
    }
}

// MARK: - Badge
struct Badge: Identifiable, Codable {
    let id: Int
    let category: String
    let level: Int
    let name: String
    let description: String?
    let requirement: String?
    let iconUrl: String?
    let backgroundColor: String?
    let earnedCount: Int

    var badgeCategory: BadgeCategory {
        BadgeCategory(rawValue: category) ?? .special
    }
}

// MARK: - Earned Badge
struct EarnedBadge: Identifiable, Codable {
    let id: Int
    let category: String
    let level: Int
    let name: String
    let description: String?
    let requirement: String?
    let iconUrl: String?
    let backgroundColor: String?
    let earnedAt: String
    let earnedCount: Int

    var earnedDate: Date? {
        ISO8601DateFormatter().date(from: earnedAt)
    }

    var badgeCategory: BadgeCategory {
        BadgeCategory(rawValue: category) ?? .special
    }
}

// MARK: - Badge Progress
struct BadgeProgress: Codable {
    let current: Int
    let target: Int
    let percentage: Double
    let remaining: String
}

// MARK: - Badge With Progress
struct BadgeWithProgress: Identifiable, Codable {
    let badge: Badge
    let progress: BadgeProgress

    var id: Int { badge.id }
}

// MARK: - Category Summary
struct CategorySummary: Codable {
    let earned: Int
    let total: Int

    var percentage: Double {
        guard total > 0 else { return 0 }
        return Double(earned) / Double(total) * 100
    }
}

// MARK: - User Badges Response
struct UserBadgesResponse: Codable {
    let earned: [EarnedBadge]
    let inProgress: [BadgeWithProgress]
    let categories: [String: CategorySummary]
}

// MARK: - All Badges Response
typealias AllBadgesResponse = [String: [Badge]]

// MARK: - New Badges Response
struct NewBadgesResponse: Codable {
    let newBadges: [EarnedBadge]
}
