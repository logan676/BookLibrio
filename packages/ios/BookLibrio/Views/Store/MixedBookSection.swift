import SwiftUI

/// Mixed Book Section - displays 1-4 books with different layouts
/// Includes a distinctive header to separate from ranking sections
///
/// Layouts:
/// - 1 book: Featured single book with large cover and detailed info
/// - 2 books: Two horizontal cards evenly distributed
/// - 3-4 books: Grid layout with small covers
struct MixedBookSection: View {
    let books: [Ebook]
    let onBookTap: (Ebook) -> Void
    var showHeader: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header to distinguish from rankings
            if showHeader {
                sectionHeader
            }

            // Content based on book count
            switch books.count {
            case 1:
                RecommendedBookCard(book: books[0], onTap: { onBookTap(books[0]) })
            case 2:
                TwoBookRow(books: books, onTap: onBookTap)
            case 3, 4:
                MixedBookGrid(books: books, onTap: onBookTap)
            default:
                EmptyView()
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.tertiarySystemBackground))
        )
        .padding(.horizontal, 16)
    }

    // MARK: - Section Header

    private var sectionHeader: some View {
        HStack(spacing: 8) {
            // Icon badge
            Image(systemName: "sparkles")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 22, height: 22)
                .background(
                    LinearGradient(
                        colors: [Color.purple, Color.blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 6))

            Text(L10n.Store.moreRecommendations)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)

            Spacer()
        }
        .padding(.bottom, 4)
    }
}

// MARK: - 1 Book: Recommended Card

/// Recommended book card - prominent display with large cover
/// Designed to clearly distinguish from ranking list items
private struct RecommendedBookCard: View {
    let book: Ebook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 16) {
                // Large cover on left
                BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
                    .aspectRatio(2/3, contentMode: .fit)
                    .frame(width: 110)
                    .cornerRadius(10)
                    .shadow(color: Color.black.opacity(0.2), radius: 6, x: 0, y: 3)

                // Info on right
                VStack(alignment: .leading, spacing: 8) {
                    // Featured badge
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text(L10n.Ebooks.featured)
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.orange)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.15))
                    .cornerRadius(6)

                    Text(book.title)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let author = book.author, !author.isEmpty {
                        Text(author)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let description = book.description, !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(3)
                            .multilineTextAlignment(.leading)
                    }

                    Spacer(minLength: 0)

                    // Read button
                    HStack {
                        Spacer()
                        Text(L10n.Ebooks.startReading)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.accentColor)
                            .cornerRadius(14)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - 2 Books: Two Horizontal Cards

/// Two book row - two horizontal cards evenly distributed
private struct TwoBookRow: View {
    let books: [Ebook]
    let onTap: (Ebook) -> Void

    var body: some View {
        HStack(spacing: 12) {
            ForEach(books.prefix(2)) { book in
                CompactBookCard(book: book, onTap: { onTap(book) })
            }
        }
    }
}

/// Compact horizontal card for 2-book layout
private struct CompactBookCard: View {
    let book: Ebook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 10) {
                // Cover
                bookCover
                    .frame(width: 60, height: 90)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let author = book.author, !author.isEmpty {
                        Text(author)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }

                    if let description = book.description, !description.isEmpty {
                        Text(description)
                            .font(.caption2)
                            .foregroundColor(.secondary.opacity(0.8))
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(10)
            .background(Color(UIColor.secondarySystemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var bookCover: some View {
        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
            .aspectRatio(2/3, contentMode: .fit)
            .cornerRadius(6)
            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

// MARK: - 3-4 Books: Grid Layout

/// Grid layout for 3-4 books
private struct MixedBookGrid: View {
    let books: [Ebook]
    let onTap: (Ebook) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        // Use HStack for consistent layout
        HStack(spacing: 12) {
            ForEach(books.prefix(4)) { book in
                GridBookCard(book: book, onTap: { onTap(book) })
            }
            // Fill remaining space if less than 4 books
            if books.count == 3 {
                Spacer()
                    .frame(maxWidth: .infinity)
            }
        }
    }
}

/// Grid card for 3-4 book layout
private struct GridBookCard: View {
    let book: Ebook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                // Cover
                bookCover
                    .aspectRatio(2/3, contentMode: .fit)

                // Title only for grid
                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .frame(maxWidth: .infinity)
    }

    private var bookCover: some View {
        BookCoverView(coverUrl: book.coverUrl, title: book.title, useThumbnail: true)
            .cornerRadius(6)
            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Preview

#Preview("1 Book") {
    MixedBookSection(
        books: [
            Ebook(
                id: 1,
                categoryId: nil,
                title: "The Art of Computer Programming",
                filePath: nil,
                fileSize: nil,
                fileType: "epub",
                normalizedTitle: nil,
                coverUrl: nil,
                s3Key: nil,
                createdAt: nil,
                author: "Donald Knuth",
                description: "A comprehensive monograph written by Donald Knuth that covers many kinds of programming algorithms and their analysis."
            )
        ],
        onBookTap: { _ in }
    )
}

#Preview("2 Books") {
    MixedBookSection(
        books: [
            Ebook(
                id: 1,
                categoryId: nil,
                title: "Clean Code",
                filePath: nil,
                fileSize: nil,
                fileType: "epub",
                normalizedTitle: nil,
                coverUrl: nil,
                s3Key: nil,
                createdAt: nil,
                author: "Robert C. Martin",
                description: "A handbook of agile software craftsmanship"
            ),
            Ebook(
                id: 2,
                categoryId: nil,
                title: "The Pragmatic Programmer",
                filePath: nil,
                fileSize: nil,
                fileType: "epub",
                normalizedTitle: nil,
                coverUrl: nil,
                s3Key: nil,
                createdAt: nil,
                author: "David Thomas",
                description: "From journeyman to master"
            )
        ],
        onBookTap: { _ in }
    )
}

#Preview("4 Books") {
    MixedBookSection(
        books: [
            Ebook(id: 1, categoryId: nil, title: "Book 1", filePath: nil, fileSize: nil, fileType: nil, normalizedTitle: nil, coverUrl: nil, s3Key: nil, createdAt: nil, author: "Author 1", description: nil),
            Ebook(id: 2, categoryId: nil, title: "Book 2", filePath: nil, fileSize: nil, fileType: nil, normalizedTitle: nil, coverUrl: nil, s3Key: nil, createdAt: nil, author: "Author 2", description: nil),
            Ebook(id: 3, categoryId: nil, title: "Book 3", filePath: nil, fileSize: nil, fileType: nil, normalizedTitle: nil, coverUrl: nil, s3Key: nil, createdAt: nil, author: "Author 3", description: nil),
            Ebook(id: 4, categoryId: nil, title: "Book 4", filePath: nil, fileSize: nil, fileType: nil, normalizedTitle: nil, coverUrl: nil, s3Key: nil, createdAt: nil, author: "Author 4", description: nil)
        ],
        onBookTap: { _ in }
    )
}
