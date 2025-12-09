import Foundation

enum ItemType: String, Codable {
    case ebook
    case magazine
    case book
}

struct ReadingHistoryEntry: Codable, Identifiable {
    let id: Int
    let userId: Int?
    let itemType: String
    let itemId: Int
    let title: String?
    let coverUrl: String?
    let lastPage: Int?
    let lastReadAt: String?
    let createdAt: String?

    var type: ItemType {
        ItemType(rawValue: itemType) ?? .ebook
    }
}

struct ReadingHistoryResponse: Codable {
    let data: [ReadingHistoryEntry]
}

struct UpdateReadingHistoryRequest: Codable {
    let itemType: String
    let itemId: Int
    let title: String?
    let coverUrl: String?
    let lastPage: Int?
}
