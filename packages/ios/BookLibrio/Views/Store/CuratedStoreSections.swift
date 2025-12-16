import SwiftUI

// MARK: - 1. Editor's Choice Hero Card Section
// Large featured card for editor picks with quote and horizontal book scroll

struct EditorsChoiceSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    // Get the first editor pick as the featured one
    private var featuredRanking: ExternalRanking? {
        rankings.first
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section Header
            HStack {
                Text(L10n.Store.editorsPicks)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Featured Card
            if let featured = featuredRanking {
                EditorsChoiceHeroCard(ranking: featured) {
                    onRankingTap?(featured)
                }
                .padding(.horizontal)
            }

            // Horizontal scroll of other editor picks
            if rankings.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(Array(rankings.dropFirst().enumerated()), id: \.element.id) { index, ranking in
                            EditorPickMiniCard(ranking: ranking) {
                                onRankingTap?(ranking)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// The large hero card for editor's choice
struct EditorsChoiceHeroCard: View {
    let ranking: ExternalRanking
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.blue.opacity(0.1),
                        Color.orange.opacity(0.15),
                        Color.purple.opacity(0.1)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 20) {
                    // Upper section: Cover + Quote
                    HStack(alignment: .top, spacing: 20) {
                        // Main cover (first preview cover)
                        if let coverUrl = ranking.previewCovers?.first {
                            AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(2/3, contentMode: .fit)
                                case .failure, .empty:
                                    coverPlaceholder
                                @unknown default:
                                    coverPlaceholder
                                }
                            }
                            .frame(width: UIScreen.main.bounds.width * 0.28)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                        }

                        // Quote area
                        VStack(alignment: .leading, spacing: 12) {
                            Text(L10n.Store.weeklyRecommend)
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.secondary)

                            Text(ranking.title)
                                .font(.title2)
                                .fontWeight(.heavy)
                                .foregroundColor(.primary)
                                .lineLimit(3)
                                .fixedSize(horizontal: false, vertical: true)

                            if let subtitle = ranking.subtitle {
                                HStack {
                                    Spacer()
                                    Text("—— \(subtitle)")
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                        .italic()
                                }
                            }
                        }
                    }

                    // Lower section: Preview covers scroll
                    if let covers = ranking.previewCovers, covers.count > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(Array(covers.dropFirst().enumerated()), id: \.offset) { _, coverUrl in
                                    AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image
                                                .resizable()
                                                .aspectRatio(2/3, contentMode: .fit)
                                        case .failure, .empty:
                                            smallCoverPlaceholder
                                        @unknown default:
                                            smallCoverPlaceholder
                                        }
                                    }
                                    .frame(width: 80)
                                    .cornerRadius(8)
                                    .shadow(color: Color.black.opacity(0.15), radius: 3, x: 0, y: 2)
                                }
                            }
                            .padding(.horizontal, 4)
                        }
                    }
                }
                .padding(24)
            }
            .frame(maxWidth: .infinity)
            .background(Color(UIColor.systemBackground).opacity(0.6))
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
        }
        .buttonStyle(.plain)
    }

    private var coverPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.3))
            .aspectRatio(2/3, contentMode: .fit)
            .overlay(
                Image(systemName: "book.closed")
                    .font(.title)
                    .foregroundColor(.gray)
            )
    }

    private var smallCoverPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.3))
            .frame(width: 80, height: 120)
            .overlay(
                Image(systemName: "book.closed")
                    .font(.caption)
                    .foregroundColor(.gray)
            )
    }
}

