/**
 * Badges View
 * Displays user's earned and in-progress badges
 */

import SwiftUI

struct BadgesView: View {
    @StateObject private var viewModel = BadgesViewModel()
    @State private var selectedCategory: BadgeCategory?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header summary
                badgeSummaryCard

                // Category pills
                categorySelector

                // Badges list
                if let category = selectedCategory {
                    categoryBadgesSection(category)
                } else {
                    allBadgesSection
                }
            }
            .padding()
        }
        .navigationTitle("My Badges")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadBadges()
        }
        .refreshable {
            await viewModel.loadBadges()
        }
        .alert("New Badge Earned!", isPresented: $viewModel.showNewBadgeAlert) {
            Button("Awesome!") {
                viewModel.showNewBadgeAlert = false
            }
        } message: {
            Text(viewModel.newBadges.map { $0.name }.joined(separator: ", "))
        }
    }

    // MARK: - Summary Card
    private var badgeSummaryCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Badges Earned")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("\(viewModel.totalEarned)")
                        .font(.system(size: 36, weight: .bold))
                        + Text(" / \(viewModel.totalBadges)")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: viewModel.earnedPercentage / 100)
                        .stroke(Color.orange, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))

                    Text("\(Int(viewModel.earnedPercentage))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .frame(width: 60, height: 60)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    // MARK: - Category Selector
    private var categorySelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All categories pill
                categoryPill(nil, name: "All")

                ForEach(viewModel.sortedCategories, id: \.self) { category in
                    categoryPill(category, name: category.displayName)
                }
            }
        }
    }

    private func categoryPill(_ category: BadgeCategory?, name: String) -> some View {
        let isSelected = selectedCategory == category

        return Button {
            withAnimation {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 6) {
                if let category = category {
                    Image(systemName: category.icon)
                        .font(.caption)
                }
                Text(name)
                    .font(.subheadline)

                if let category = category,
                   let summary = viewModel.categorySummaries[category.rawValue] {
                    Text("\(summary.earned)/\(summary.total)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.orange : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }

    // MARK: - All Badges Section
    private var allBadgesSection: some View {
        VStack(spacing: 24) {
            // Earned badges
            if !viewModel.earnedBadges.isEmpty {
                badgeSection(
                    title: "Earned",
                    badges: viewModel.earnedBadges.map { .earned($0) }
                )
            }

            // In progress badges
            if !viewModel.inProgressBadges.isEmpty {
                badgeSection(
                    title: "In Progress",
                    badges: viewModel.inProgressBadges.map { .inProgress($0) }
                )
            }
        }
    }

    private func categoryBadgesSection(_ category: BadgeCategory) -> some View {
        let earned = viewModel.earnedBadges(for: category)
        let inProgress = viewModel.inProgressBadges(for: category)

        return VStack(spacing: 24) {
            if !earned.isEmpty {
                badgeSection(
                    title: "Earned",
                    badges: earned.map { .earned($0) }
                )
            }

            if !inProgress.isEmpty {
                badgeSection(
                    title: "In Progress",
                    badges: inProgress.map { .inProgress($0) }
                )
            }

            if earned.isEmpty && inProgress.isEmpty {
                Text("No badges in this category yet")
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
    }

    private func badgeSection(title: String, badges: [BadgeItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(badges) { badge in
                    BadgeCardView(badge: badge)
                }
            }
        }
    }
}

// MARK: - Badge Item (for unified display)
enum BadgeItem: Identifiable {
    case earned(EarnedBadge)
    case inProgress(BadgeWithProgress)

    var id: Int {
        switch self {
        case .earned(let badge): return badge.id
        case .inProgress(let badge): return badge.id
        }
    }
}

// MARK: - Badge Card View
struct BadgeCardView: View {
    let badge: BadgeItem

    var body: some View {
        VStack(spacing: 8) {
            // Badge icon
            ZStack {
                Circle()
                    .fill(backgroundColor)
                    .frame(width: 60, height: 60)

                Image(systemName: iconName)
                    .font(.title2)
                    .foregroundColor(.white)

                // Progress ring for in-progress badges
                if case .inProgress(let b) = badge {
                    Circle()
                        .trim(from: 0, to: b.progress.percentage / 100)
                        .stroke(Color.orange, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .frame(width: 66, height: 66)
                        .rotationEffect(.degrees(-90))
                }
            }

            // Badge name
            Text(name)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .lineLimit(2)

            // Progress or earned info
            if case .inProgress(let b) = badge {
                Text(b.progress.remaining)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            } else if case .earned(let b) = badge {
                if let date = b.earnedDate {
                    Text(date, style: .date)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .opacity(isEarned ? 1 : 0.6)
    }

    private var isEarned: Bool {
        if case .earned = badge { return true }
        return false
    }

    private var name: String {
        switch badge {
        case .earned(let b): return b.name
        case .inProgress(let b): return b.badge.name
        }
    }

    private var iconName: String {
        let category: BadgeCategory
        switch badge {
        case .earned(let b): category = b.badgeCategory
        case .inProgress(let b): category = b.badge.badgeCategory
        }
        return category.icon
    }

    private var backgroundColor: Color {
        switch badge {
        case .earned: return .orange
        case .inProgress: return .gray
        }
    }
}

#Preview {
    NavigationStack {
        BadgesView()
    }
}
