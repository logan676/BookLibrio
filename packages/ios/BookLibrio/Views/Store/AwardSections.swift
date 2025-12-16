import SwiftUI

// MARK: - Award Enum

enum Award: String, CaseIterable {
    case pulitzer
    case booker
    case newbery

    var title: String {
        switch self {
        case .pulitzer: return L10n.Store.pulitzerTitle
        case .booker: return L10n.Store.bookerTitle
        case .newbery: return L10n.Store.newberyTitle
        }
    }

    var description: String {
        switch self {
        case .pulitzer: return L10n.Store.pulitzerDescription
        case .booker: return L10n.Store.bookerDescription
        case .newbery: return L10n.Store.newberyDescription
        }
    }

    var headerGradient: [Color] {
        switch self {
        case .pulitzer:
            // Gold/champagne textured gradient
            return [
                Color(red: 0.85, green: 0.72, blue: 0.40),
                Color(red: 0.75, green: 0.62, blue: 0.30),
                Color(red: 0.90, green: 0.78, blue: 0.45)
            ]
        case .booker:
            // Deep burgundy/maroon
            return [
                Color(red: 0.45, green: 0.12, blue: 0.18),
                Color(red: 0.55, green: 0.15, blue: 0.22),
                Color(red: 0.40, green: 0.10, blue: 0.15)
            ]
        case .newbery:
            // Warm golden/brown magical gradient
            return [
                Color(red: 0.35, green: 0.25, blue: 0.18),
                Color(red: 0.55, green: 0.40, blue: 0.25),
                Color(red: 0.75, green: 0.60, blue: 0.35)
            ]
        }
    }

    var accentColor: Color {
        switch self {
        case .pulitzer: return Color(red: 0.85, green: 0.70, blue: 0.30)
        case .booker: return Color(red: 0.85, green: 0.70, blue: 0.30) // Gold for winner badge
        case .newbery: return Color(red: 0.90, green: 0.75, blue: 0.35)
        }
    }

    var icon: String {
        switch self {
        case .pulitzer: return "medal.fill"
        case .booker: return "book.closed.fill"
        case .newbery: return "sparkles"
        }
    }
}

// MARK: - Award Category Badge (Winner/Shortlist/Gold/Honor)

struct AwardCategoryBadge: View {
    let award: Award
    let isWinner: Bool // true = Winner/Gold, false = Shortlist/Honor

    var badgeText: String {
        switch award {
        case .pulitzer:
            return isWinner ? "获奖作品" : "入围作品"
        case .booker:
            return isWinner ? "获奖作品" : "入围作品"
        case .newbery:
            return isWinner ? "金奖作品" : "荣誉作品"
        }
    }

    var badgeColor: Color {
        if isWinner {
            return Color(red: 0.85, green: 0.65, blue: 0.13) // Gold
        } else {
            return Color(red: 0.70, green: 0.70, blue: 0.72) // Silver
        }
    }

    var body: some View {
        Text(badgeText)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(badgeColor)
                    .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
            )
    }
}

// MARK: - Award Book Card View (No numbered badge, label below)

struct AwardBookCardView: View {
    let ranking: ExternalRanking
    let index: Int
    let award: Award
    let cardWidth: CGFloat = 140
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .center, spacing: 10) {
                // Book cover - clean, no badge overlay
                ZStack {
                    if let coverUrl = ranking.previewCovers?.first {
                        AsyncImage(url: URL(string: coverUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(2/3, contentMode: .fill)
                            case .failure:
                                bookPlaceholder
                            case .empty:
                                ProgressView()
                                    .frame(width: cardWidth, height: cardWidth * 1.5)
                            @unknown default:
                                bookPlaceholder
                            }
                        }
                        .frame(width: cardWidth, height: cardWidth * 1.5)
                        .cornerRadius(8)
                        .shadow(color: Color.black.opacity(0.2), radius: 8, x: 2, y: 4)
                    } else {
                        bookPlaceholder
                    }
                }

                // Award category label below book (not on cover)
                AwardCategoryBadge(award: award, isWinner: index == 0)

                // Title
                Text(ranking.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(width: cardWidth)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var bookPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.2))
            .overlay(
                Image(systemName: "book.closed.fill")
                    .resizable()
                    .scaledToFit()
                    .padding(30)
                    .foregroundColor(.gray)
            )
            .frame(width: cardWidth, height: cardWidth * 1.5)
            .cornerRadius(8)
            .shadow(color: Color.black.opacity(0.2), radius: 8, x: 2, y: 4)
    }
}

// MARK: - Gold Textured Background (Pulitzer)

struct GoldTexturedBackground: View {
    var body: some View {
        ZStack {
            // Base gold gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.85, green: 0.72, blue: 0.40),
                    Color(red: 0.78, green: 0.65, blue: 0.32),
                    Color(red: 0.90, green: 0.78, blue: 0.45)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // Subtle fabric texture overlay
            GeometryReader { geo in
                Canvas { context, size in
                    // Draw subtle vertical lines for texture
                    for x in stride(from: 0, to: size.width, by: 3) {
                        var path = Path()
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: size.height))
                        context.stroke(path, with: .color(.white.opacity(0.05)), lineWidth: 1)
                    }
                }
            }
        }
    }
}