// Mini card for editor picks (used in horizontal scroll)
struct EditorPickMiniCard: View {
    let ranking: ExternalRanking
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Stacked preview covers
                ZStack {
                    if let covers = ranking.previewCovers, !covers.isEmpty {
                        ForEach(Array(covers.prefix(3).reversed().enumerated()), id: \.offset) { index, coverUrl in
                            AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .aspectRatio(2/3, contentMode: .fit)
                                case .failure, .empty:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.3))
                                @unknown default:
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.3))
                                }
                            }
                            .frame(width: 70)
                            .cornerRadius(6)
                            .offset(x: CGFloat(index) * 8, y: CGFloat(index) * -4)
                            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
                        }
                    }
                }
                .frame(width: 100, height: 110)

                Text(ranking.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .frame(width: 100, alignment: .leading)

                if let bookCount = ranking.bookCount {
                    Text(L10n.Store.booksCountLabel(bookCount))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 2. Branded Ranking Section (Full-width banner style)
// For NYT, Amazon, Goodreads etc. with ranking badges

struct BrandedRankingSection: View {
    let ranking: ExternalRanking
    let books: [ExternalRankingBook]
    var onBookTap: ((ExternalRankingBook) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Full-width banner header
            Button(action: { onShowAll?() }) {
                ZStack(alignment: .leading) {
                    Color(UIColor.secondarySystemBackground)

                    HStack(spacing: 12) {
                        // Logo or placeholder
                        if let logoUrl = ranking.sourceLogoUrl, let url = URL(string: logoUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 30, height: 30)
                                default:
                                    sourceInitialCircle
                                }
                            }
                        } else {
                            sourceInitialCircle
                        }

                        Text(ranking.title)
                            .font(.system(.title3, design: .serif))
                            .fontWeight(.bold)
                            .foregroundColor(.primary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .frame(height: 60)
            }
            .buttonStyle(.plain)

            // Horizontal book list with rankings
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(books) { book in
                        RankedBookItemView(book: book) {
                            onBookTap?(book)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
            }
            .background(Color(UIColor.secondarySystemBackground))
        }
        .background(Color(UIColor.secondarySystemBackground))
    }

    private var sourceInitialCircle: some View {
        Circle()
            .fill(Color.primary)
            .frame(width: 30, height: 30)
            .overlay(
                Text(String(ranking.displaySourceName.prefix(1)))
                    .font(.headline)
                    .foregroundColor(Color(UIColor.secondarySystemBackground))
            )
    }
}

// Single ranked book item with badge
struct RankedBookItemView: View {
    let book: ExternalRankingBook
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                // Cover with ranking badge
                ZStack(alignment: .topLeading) {
                    AsyncImage(url: R2Config.convertToPublicURL(book.book.coverUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(2/3, contentMode: .fit)
                        case .failure, .empty:
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .aspectRatio(2/3, contentMode: .fit)
                                .overlay(
                                    Image(systemName: "book.closed")
                                        .foregroundColor(.gray)
                                )
                        @unknown default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                        }
                    }
                    .frame(width: 100)
                    .cornerRadius(8)
                    .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)

                    // Ranking badge
                    RankingBadge(rank: book.rank)
                        .offset(x: -4, y: -4)
                }

                // Book info
                VStack(alignment: .leading, spacing: 2) {
                    Text(book.book.title)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(2)
                        .foregroundColor(.primary)

                    if let author = book.book.author {
                        Text(author)
                            .font(.system(size: 12))
                            .lineLimit(1)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(width: 100, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
    }
}

// Ranking badge view
struct RankingBadge: View {
    let rank: Int

    var badgeColor: Color {
        switch rank {
        case 1: return Color(red: 212/255, green: 175/255, blue: 55/255) // Gold
        case 2: return Color(red: 192/255, green: 192/255, blue: 192/255) // Silver
        case 3: return Color(red: 205/255, green: 127/255, blue: 50/255) // Bronze
        default: return Color.gray.opacity(0.8)
        }
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 1) {
            Text("NO.")
                .font(.system(size: 10, weight: .bold))
            Text("\(rank)")
                .font(.system(size: 16, weight: .heavy))
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .foregroundColor(.white)
        .background(badgeColor)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.white, lineWidth: 1.5)
        )
        .shadow(color: Color.black.opacity(0.2), radius: 2, x: 1, y: 1)
    }
}

// MARK: - 3. Celebrity Picks Section
// Horizontal scroll of celebrity recommendation cards

struct CelebrityPicksSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Text(L10n.Store.celebrityPicks)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal, 16)

            // Horizontal scroll of celebrity cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(rankings) { ranking in
                        CelebrityCardView(ranking: ranking) {
                            onRankingTap?(ranking)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .padding(.top, 20)
    }
}

