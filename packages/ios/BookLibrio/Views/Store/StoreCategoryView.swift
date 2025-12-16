import SwiftUI

/// Full-screen view for showing more recommended ebooks
/// Displays all ebooks in a grid layout without category filtering
struct StoreCategoryView: View {
    @StateObject private var viewModel = StoreCategoryViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var selectedItem: StoreItem?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    LoadingView()
                } else if viewModel.items.isEmpty {
                    emptyState
                } else {
                    itemsGrid
                }
            }
            .navigationTitle(L10n.Store.moreRecommendations)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Store.done) { dismiss() }
                }
            }
            .task {
                await viewModel.loadItems()
            }
            .navigationDestination(item: $selectedItem) { item in
                BookDetailView(
                    bookType: item.type == .ebook ? .ebook : .magazine,
                    bookId: item.itemId
                )
            }
        }
    }

    // MARK: - Items Grid

    private var itemsGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 140), spacing: 12)
            ], spacing: 16) {
                ForEach(viewModel.items) { item in
                    StoreBookCard(item: item) {
                        selectedItem = item
                    }
                }
            }
            .padding()
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text(L10n.Store.noContent)
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - ViewModel

@MainActor
class StoreCategoryViewModel: ObservableObject {
    @Published var items: [StoreItem] = []
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    func loadItems() async {
        isLoading = true

        do {
            // Load all ebooks without category filtering - these are "more recommendations"
            let ebooks = try await apiClient.getEbooks(limit: 50)
            items = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load items: \(error)")
        }

        isLoading = false
    }

    func refresh() async {
        await loadItems()
    }
}

#Preview {
    StoreCategoryView()
}
