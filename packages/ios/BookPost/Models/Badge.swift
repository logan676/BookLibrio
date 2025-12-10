/**
 * Badge Models
 * Data models for the badge/achievement system
 */

import Foundation

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
