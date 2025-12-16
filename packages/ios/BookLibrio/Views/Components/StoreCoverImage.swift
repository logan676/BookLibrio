import SwiftUI

/// Optimized cover image for Store views
/// - Uses CachedAsyncImage for persistent disk caching
/// - Uses thumbnail URLs by default for faster loading and lower bandwidth
/// - Provides consistent placeholder styling
struct StoreCoverImage: View {
    let coverUrl: String?
    var useThumbnail: Bool = true
    var cornerRadius: CGFloat = 8
    var shadowRadius: CGFloat = 3

    private var resolvedURL: URL? {
        R2Config.convertToPublicURL(coverUrl, useThumbnail: useThumbnail)
    }

    var body: some View {
        CachedAsyncImage(url: resolvedURL) { image in
            image
                .resizable()
                .aspectRatio(2/3, contentMode: .fill)
        } placeholder: {
            Rectangle()
                .fill(Color.gray.opacity(0.15))
                .aspectRatio(2/3, contentMode: .fit)
                .overlay(
                    ProgressView()
                        .scaleEffect(0.7)
                )
        }
        .aspectRatio(2/3, contentMode: .fit)
        .cornerRadius(cornerRadius)
        .shadow(color: Color.black.opacity(0.15), radius: shadowRadius, x: 0, y: 2)
    }
}

/// Compact version for smaller displays (e.g., horizontal scrolls)
struct StoreCoverImageCompact: View {
    let coverUrl: String?
    var cornerRadius: CGFloat = 6

    var body: some View {
        StoreCoverImage(
            coverUrl: coverUrl,
            useThumbnail: true,
            cornerRadius: cornerRadius,
            shadowRadius: 2
        )
    }
}

#Preview {
    HStack(spacing: 16) {
        StoreCoverImage(coverUrl: nil)
            .frame(width: 100)

        StoreCoverImageCompact(coverUrl: nil)
            .frame(width: 60)
    }
    .padding()
}
