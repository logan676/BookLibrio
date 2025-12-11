import SwiftUI

/// AsyncImage with persistent disk caching for offline support
/// Loads from cache first, then fetches from network if needed
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

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
        guard let url = url, !isLoading else { return }

        isLoading = true

        Task {
            // Try cache first
            if let cached = await ImageCache.shared.image(for: url) {
                await MainActor.run {
                    loadedImage = cached
                    isLoading = false
                }
                return
            }

            // Fetch from network
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    // Cache for offline use
                    await ImageCache.shared.cache(image: image, for: url)
                    await MainActor.run {
                        loadedImage = image
                    }
                }
            } catch {
                Log.e("Failed to load image: \(url)", error: error)
            }

            await MainActor.run {
                isLoading = false
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
