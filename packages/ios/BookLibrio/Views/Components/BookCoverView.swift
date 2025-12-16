import SwiftUI

struct BookCoverView: View {
    let coverUrl: String?
    let title: String
    var useThumbnail: Bool = false

    /// Converts a cover URL to an absolute URL
    /// Uses R2 public URL if enabled, otherwise falls back to API proxy
    private var absoluteURL: URL? {
        R2Config.convertToPublicURL(coverUrl, useThumbnail: useThumbnail)
    }

    var body: some View {
        if let url = absoluteURL {
            CachedAsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                PlaceholderCover(title: title)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .onAppear {
                Log.i("BookCoverView: loading '\(title)' - original='\(coverUrl ?? "nil")' → resolved='\(url.absoluteString)'")
            }
        } else {
            PlaceholderCover(title: title)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                    // Log as error since coverUrl should always be present for ranking items
                    if let rawUrl = coverUrl, !rawUrl.isEmpty {
                        Log.e("BookCoverView: URL conversion failed for '\(title)' - coverUrl='\(rawUrl)' could not be converted to URL")
                    } else {
                        Log.e("BookCoverView: missing coverUrl for '\(title)'")
                    }
                }
        }
    }
}

struct PlaceholderCover: View {
    let title: String

    var body: some View {
        ZStack {
            Color(.systemGray5)

            VStack(spacing: 4) {
                Image(systemName: "book.closed")
                    .font(.system(size: 24))
                    .foregroundColor(.secondary)

                Text(title)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
        }
    }
}

struct BookCoverCard: View {
    let title: String
    let coverUrl: String?
    let subtitle: String?
    let action: () -> Void

    // Standard book cover aspect ratio (width:height ≈ 2:3)
    private let coverAspectRatio: CGFloat = 2.0 / 3.0

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: coverUrl, title: title, useThumbnail: true)
                    .aspectRatio(coverAspectRatio, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    BookCoverCard(
        title: "Sample Book Title",
        coverUrl: nil,
        subtitle: "PDF",
        action: {}
    )
    .frame(width: 140)
    .padding()
}
