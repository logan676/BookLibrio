import SwiftUI

/// AsyncImage with persistent disk caching for offline support
/// Loads from cache first, then fetches from network if needed
/// Detects and rejects placeholder images (e.g., Open Library's "image not available")
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    /// Minimum valid image size in pixels (width or height)
    /// Images smaller than this are considered placeholders
    /// Open Library returns 1x1 transparent images for missing covers
    /// Real book covers are typically at least 100+ pixels
    private let minimumImageSize: CGFloat = 50

    @State private var loadedImage: UIImage?
    @State private var isLoading = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                content(Image(uiImage: image))
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
        .onChange(of: url) { _, newUrl in
            loadedImage = nil
            loadImage()
        }
    }

    private func loadImage() {
        // Track when URL is nil - this shouldn't happen but is critical to debug
        guard let url = url else {
            Log.e("CachedAsyncImage: URL is nil, cannot load image")
            return
        }

        guard !isLoading else {
            Log.d("CachedAsyncImage: already loading, skipping - url=\(url.absoluteString)")
            return
        }

        Log.d("CachedAsyncImage: starting load for \(url.absoluteString)")
        isLoading = true

        Task {
            // Try cache first
            if let cached = await ImageCache.shared.image(for: url) {
                // Validate cached image is not a placeholder
                if cached.size.width >= minimumImageSize && cached.size.height >= minimumImageSize {
                    Log.d("CachedAsyncImage: cache hit (\(Int(cached.size.width))x\(Int(cached.size.height))) - \(url.absoluteString)")
                    await MainActor.run {
                        loadedImage = cached
                        isLoading = false
                    }
                    return
                } else {
                    Log.e("CachedAsyncImage: cached image too small (\(Int(cached.size.width))x\(Int(cached.size.height))), rejecting - \(url.absoluteString)")
                }
            }

            Log.d("CachedAsyncImage: cache miss, fetching from network - \(url.absoluteString)")

            // Fetch from network
            do {
                let (data, response) = try await URLSession.shared.data(from: url)

                // Check HTTP status
                if let httpResponse = response as? HTTPURLResponse {
                    if !(200...299).contains(httpResponse.statusCode) {
                        Log.e("CachedAsyncImage: HTTP error \(httpResponse.statusCode) for \(url.absoluteString)")
                        await MainActor.run { isLoading = false }
                        return
                    }
                    Log.d("CachedAsyncImage: HTTP \(httpResponse.statusCode), received \(data.count) bytes - \(url.absoluteString)")
                }

                // Create UIImage from data
                guard let image = UIImage(data: data) else {
                    Log.e("CachedAsyncImage: failed to create UIImage from \(data.count) bytes - \(url.absoluteString)")
                    await MainActor.run { isLoading = false }
                    return
                }

                // Check if image is too small (likely a placeholder)
                if image.size.width < minimumImageSize || image.size.height < minimumImageSize {
                    Log.e("CachedAsyncImage: image too small (\(Int(image.size.width))x\(Int(image.size.height))), rejecting as placeholder - \(url.absoluteString)")
                    await MainActor.run { isLoading = false }
                    return
                }

                // Success! Cache and display
                Log.i("CachedAsyncImage: loaded successfully (\(Int(image.size.width))x\(Int(image.size.height))) - \(url.absoluteString)")
                await ImageCache.shared.cache(image: image, for: url)
                await MainActor.run {
                    loadedImage = image
                    isLoading = false
                }
            } catch {
                Log.e("CachedAsyncImage: network error loading \(url.absoluteString) - \(error.localizedDescription)")
                await MainActor.run { isLoading = false }
            }
        }
    }
}

// MARK: - Convenience initializer matching AsyncImage API

extension CachedAsyncImage where Content == Image, Placeholder == ProgressView<SwiftUI.EmptyView, SwiftUI.EmptyView> {
    init(url: URL?) {
        self.url = url
        self.content = { $0 }
        self.placeholder = { ProgressView() }
    }
}