// Single celebrity recommendation card
struct CelebrityCardView: View {
    let ranking: ExternalRanking
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 20) {
                // Left: Portrait & Name
                VStack(spacing: 12) {
                    // Portrait (using source logo or placeholder)
                    if let logoUrl = ranking.sourceLogoUrl, let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 80, height: 80)
                                    .clipShape(Circle())
                            default:
                                celebrityPlaceholder
                            }
                        }
                    } else {
                        celebrityPlaceholder
                    }

                    Text(ranking.displaySourceName)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.center)
                }
                .frame(width: 90)

                // Right: Quote & Books
                VStack(alignment: .leading, spacing: 16) {
                    // Quote
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(ranking.displaySourceName)'s Picks:")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)

                        Text("\"\(ranking.title)\"")
                            .font(.system(.title3, design: .serif))
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    // Book covers
                    if let covers = ranking.previewCovers {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(Array(covers.enumerated()), id: \.offset) { _, coverUrl in
                                    AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image
                                                .resizable()
                                                .aspectRatio(2/3, contentMode: .fit)
                                        default:
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.3))
                                        }
                                    }
                                    .frame(width: 60)
                                    .cornerRadius(6)
                                    .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
                                }
                            }
                            .padding(.vertical, 4)
                            .padding(.trailing, 16)
                        }
                    }
                }
            }
            .padding(20)
            .frame(width: UIScreen.main.bounds.width - 32)
            .background(Color(UIColor.secondarySystemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }

    private var celebrityPlaceholder: some View {
        Circle()
            .fill(Color.gray.opacity(0.3))
            .frame(width: 80, height: 80)
            .overlay(
                Image(systemName: "person.fill")
                    .font(.title)
                    .foregroundColor(.gray)
            )
    }
}

// MARK: - 4. Series Collections Section
// Stacked book covers for series/collections

struct SeriesCollectionsSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Text(L10n.Store.seriesCollections)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal, 16)

            // Horizontal scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 20) {
                    ForEach(rankings) { ranking in
                        SeriesStackItemView(ranking: ranking) {
                            onRankingTap?(ranking)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 20)
            }
        }
        .padding(.top, 20)
    }
}

// Stacked book cover item
struct SeriesStackItemView: View {
    let ranking: ExternalRanking
    let action: () -> Void

    private let baseWidth: CGFloat = 110

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                // Stacked covers
                ZStack(alignment: .bottomLeading) {
                    if let covers = ranking.previewCovers, !covers.isEmpty {
                        // Back cover (offset left, rotated)
                        if covers.count > 2 {
                            StackedCoverView(
                                coverUrl: covers[2],
                                baseWidth: baseWidth,
                                xOffset: -12, yOffset: -14,
                                rotation: -4, scale: 0.92
                            )
                        }

                        // Middle cover
                        if covers.count > 1 {
                            StackedCoverView(
                                coverUrl: covers[1],
                                baseWidth: baseWidth,
                                xOffset: -6, yOffset: -7,
                                rotation: -2, scale: 0.96
                            )
                        }

                        // Front cover
                        StackedCoverView(
                            coverUrl: covers[0],
                            baseWidth: baseWidth,
                            xOffset: 0, yOffset: 0,
                            rotation: 0, scale: 1.0,
                            isFront: true
                        )
                    }

                    // Badge
                    if let bookCount = ranking.bookCount {
                        Text(L10n.Store.fullSetCount(bookCount))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.vertical, 4)
                            .padding(.horizontal, 8)
                            .background(Color.black.opacity(0.75))
                            .cornerRadius(4)
                            .padding(.leading, 4)
                            .padding(.bottom, 4)
                    }
                }
                .frame(width: 125, height: 125 * 1.5)

                // Title
                Text(ranking.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(width: 110, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
    }
}

// Single stacked cover layer
struct StackedCoverView: View {
    let coverUrl: String
    let baseWidth: CGFloat
    let xOffset: CGFloat
    let yOffset: CGFloat
    let rotation: Double
    let scale: CGFloat
    var isFront: Bool = false