// MARK: - Burgundy Velvet Background (Booker)

struct BurgundyVelvetBackground: View {
    var body: some View {
        ZStack {
            // Base burgundy gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.45, green: 0.10, blue: 0.15),
                    Color(red: 0.55, green: 0.15, blue: 0.20),
                    Color(red: 0.40, green: 0.08, blue: 0.12)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )

            // Velvet texture overlay
            RadialGradient(
                gradient: Gradient(colors: [
                    Color.white.opacity(0.08),
                    Color.clear
                ]),
                center: .topLeading,
                startRadius: 0,
                endRadius: 400
            )
        }
    }
}

// MARK: - Magical Starry Background (Newbery)

struct MagicalStarryBackground: View {
    var body: some View {
        ZStack {
            // Warm night sky gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.20, green: 0.15, blue: 0.25),
                    Color(red: 0.35, green: 0.25, blue: 0.20),
                    Color(red: 0.55, green: 0.40, blue: 0.25)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )

            // Stars
            GeometryReader { geo in
                ForEach(0..<20, id: \.self) { i in
                    let x = CGFloat.random(in: 0...geo.size.width)
                    let y = CGFloat.random(in: 0...geo.size.height)
                    let size = CGFloat.random(in: 2...6)
                    Circle()
                        .fill(Color.white.opacity(Double.random(in: 0.3...0.8)))
                        .frame(width: size, height: size)
                        .position(x: x, y: y)
                }
            }

            // Sparkle overlay
            Image(systemName: "sparkles")
                .font(.system(size: 60))
                .foregroundColor(Color(red: 0.95, green: 0.85, blue: 0.50).opacity(0.3))
                .offset(x: 80, y: -30)
        }
    }
}

// MARK: - Pulitzer Prize Section

struct PulitzerHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            GoldTexturedBackground()

            HStack(spacing: 16) {
                // Medal on left
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.95, green: 0.85, blue: 0.50),
                                    Color(red: 0.80, green: 0.65, blue: 0.25)
                                ]),
                                center: .center,
                                startRadius: 0,
                                endRadius: 35
                            )
                        )
                        .frame(width: 70, height: 70)
                        .shadow(color: Color.black.opacity(0.3), radius: 4, x: 2, y: 2)

                    Image(systemName: "medal.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.50, green: 0.35, blue: 0.10))
                }

                // Title on right
                VStack(alignment: .leading, spacing: 6) {
                    Text("The \(Calendar.current.component(.year, from: Date()))")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))

                    Text("Pulitzer Prize")
                        .font(.system(size: 24, weight: .bold, design: .serif))
                        .foregroundColor(.white)

                    Text("Winners")
                        .font(.system(size: 20, weight: .semibold, design: .serif))
                        .foregroundColor(.white.opacity(0.9))

                    Text("卓越的新闻与艺术成就")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                Button(action: onViewAll) {
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
        }
        .frame(height: 140)
    }
}

struct PulitzerPrizeSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            PulitzerHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .pulitzer,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Booker Prize Section

struct BookerHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            BurgundyVelvetBackground()

            VStack(spacing: 12) {
                // Booker Prize logo block
                VStack(spacing: 2) {
                    Text("THE")
                        .font(.system(size: 12, weight: .medium))
                        .tracking(4)
                    Text("BOOKER")
                        .font(.system(size: 28, weight: .bold))
                        .tracking(2)
                    Text("PRIZE")
                        .font(.system(size: 16, weight: .semibold))
                        .tracking(6)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.white.opacity(0.5), lineWidth: 1)
                )

                Text("\(Calendar.current.component(.year, from: Date()))年布克奖")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.8))

                Text("年度最佳虚构文学作品")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.6))

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(red: 0.90, green: 0.75, blue: 0.40))
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 20)
        }
        .frame(height: 200)
    }
}

struct BookerPrizeSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            BookerHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .booker,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Newbery Medal Section

struct NewberyHeaderView: View {
    let onViewAll: () -> Void

    var body: some View {
        ZStack {
            MagicalStarryBackground()

            VStack(spacing: 12) {
                // Medal with sparkle effect
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.95, green: 0.85, blue: 0.45),
                                    Color(red: 0.75, green: 0.60, blue: 0.25)
                                ]),
                                center: .center,
                                startRadius: 0,
                                endRadius: 30
                            )
                        )
                        .frame(width: 60, height: 60)
                        .shadow(color: Color(red: 0.95, green: 0.85, blue: 0.45).opacity(0.5), radius: 10, x: 0, y: 0)

                    Image(systemName: "book.fill")
                        .font(.system(size: 24))
                        .foregroundColor(Color(red: 0.45, green: 0.30, blue: 0.10))
                }

                // Title in pill-shaped container
                Text("\(Calendar.current.component(.year, from: Date()))年纽伯瑞儿童文学奖")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.2))
                    )

                Text("Newbery Medal")
                    .font(.system(size: 14, weight: .medium, design: .serif))
                    .foregroundColor(.white.opacity(0.8))

                Button(action: onViewAll) {
                    HStack(spacing: 4) {
                        Text(L10n.Store.viewMore)
                        Image(systemName: "chevron.right")
                    }
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(Color(red: 0.95, green: 0.85, blue: 0.45))
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 20)
        }
        .frame(height: 200)
    }
}

