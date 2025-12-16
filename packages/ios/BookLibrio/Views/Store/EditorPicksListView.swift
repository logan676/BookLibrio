import SwiftUI

/// Editor Picks list view - shows all editor picks with immersive header
/// Template: Inspired by editorial detail page design
struct EditorPicksListView: View {
    @StateObject private var viewModel = EditorPicksListViewModel()
    @State private var selectedRanking: ExternalRanking?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.rankings.isEmpty {
                    ProgressView(L10n.Store.loading)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !viewModel.rankings.isEmpty {
                    mainContent
                } else if let error = viewModel.errorMessage {
                    ContentUnavailableView(
                        L10n.Store.failedToLoad,
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    ContentUnavailableView(
                        L10n.Store.noBooks,
                        systemImage: "star.circle",
                        description: Text(L10n.Store.noBooksYet)
                    )
                }
            }
            .task {
                await viewModel.loadEditorPicks()
            }
            .sheet(item: $selectedRanking) { ranking in
                ExternalRankingDetailView(ranking: ranking)
            }
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                // 1. Immersive Header with Blurred Background
                immersiveHeader

                // Content Body (VStack with negative top padding for overlap)
                VStack(alignment: .leading, spacing: 24) {
                    // 2. Editor's Note Card (Overlapping Header)
                    editorNoteCard
                        .offset(y: -30)

                    // 3. Top Pick Hero (Featured ranking)
                    if let topPick = viewModel.rankings.first {
                        topPickSection(ranking: topPick)
                            .padding(.horizontal, 20)
                    }

                    // 4. More Editor Picks List
                    if viewModel.rankings.count > 1 {
                        morePicksSection
                    }

                    Spacer(minLength: 50)
                }
                .background(Color(UIColor.systemBackground))
            }
        }
        .edgesIgnoringSafeArea(.top)
        .navigationBarBackButtonHidden(true)
        .overlay(
            Button(action: { dismiss() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white.opacity(0.9), .black.opacity(0.3))
                    .padding(.trailing, 20)
                    .padding(.top, 50)
            },
            alignment: .topTrailing
        )
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Immersive Header

    private var immersiveHeader: some View {
        ZStack(alignment: .bottom) {
            // Background Image layer
            GeometryReader { geo in
                if let firstCover = viewModel.rankings.first?.previewCovers?.first {
                    AsyncImage(url: R2Config.convertToPublicURL(firstCover)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: geo.size.width, height: geo.size.height + 50)
                                .blur(radius: 30)
                                .overlay(Color.black.opacity(0.3))
                                .offset(y: -geo.frame(in: .global).minY > 0 ? -geo.frame(in: .global).minY * 0.5 : 0)
                        default:
                            gradientBackground
                                .frame(width: geo.size.width, height: geo.size.height + 50)
                        }
                    }
                } else {
                    gradientBackground
                        .frame(width: geo.size.width, height: geo.size.height + 50)
                }
            }
            .frame(height: 280)

            // Large Title text at the bottom of header
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(L10n.Store.editorsPicks)
                        .font(.system(size: 38, weight: .heavy))
                        .foregroundColor(.white)

                    Text(L10n.Store.editorPicksSubtitle)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 45)
        }
        .zIndex(1)
    }

    private var gradientBackground: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color.blue.opacity(0.6),
                Color.purple.opacity(0.5),
                Color.orange.opacity(0.4)
            ]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Editor's Note Card

    private var editorNoteCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                // Editor avatar placeholder
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 50, height: 50)
                    .foregroundColor(.blue)

                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.Store.editorNote)
                        .font(.headline)
                        .fontWeight(.bold)

                    Text(L10n.Store.editorName)
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            }

            Text(L10n.Store.editorNoteContent)
                .font(.body)
                .foregroundColor(.primary.opacity(0.9))
                .lineSpacing(4)
        }
        .padding(24)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.1), radius: 10, y: 5)
        .padding(.horizontal, 20)
    }

    // MARK: - Top Pick Section

    private func topPickSection(ranking: ExternalRanking) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.Store.topPick)
                .font(.title2)
                .fontWeight(.bold)

            Button {
                selectedRanking = ranking
            } label: {
                HStack(alignment: .top, spacing: 20) {
                    // Large Cover
                    if let coverUrl = ranking.previewCovers?.first {
                        AsyncImage(url: R2Config.convertToPublicURL(coverUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(2/3, contentMode: .fit)
                            default:
                                coverPlaceholder
                            }
                        }
                        .frame(width: 110)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.2), radius: 8, y: 4)
                    } else {
                        coverPlaceholder
                            .frame(width: 110, height: 165)
                            .cornerRadius(12)
                    }

                    // Info & Action
                    VStack(alignment: .leading, spacing: 12) {
                        Text(ranking.title)
                            .font(.system(.title3, design: .serif))
                            .fontWeight(.bold)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)

                        if let subtitle = ranking.subtitle {
                            Text(subtitle)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }

                        if let bookCount = ranking.bookCount {
                            Text(L10n.Store.booksCountLabel(bookCount))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        // View button
                        HStack {
                            Text(L10n.Store.viewList)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.vertical, 12)
                                .padding(.horizontal, 24)
                                .background(Color.black)
                                .cornerRadius(30)
                        }
                    }
                }
                .padding(20)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(20)
            }
            .buttonStyle(.plain)
        }
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

    // MARK: - More Picks Section

    private var morePicksSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.Store.moreSelections)
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal, 20)

            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.rankings.dropFirst().enumerated()), id: \.element.id) { index, ranking in
                    VStack(spacing: 0) {
                        editorPickListItem(ranking: ranking)
                            .padding(.horizontal, 20)

                        if index < viewModel.rankings.count - 2 {
                            Divider()
                                .padding(.leading, 116)
                        }
                    }
                }
            }
        }
    }

    private func editorPickListItem(ranking: ExternalRanking) -> some View {
        Button {
            selectedRanking = ranking
        } label: {
            HStack(alignment: .top, spacing: 16) {
                // Cover
                if let coverUrl = ranking.previewCovers?.first {
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
                    .frame(width: 80)
                    .cornerRadius(8)
                    .shadow(radius: 2)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 80, height: 120)
                        .cornerRadius(8)
                        .overlay(
                            Image(systemName: "book.closed")
                                .foregroundColor(.gray)
                        )
                }

                // Metadata
                VStack(alignment: .leading, spacing: 6) {
                    Text(ranking.title)
                        .font(.headline)
                        .lineLimit(2)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)

                    if let subtitle = ranking.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let bookCount = ranking.bookCount {
                        HStack(spacing: 4) {
                            Image(systemName: "book.closed.fill")
                                .font(.caption2)
                            Text(L10n.Store.booksCountLabel(bookCount))
                                .font(.caption)
                        }
                        .foregroundColor(.secondary)
                    }

                    // Description as editorial blurb
                    if let description = ranking.description {
                        Text(description)
                            .font(.footnote)
                            .foregroundColor(.primary.opacity(0.85))
                            .lineLimit(2)
                            .padding(10)
                            .background(Color(UIColor.tertiarySystemBackground))
                            .cornerRadius(8)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - ViewModel

@MainActor
class EditorPicksListViewModel: ObservableObject {
    @Published var rankings: [ExternalRanking] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasMore = false

    private let apiClient = APIClient.shared
    private var offset = 0
    private let limit = 20

    func loadEditorPicks() async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getEditorPicks(limit: limit, offset: 0)
            rankings = response.data
            hasMore = response.hasMore
            offset = rankings.count
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loadMore() async {
        guard !isLoading && hasMore else { return }

        isLoading = true

        do {
            let response = try await apiClient.getEditorPicks(limit: limit, offset: offset)
            rankings.append(contentsOf: response.data)
            hasMore = response.hasMore
            offset = rankings.count
        } catch {
            // Silently fail for pagination
        }

        isLoading = false
    }

    func refresh() async {
        offset = 0
        await loadEditorPicks()
    }
}

// MARK: - Preview

#Preview {
    EditorPicksListView()
}
