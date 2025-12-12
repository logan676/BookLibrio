import SwiftUI

/// Enhanced Book Detail View supporting both ebooks and magazines
/// Features: book metadata, community stats, reviews, and user bookshelf status
struct BookDetailView: View {
    let bookType: BookType
    let bookId: Int

    @State private var detail: BookDetailData?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showReader = false
    @State private var showAllReviews = false

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if let error = errorMessage {
                ErrorView(message: error) {
                    Task { await loadDetail() }
                }
            } else if let detail = detail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Hero section with cover and basic info
                        heroSection(book: detail.book)

                        // Read button
                        readButton(book: detail.book)

                        // Stats section
                        if detail.stats.hasActivity {
                            statsSection(stats: detail.stats)
                        }

                        // User bookshelf status
                        if let userStatus = detail.userStatus {
                            userStatusSection(status: userStatus)
                        }

                        // Description section
                        if let description = detail.book.description, !description.isEmpty {
                            descriptionSection(description: description)
                        }

                        // Book metadata details
                        metadataSection(book: detail.book)

                        // Reviews section
                        if !detail.recentReviews.isEmpty {
                            reviewsSection(reviews: detail.recentReviews, totalReviews: detail.stats.totalReviews)
                        }
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(detail?.book.title ?? "详情")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadDetail()
        }
        .fullScreenCover(isPresented: $showReader) {
            if let book = detail?.book {
                PDFReaderView(type: bookType.rawValue, id: book.id, title: book.title)
            }
        }
        .sheet(isPresented: $showAllReviews) {
            if let book = detail?.book {
                AllReviewsView(bookType: bookType, bookId: book.id)
            }
        }
    }

    // MARK: - Hero Section

    @ViewBuilder
    private func heroSection(book: BookMetadata) -> some View {
        HStack(alignment: .top, spacing: 16) {
            BookCoverView(coverUrl: book.coverUrl, title: book.title)
                .frame(width: 140, height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .shadow(radius: 4)

            VStack(alignment: .leading, spacing: 8) {
                Text(book.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .lineLimit(3)

                if let author = book.author, !author.isEmpty {
                    Label(author, systemImage: "person")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                if let translator = book.translator, !translator.isEmpty {
                    Label("译者: \(translator)", systemImage: "text.quote")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 12) {
                    if let fileType = book.fileType {
                        Label(fileType.uppercased(), systemImage: "doc")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let fileSize = book.fileSize {
                        Label(book.formattedFileSize, systemImage: "arrow.down.circle")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let rating = detail?.stats.formattedRating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(rating)
                            .fontWeight(.semibold)
                        Text("(\(detail?.stats.ratingCount ?? 0))")
                            .foregroundColor(.secondary)
                    }
                    .font(.subheadline)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Read Button

    @ViewBuilder
    private func readButton(book: BookMetadata) -> some View {
        Button(action: { showReader = true }) {
            HStack {
                Image(systemName: "book.fill")
                Text(L10n.Ebooks.startReading)
            }
            .fontWeight(.semibold)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
        }
        .buttonStyle(.borderedProminent)
        .padding(.horizontal)
    }

    // MARK: - Stats Section

    @ViewBuilder
    private func statsSection(stats: BookStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("社区数据")
                .font(.headline)

            HStack(spacing: 0) {
                statItem(value: "\(stats.totalReaders)", label: "读者", icon: "person.2")
                Divider().frame(height: 40)
                statItem(value: "\(stats.totalHighlights)", label: "划线", icon: "highlighter")
                Divider().frame(height: 40)
                statItem(value: "\(stats.totalReviews)", label: "评论", icon: "text.bubble")
                if let percent = stats.formattedRecommendPercent {
                    Divider().frame(height: 40)
                    statItem(value: percent, label: "推荐", icon: "hand.thumbsup")
                }
            }
            .padding(.vertical, 12)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.accentColor)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - User Status Section

    @ViewBuilder
    private func userStatusSection(status: UserBookshelfStatus) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("我的阅读")
                .font(.headline)

            HStack(spacing: 16) {
                if let bookStatus = status.status {
                    Label(bookStatus.displayName, systemImage: bookStatus.iconName)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.accentColor.opacity(0.1))
                        .clipShape(Capsule())
                }

                if let progress = status.formattedProgress {
                    Label("进度: \(progress)", systemImage: "chart.bar.fill")
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Description Section

    @ViewBuilder
    private func descriptionSection(description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("简介")
                .font(.headline)

            Text(description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(6)
        }
        .padding(.horizontal)
    }

    // MARK: - Metadata Section

    @ViewBuilder
    private func metadataSection(book: BookMetadata) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("详细信息")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                if let publisher = book.publisher {
                    metadataItem(label: "出版社", value: publisher)
                }
                if let publicationDate = book.publicationDate {
                    metadataItem(label: "出版日期", value: publicationDate)
                }
                if let isbn = book.isbn {
                    metadataItem(label: "ISBN", value: isbn)
                }
                if let language = book.language {
                    metadataItem(label: "语言", value: languageDisplayName(language))
                }
                if let pageCount = book.pageCount {
                    metadataItem(label: "页数", value: "\(pageCount) 页")
                }
                if let wordCount = book.wordCount {
                    metadataItem(label: "字数", value: formatWordCount(wordCount))
                }
                if let issueNumber = book.issueNumber {
                    metadataItem(label: "期号", value: issueNumber)
                }
                if let issn = book.issn {
                    metadataItem(label: "ISSN", value: issn)
                }
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func metadataItem(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Reviews Section

    @ViewBuilder
    private func reviewsSection(reviews: [BookReview], totalReviews: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("书评")
                    .font(.headline)

                Spacer()

                if totalReviews > reviews.count {
                    Button("查看全部 (\(totalReviews))") {
                        showAllReviews = true
                    }
                    .font(.subheadline)
                }
            }

            ForEach(reviews.prefix(3)) { review in
                ReviewCard(review: review)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Helper Methods

    private func loadDetail() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIClient.shared.getBookDetail(type: bookType, id: bookId)
            detail = response.data
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func languageDisplayName(_ code: String) -> String {
        switch code.lowercased() {
        case "zh": return "中文"
        case "en": return "English"
        case "ja": return "日本語"
        case "ko": return "한국어"
        default: return code
        }
    }

    private func formatWordCount(_ count: Int) -> String {
        if count >= 10000 {
            return String(format: "%.1f 万字", Double(count) / 10000.0)
        }
        return "\(count) 字"
    }
}

// MARK: - Review Card Component

struct ReviewCard: View {
    let review: BookReview

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // User avatar
                Circle()
                    .fill(Color.accentColor.opacity(0.2))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(String(review.user.username.prefix(1)).uppercased())
                            .font(.caption)
                            .fontWeight(.semibold)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(review.user.username)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let progress = review.formattedReadingProgress {
                        Text("阅读进度 \(progress)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if review.isFeatured {
                    Label("精选", systemImage: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.yellow)
                }
            }

            // Rating or recommendation
            HStack {
                if let rating = review.rating {
                    HStack(spacing: 2) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < rating ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                        }
                    }
                }

                if review.isRecommended {
                    Label("推荐", systemImage: "hand.thumbsup.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if review.isNotRecommended {
                    Label("不推荐", systemImage: "hand.thumbsdown.fill")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // Review title and content
            if let title = review.title, !title.isEmpty {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Text(review.content)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(4)

            // Footer with likes
            HStack {
                Label("\(review.likesCount)", systemImage: "heart")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if let createdAt = review.createdAt {
                    Text(formatRelativeDate(createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func formatRelativeDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }

        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .short
        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - All Reviews View

struct AllReviewsView: View {
    let bookType: BookType
    let bookId: Int

    @Environment(\.dismiss) private var dismiss
    @State private var reviews: [BookReview] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var offset = 0
    @State private var sortOption = "newest"

    var body: some View {
        NavigationStack {
            Group {
                if reviews.isEmpty && isLoading {
                    LoadingView()
                } else if reviews.isEmpty {
                    ContentUnavailableView("暂无评论", systemImage: "text.bubble")
                } else {
                    List {
                        ForEach(reviews) { review in
                            ReviewCard(review: review)
                                .listRowInsets(EdgeInsets())
                                .listRowBackground(Color.clear)
                                .padding(.vertical, 4)
                        }

                        if hasMore {
                            Button("加载更多") {
                                Task { await loadMore() }
                            }
                            .frame(maxWidth: .infinity)
                            .disabled(isLoading)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("全部评论")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Picker("排序", selection: $sortOption) {
                            Text("最新").tag("newest")
                            Text("最早").tag("oldest")
                            Text("最高分").tag("highest")
                            Text("最有用").tag("helpful")
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
            }
            .onChange(of: sortOption) { _, _ in
                offset = 0
                reviews = []
                Task { await loadReviews() }
            }
            .task {
                await loadReviews()
            }
        }
    }

    private func loadReviews() async {
        isLoading = true

        do {
            let response = try await APIClient.shared.getBookReviews(
                type: bookType,
                id: bookId,
                limit: 20,
                offset: 0,
                sort: sortOption
            )
            reviews = response.data
            hasMore = response.hasMore
            offset = reviews.count
        } catch {
            Log.e("Failed to load reviews", error: error)
        }

        isLoading = false
    }

    private func loadMore() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await APIClient.shared.getBookReviews(
                type: bookType,
                id: bookId,
                limit: 20,
                offset: offset,
                sort: sortOption
            )
            reviews.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = reviews.count
        } catch {
            Log.e("Failed to load more reviews", error: error)
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        BookDetailView(bookType: .ebook, bookId: 4120)
    }
}