struct NewberyMedalSection: View {
    let rankings: [ExternalRanking]
    let onRankingTap: (ExternalRanking) -> Void
    let onShowAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            NewberyHeaderView(onViewAll: onShowAll)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(Array(rankings.enumerated()), id: \.element.id) { index, ranking in
                        AwardBookCardView(
                            ranking: ranking,
                            index: index,
                            award: .newbery,
                            onTap: { onRankingTap(ranking) }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(UIColor.systemBackground))
        }
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Award List View (Full List)

struct AwardListView: View {
    let award: Award
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: AwardListViewModel
    @State private var selectedRanking: ExternalRanking?

    init(award: Award) {
        self.award = award
        self._viewModel = StateObject(wrappedValue: AwardListViewModel(award: award))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    awardHeader

                    // Description card
                    descriptionCard

                    // Rankings grid
                    rankingsGrid
                }
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Store.done) {
                        dismiss()
                    }
                }
            }
            .sheet(item: $selectedRanking) { ranking in
                ExternalRankingDetailView(ranking: ranking)
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    @ViewBuilder
    private var awardHeader: some View {
        switch award {
        case .pulitzer:
            GoldTexturedBackground()
                .frame(height: 160)
                .overlay(
                    VStack(spacing: 8) {
                        Image(systemName: "medal.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                        Text(award.title)
                            .font(.system(size: 28, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                    }
                )
        case .booker:
            BurgundyVelvetBackground()
                .frame(height: 160)
                .overlay(
                    VStack(spacing: 8) {
                        Text("THE BOOKER PRIZE")
                            .font(.system(size: 20, weight: .bold))
                            .tracking(2)
                            .foregroundColor(.white)
                        Text(award.title)
                            .font(.system(size: 24, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                    }
                )
        case .newbery:
            MagicalStarryBackground()
                .frame(height: 160)
                .overlay(
                    VStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 36))
                            .foregroundColor(Color(red: 0.95, green: 0.85, blue: 0.45))
                        Text(award.title)
                            .font(.system(size: 28, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                    }
                )
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(award.description)
                .font(.body)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if viewModel.total > 0 {
                Text(L10n.Store.platformListsCount(viewModel.total))
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.top, -20)
        .offset(y: -20)
    }

    private var rankingsGrid: some View {
        LazyVStack(spacing: 12) {
            ForEach(Array(viewModel.rankings.enumerated()), id: \.element.id) { index, ranking in
                AwardRankingRow(ranking: ranking, index: index, award: award) {
                    selectedRanking = ranking
                }
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

struct AwardRankingRow: View {
    let ranking: ExternalRanking
    let index: Int
    let award: Award
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Award badge instead of rank number
                AwardCategoryBadge(award: award, isWinner: index == 0)

                // Preview covers
                HStack(spacing: -12) {
                    ForEach(Array((ranking.previewCovers ?? []).prefix(3).enumerated()), id: \.offset) { _, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            default:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            }
                        }
                        .frame(width: 44, height: 66)
                        .cornerRadius(4)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.white, lineWidth: 2)
                        )
                    }
                }
                .frame(width: 76)

                // Title and info
                VStack(alignment: .leading, spacing: 4) {
                    Text(ranking.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = ranking.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let count = ranking.bookCount, count > 0 {
                        Text(L10n.Store.bookCount(count))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

@MainActor
class AwardListViewModel: ObservableObject {
    @Published var rankings: [ExternalRanking] = []
    @Published var total: Int = 0
    @Published var isLoading = false

    private let award: Award
    private let apiClient = APIClient.shared

    init(award: Award) {
        self.award = award
    }

    func loadData() async {
        isLoading = true
        do {
            switch award {
            case .pulitzer:
                let response = try await apiClient.getPulitzerAwards(limit: 50)
                rankings = response.data
                total = response.total
            case .booker:
                let response = try await apiClient.getBookerAwards(limit: 50)
                rankings = response.data
                total = response.total
            case .newbery:
                let response = try await apiClient.getNewberyAwards(limit: 50)
                rankings = response.data
                total = response.total
            }
        } catch {
            Log.e("Failed to load \(award.rawValue) awards: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        VStack(spacing: 24) {
            PulitzerPrizeSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            BookerPrizeSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )

            NewberyMedalSection(
                rankings: [],
                onRankingTap: { _ in },
                onShowAll: { }
            )
        }
    }
}
