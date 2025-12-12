import Foundation
import SwiftUI

/// ViewModel for the unified Store module
/// Manages ebooks, magazines, categories, and rankings
@MainActor
class StoreViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var recommendedBooks: [StoreItem] = []
    @Published var newArrivals: [StoreItem] = []
    @Published var hotBooks: [StoreItem] = []
    @Published var topRanked: [StoreItem] = []
    @Published var categories: [EbookCategory] = []

    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private let apiClient = APIClient.shared

    // MARK: - Data Loading

    func loadHomeData() async {
        isLoading = true
        errorMessage = nil

        // Load all sections in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadRecommendations() }
            group.addTask { await self.loadNewArrivals() }
            group.addTask { await self.loadHotBooks() }
            group.addTask { await self.loadTopRanked() }
            group.addTask { await self.loadCategories() }
        }

        isLoading = false
    }

    func refresh() async {
        await loadHomeData()
    }

    // MARK: - Section Loading

    private func loadRecommendations() async {
        do {
            // Load random selection of ebooks and magazines
            let ebooks = try await apiClient.getEbooks(limit: 6)
            let magazines = try await apiClient.getMagazines(limit: 4)

            let items = ebooks.data.shuffled().prefix(4).map { StoreItem(from: $0) } +
                        magazines.data.shuffled().prefix(2).map { StoreItem(from: $0) }

            recommendedBooks = Array(items.shuffled())
        } catch {
            print("Failed to load recommendations: \(error)")
        }
    }

    private func loadNewArrivals() async {
        do {
            // Load latest ebooks
            let ebooks = try await apiClient.getEbooks(limit: 10)
            newArrivals = ebooks.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load new arrivals: \(error)")
        }
    }

    private func loadHotBooks() async {
        do {
            // Load popular magazines
            let magazines = try await apiClient.getMagazines(limit: 10)
            hotBooks = magazines.data.map { StoreItem(from: $0) }
        } catch {
            print("Failed to load hot books: \(error)")
        }
    }

    private func loadTopRanked() async {
        do {
            // Mix ebooks and magazines for rankings
            let ebooks = try await apiClient.getEbooks(limit: 5)
            let magazines = try await apiClient.getMagazines(limit: 5)

            var items = ebooks.data.map { StoreItem(from: $0) } +
                        magazines.data.map { StoreItem(from: $0) }
            items.shuffle()
            topRanked = Array(items.prefix(10))
        } catch {
            print("Failed to load top ranked: \(error)")
        }
    }

    private func loadCategories() async {
        do {
            let response = try await apiClient.getEbookCategories()
            categories = response.data
        } catch {
            print("Failed to load categories: \(error)")
        }
    }
}

// MARK: - Store Item Model

/// Unified item model for both ebooks and magazines
struct StoreItem: Identifiable, Hashable {
    let id: String
    let itemId: Int
    let type: StoreItemType
    let title: String
    let subtitle: String?
    let coverUrl: String?
    let badge: String?

    enum StoreItemType: String, Hashable {
        case ebook
        case magazine
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: StoreItem, rhs: StoreItem) -> Bool {
        lhs.id == rhs.id
    }

    init(from ebook: Ebook) {
        self.id = "ebook-\(ebook.id)"
        self.itemId = ebook.id
        self.type = .ebook
        self.title = ebook.title
        self.subtitle = nil
        self.coverUrl = ebook.coverUrl
        self.badge = ebook.fileType?.uppercased()
    }

    init(from magazine: Magazine) {
        self.id = "magazine-\(magazine.id)"
        self.itemId = magazine.id
        self.type = .magazine
        self.title = magazine.title
        self.subtitle = magazine.year.map { "\($0)年" }
        self.coverUrl = magazine.coverUrl
        self.badge = magazine.pageCount.map { "\($0)页" }
    }
}