    var body: some View {
        AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(2/3, contentMode: .fit)
            default:
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .aspectRatio(2/3, contentMode: .fit)
            }
        }
        .frame(width: baseWidth)
        .cornerRadius(8)
        .scaleEffect(scale)
        .rotationEffect(.degrees(rotation))
        .offset(x: xOffset, y: yOffset)
        .shadow(
            color: Color.black.opacity(isFront ? 0.25 : 0.05),
            radius: isFront ? 6 : 2,
            x: isFront ? 2 : 0,
            y: isFront ? 3 : 0
        )
    }
}

// MARK: - 5. Weekly Picks Section
// Simple horizontal scroll for weekly recommendations

struct WeeklyPicksSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)

                    Text(L10n.Store.weeklyPicks)
                        .font(.title3)
                        .fontWeight(.bold)
                }

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal)

            // Horizontal scroll of weekly picks
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(rankings) { ranking in
                        WeeklyPickCard(ranking: ranking) {
                            onRankingTap?(ranking)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// Weekly pick card with date display
struct WeeklyPickCard: View {
    let ranking: ExternalRanking
    let action: () -> Void

    // Extract date info from title if available
    private var dateInfo: (month: String, week: String)? {
        // Try to parse date info from title like "本周不容错过的8本新书(2024年7月第1周)"
        if let range = ranking.title.range(of: "\\d+年\\d+月第\\d+周", options: .regularExpression) {
            let dateStr = String(ranking.title[range])
            return (dateStr, "")
        }
        return nil
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                // Date header
                VStack(spacing: 2) {
                    Image(systemName: "calendar")
                        .font(.title3)
                        .foregroundColor(.white)

                    if let bookCount = ranking.bookCount {
                        Text("\(bookCount)")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text(L10n.Store.booksLabel)
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.blue)

                // Content
                VStack(alignment: .leading, spacing: 8) {
                    Text(ranking.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    // Preview covers
                    if let covers = ranking.previewCovers {
                        HStack(spacing: -12) {
                            ForEach(Array(covers.prefix(3).enumerated()), id: \.offset) { _, coverUrl in
                                AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 36, height: 50)
                                            .clipped()
                                    default:
                                        Rectangle()
                                            .fill(Color.gray.opacity(0.2))
                                            .frame(width: 36, height: 50)
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.white, lineWidth: 2)
                                )
                            }

                            if let bookCount = ranking.bookCount, bookCount > 3 {
                                ZStack {
                                    Circle()
                                        .fill(Color(.systemGray5))
                                        .frame(width: 36, height: 36)

                                    Text("+\(bookCount - 3)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
            }
            .frame(width: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.08), radius: 6, x: 0, y: 3)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 6. Biography Section
// Magazine-style cards for biography/memoir books

struct BiographySection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack {
                Text(L10n.Store.biographies)
                    .font(.title3)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal, 16)

            // Horizontal scroll of biography cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(rankings) { ranking in
                        BiographyCardView(ranking: ranking) {
                            onRankingTap?(ranking)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .padding(.top, 20)
    }
}

// Magazine-style biography card
struct BiographyCardView: View {
    let ranking: ExternalRanking
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .bottomLeading) {
                // Background portrait (first preview cover)
                if let coverUrl = ranking.previewCovers?.first {
                    AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure, .empty:
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                        @unknown default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                        }
                    }
                    .frame(width: UIScreen.main.bounds.width - 32, height: 220)
                    .clipped()
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: UIScreen.main.bounds.width - 32, height: 220)
                }

                // Gradient overlays
                LinearGradient(
                    gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.5), Color.black.opacity(0.8)]),
                    startPoint: .top,
                    endPoint: .bottom
                )

                LinearGradient(
                    gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.6)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )

                // Content
                HStack(alignment: .bottom, spacing: 20) {
                    // Book cover overlay (second preview cover if available)
                    if let covers = ranking.previewCovers, covers.count > 1 {
                        AsyncImage(url: R2Config.convertToPublicURL(covers[1])) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(2/3, contentMode: .fit)
                            default:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.5))
                                    .aspectRatio(2/3, contentMode: .fit)
                            }
                        }
                        .frame(width: 90)
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.white, lineWidth: 2)
                        )
                        .shadow(color: Color.black.opacity(0.3), radius: 5, x: 0, y: 2)
                    }

                    // Text info
                    VStack(alignment: .leading, spacing: 6) {
                        Text(ranking.title)
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(.white)
                            .lineLimit(2)

                        if let subtitle = ranking.subtitle {
                            Text(subtitle)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                                .lineLimit(1)
                        }

                        if let description = ranking.description {
                            Text(description)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white.opacity(0.8))
                                .lineLimit(2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(.bottom, 4)
                }
                .padding(20)
            }
            .frame(width: UIScreen.main.bounds.width - 32, height: 220)
            .background(Color.gray)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 5)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 7. Awards Section
