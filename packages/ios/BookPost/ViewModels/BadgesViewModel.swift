/**
 * Badges ViewModel
 * Manages badge data and interactions
 */

import Foundation
import Combine

@MainActor
class BadgesViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var earnedBadges: [EarnedBadge] = []
    @Published var inProgressBadges: [BadgeWithProgress] = []
    @Published var categorySummaries: [String: CategorySummary] = [:]
    @Published var isLoading = false
    @Published var error: String?
    @Published var newBadges: [EarnedBadge] = []
    @Published var showNewBadgeAlert = false

    // MARK: - Computed Properties
    var totalEarned: Int {
        earnedBadges.count
    }

    var totalBadges: Int {
        categorySummaries.values.reduce(0) { $0 + $1.total }
    }

    var earnedPercentage: Double {
        guard totalBadges > 0 else { return 0 }
        return Double(totalEarned) / Double(totalBadges) * 100
    }

    var sortedCategories: [BadgeCategory] {
        BadgeCategory.allCases.filter { categorySummaries[$0.rawValue] != nil }
    }

    // MARK: - Methods

    func loadBadges() async {
        isLoading = true
        error = nil

        do {
            let response: APIResponse<UserBadgesResponse> = try await APIClient.shared.get(
                "/user/badges"
            )

            if let data = response.data {
                earnedBadges = data.earned
                inProgressBadges = data.inProgress
                categorySummaries = data.categories
            }
        } catch {
            self.error = "加载勋章失败: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func checkForNewBadges() async {
        do {
            let response: APIResponse<NewBadgesResponse> = try await APIClient.shared.post(
                "/badges/check",
                body: EmptyBody()
            )

            if let data = response.data, !data.newBadges.isEmpty {
                newBadges = data.newBadges
                showNewBadgeAlert = true

                // Reload all badges
                await loadBadges()
            }
        } catch {
            print("Check badges failed: \(error)")
        }
    }

    func earnedBadges(for category: BadgeCategory) -> [EarnedBadge] {
        earnedBadges.filter { $0.category == category.rawValue }
    }

    func inProgressBadges(for category: BadgeCategory) -> [BadgeWithProgress] {
        inProgressBadges.filter { $0.badge.category == category.rawValue }
    }
}

// Empty body for POST requests with no body
struct EmptyBody: Codable {}
