import SwiftUI

/// Store view for EBOOKS ONLY
/// This view must NEVER display magazines - they are completely separate
struct EbookStoreView: View {
    @StateObject private var viewModel = EbookStoreViewModel()
    @State private var showSearch = false
    @State private var selectedItem: StoreItem?
    @State private var showCategoryBrowser = false
    @State private var showRankings = false
    @State private var showBookLists = false
    @State private var selectedBookList: BookList?
    @State private var bookType = "ebook" // Used by CategoryGridView

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Search bar
                searchBar

                // Recommendations
                if !viewModel.recommendedBooks.isEmpty {
                    RecommendationsSection(
                        books: viewModel.recommendedBooks,
                        isRefreshing: viewModel.isRefreshingRecommendations,
                        onBookTap: { selectedItem = $0 },
                        onRefresh: {
                            Task { await viewModel.refreshRecommendations() }
                        },
                        onShowAll: { showCategoryBrowser = true }
                    )
                }

                // Categories (using enhanced CategoryGridView)
                CategoryGridView(selectedBookType: $bookType)

                // New arrivals
                if !viewModel.newArrivals.isEmpty {
                    horizontalSection(
                        title: L10n.Store.newArrivals,
                        subtitle: "最新上架电子书",
                        items: viewModel.newArrivals,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // Hot ebooks
                if !viewModel.hotBooks.isEmpty {
                    horizontalSection(
                        title: "热门电子书",
                        subtitle: "大家都在读",
                        items: viewModel.hotBooks,
                        showMore: { showCategoryBrowser = true }
                    )
                }

                // Book Lists
                if !viewModel.popularBookLists.isEmpty {
                    bookListsSection
                }

                // Rankings
                if !viewModel.topRanked.isEmpty {
                    rankingPreviewSection
                }
            }
            .padding(.bottom, 32)
        }
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadHomeData()
        }
        .navigationDestination(item: $selectedItem) { item in
            BookDetailView(bookType: .ebook, bookId: item.itemId)
        }
        .sheet(isPresented: $showSearch) {
            StoreSearchView()
        }
        .sheet(isPresented: $showCategoryBrowser) {
            StoreCategoryView()
        }
        .sheet(isPresented: $showRankings) {
            StoreRankingView()
        }
        .sheet(isPresented: $showBookLists) {
            BookListsView()
        }
        .navigationDestination(item: $selectedBookList) { list in
            BookListDetailView(listId: list.id)
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        Button {
            showSearch = true
        } label: {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                Text("搜索电子书")
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
        .padding(.horizontal)
    }

    // MARK: - Horizontal Section

    private func horizontalSection(
        title: String,
        subtitle: String,
        items: [StoreItem],
        showMore: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(L10n.Store.more) {
                    showMore()
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(items) { item in
                        StoreBookCard(item: item) {
                            selectedItem = item
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Book Lists Section

    private var bookListsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(L10n.BookList.popularLists)
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(L10n.BookList.curatedCollections)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(L10n.Store.more) {
                    showBookLists = true
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.popularBookLists) { list in
                        BookListCard(list: list, style: .compact) {
                            selectedBookList = list
                        }
                        .frame(width: 280)
                        .padding(.vertical, 8)
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Ranking Preview Section

    private var rankingPreviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("电子书排行榜")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Button(L10n.Store.viewAll) {
                    showRankings = true
                }
                .font(.subheadline)
            }
            .padding(.horizontal)

            VStack(spacing: 0) {
                ForEach(Array(viewModel.topRanked.prefix(5).enumerated()), id: \.element.id) { index, item in
                    RankingRowPreview(rank: index + 1, item: item) {
                        selectedItem = item
                    }

                    if index < 4 {
                        Divider()
                            .padding(.leading, 60)
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            .padding(.horizontal)
        }
    }
}

// MARK: - Ebook Store ViewModel

@MainActor
class EbookStoreViewModel: ObservableObject {
    @Published var recommendedBooks: [StoreItem] = []
    @Published var newArrivals: [StoreItem] = []
    @Published var hotBooks: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []
    @Published var popularBookLists: [BookList] = []
    @Published var isLoading = false
    @Published var isRefreshingRecommendations = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadHomeData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendations() }
            group.addTask { await self.loadNewArrivals() }
            group.addTask { await self.loadHotBooks() }
            group.addTask { await self.loadTopRanked() }
            group.addTask { await self.loadBookLists() }
        }

        isLoading = false
    }

    func refresh() async {
        await loadHomeData()
    }

    func refreshRecommendations() async {
        isRefreshingRecommendations = true
        await loadRecommendations()
        isRefreshingRecommendations = false
    }

    // EBOOK ONLY - No magazines here
    private func loadRecommendations() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            recommendedBooks = ebooks.data.shuffled().prefix(6).map { StoreItem(from: $0) }
        } catch {
            print("Failed to load ebook recommendations: \(error)")
        }
    }

    private func loadNewArrivals() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            newArrivals = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load new ebook arrivals: \(error)")
        }
    }

    private func loadHotBooks() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            hotBooks = ebooks.data.shuffled().map { StoreItem(from: $0) }
        } catch {
            print("Failed to load hot ebooks: \(error)")
        }
    }

    private func loadTopRanked() async {
        do {
            let ebooks = try await apiClient.getEbooks(limit: 10)
            topRanked = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load top ranked ebooks: \(error)")
        }
    }

    private func loadBookLists() async {
        do {
            let response = try await apiClient.getBookLists(sort: "popular", limit: 6)
            popularBookLists = response.data
        } catch {
            print("Failed to load book lists: \(error)")
        }
    }

}

#Preview {
    NavigationStack {
        EbookStoreView()
    }
}