// Literary awards showcase (Pulitzer, Booker, Newbery, etc.)

struct AwardsSection: View {
    let rankings: [ExternalRanking]
    var onRankingTap: ((ExternalRanking) -> Void)?
    var onShowAll: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section header with trophy icon
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(Color(red: 0.85, green: 0.65, blue: 0.1)) // Gold

                    Text(L10n.Store.awards)
                        .font(.title3)
                        .fontWeight(.bold)
                }

                Spacer()

                Button(L10n.Store.viewMore) {
                    onShowAll?()
                }
                .font(.subheadline)
                .foregroundColor(.primary)
            }
            .padding(.horizontal, 16)

            // Horizontal scroll of award cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(rankings) { ranking in
                        AwardCardView(ranking: ranking) {
                            onRankingTap?(ranking)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .padding(.top, 16)
    }
}

// Award card view with medal badge and elegant design
struct AwardCardView: View {
    let ranking: ExternalRanking
    let action: () -> Void

    // Determine award color based on list type
    private var awardColor: Color {
        switch ranking.listType {
        case "pulitzer":
            return Color(red: 0.85, green: 0.65, blue: 0.1) // Gold
        case "booker", "booker_international":
            return Color(red: 0.6, green: 0.1, blue: 0.15) // Deep red
        case "newbery":
            return Color(red: 0.85, green: 0.65, blue: 0.1) // Gold
        default:
            return Color(red: 0.4, green: 0.3, blue: 0.6) // Purple
        }
    }

    private var awardIcon: String {
        switch ranking.listType {
        case "pulitzer":
            return "medal.fill"
        case "booker", "booker_international":
            return "book.fill"
        case "newbery":
            return "star.circle.fill"
        default:
            return "trophy.fill"
        }
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                // Top: Award badge header
                ZStack(alignment: .topLeading) {
                    // Background with award color
                    LinearGradient(
                        gradient: Gradient(colors: [
                            awardColor,
                            awardColor.opacity(0.8)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 60)

                    // Award badge
                    HStack(spacing: 8) {
                        Image(systemName: awardIcon)
                            .font(.title2)
                            .foregroundColor(.white)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(ranking.displaySourceName)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)

                            if let bookCount = ranking.bookCount {
                                Text(L10n.Store.booksCountLabel(bookCount))
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.8))
                            }
                        }
                    }
                    .padding(12)
                }

                // Middle: Book covers
                VStack(spacing: 12) {
                    // Preview covers
                    if let covers = ranking.previewCovers, !covers.isEmpty {
                        HStack(spacing: -20) {
                            ForEach(Array(covers.prefix(4).enumerated()), id: \.offset) { index, coverUrl in
                                AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(2/3, contentMode: .fit)
                                    default:
                                        Rectangle()
                                            .fill(Color.gray.opacity(0.3))
                                            .aspectRatio(2/3, contentMode: .fit)
                                    }
                                }
                                .frame(width: 55)
                                .cornerRadius(6)
                                .shadow(color: Color.black.opacity(0.15), radius: 3, x: 0, y: 2)
                                .zIndex(Double(4 - index))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }

                    // Title
                    Text(ranking.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 12)
                }
                .background(Color(UIColor.secondarySystemBackground))
            }
            .frame(width: 180)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: awardColor.opacity(0.3), radius: 6, x: 0, y: 3)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview Provider

#Preview("Editors Choice") {
    EditorsChoiceSection(rankings: [])
}

#Preview("Series Collections") {
    SeriesCollectionsSection(rankings: [])
}

#Preview("Biography Section") {
    BiographySection(rankings: [])
}

#Preview("Awards Section") {
    AwardsSection(rankings: [])
}
