import SwiftUI

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
import ReadiumShared
import ReadiumNavigator
#endif

/// EPUB Reader view using Readium framework
/// Provides full EPUB reading experience with navigation, settings, and highlights
struct EPUBReaderView: View {
    let bookType: String
    let id: Int
    let title: String
    let coverUrl: String?

    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: EPUBReaderViewModel
    @StateObject private var settingsStore = ReadingSettingsStore.shared
    @StateObject private var sessionManager = ReadingSessionManager.shared

    // UI state
    @State private var showToolbar = true
    @State private var showSettings = false
    @State private var showTOC = false
    @State private var hideToolbarTask: Task<Void, Never>?

    init(bookType: String, id: Int, title: String, coverUrl: String?) {
        self.bookType = bookType
        self.id = id
        self.title = title
        self.coverUrl = coverUrl
        self._viewModel = StateObject(wrappedValue: EPUBReaderViewModel(
            bookType: bookType,
            bookId: id,
            title: title
        ))
    }

    var body: some View {
        ZStack {
            // Background
            settingsStore.settings.colorMode.backgroundColor
                .ignoresSafeArea()

            // Main content
            Group {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.errorMessage {
                    errorView(error)
                } else {
                    readerContent
                }
            }

            // Toolbar overlay
            if showToolbar && !viewModel.isLoading && viewModel.errorMessage == nil {
                toolbarOverlay
            }
        }
        .statusBarHidden(!showToolbar)
        .task {
            await viewModel.loadPublication()
        }
        .onDisappear {
            Task { await viewModel.endReadingSession() }
        }
        .sheet(isPresented: $showSettings) {
            ReaderSettingsSheet(settings: $settingsStore.settings)
        }
        .sheet(isPresented: $showTOC) {
            EPUBTableOfContentsView(
                items: viewModel.tableOfContents,
                currentHref: viewModel.currentLocation,
                onSelectItem: { item in
                    viewModel.navigateToTOCItem(item)
                    showTOC = false
                }
            )
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            if viewModel.downloadProgress > 0 {
                ProgressView(value: viewModel.downloadProgress)
                    .frame(width: 200)

                Text("\(Int(viewModel.downloadProgress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                Text(L10n.Reader.loading)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.orange)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(L10n.Common.retry) {
                Task { await viewModel.loadPublication() }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Reader Content

    @ViewBuilder
    private var readerContent: some View {
        #if canImport(ReadiumShared) && canImport(ReadiumNavigator)
        if let publication = viewModel.publication {
            ReadiumNavigatorWrapper(
                publication: publication,
                settings: settingsStore.settings,
                onTap: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showToolbar.toggle()
                    }
                    scheduleToolbarHide()
                },
                onLocationChanged: { locator in
                    viewModel.updateProgress(locator: locator)
                }
            )
            .ignoresSafeArea()
        } else {
            Text("No publication loaded")
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        #else
        // Fallback when Readium is not available
        VStack(spacing: 24) {
            Image(systemName: "book.closed")
                .font(.system(size: 64))
                .foregroundColor(.orange)

            Text("EPUB Reader")
                .font(.title2)
                .fontWeight(.bold)

            Text("EPUB support requires the Readium Swift Toolkit.\nPlease add the Readium SPM dependency in Xcode.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Close") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        #endif
    }

    // MARK: - Toolbar Overlay

    private var toolbarOverlay: some View {
        VStack(spacing: 0) {
            // Top toolbar
            topToolbar
                .background(.ultraThinMaterial)

            Spacer()

            // Bottom toolbar
            bottomToolbar
                .background(.ultraThinMaterial)
        }
        .transition(.opacity)
    }

    private var topToolbar: some View {
        HStack {
            Button {
                closeReader()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.primary)
                    .frame(width: 44, height: 44)
            }

            Spacer()

            // Title
            VStack(spacing: 2) {
                Text(title)
                    .font(.headline)
                    .lineLimit(1)

                if let chapter = viewModel.currentChapterTitle {
                    Text(chapter)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Reading timer
            if sessionManager.isActive {
                Button {
                    Task { try? await sessionManager.togglePause() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: sessionManager.isPaused ? "play.fill" : "pause.fill")
                            .font(.caption)
                        Text(sessionManager.formattedElapsedTime)
                            .font(.system(.caption, design: .monospaced))
                    }
                    .foregroundColor(sessionManager.isPaused ? .gray : .orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(sessionManager.isPaused ? Color.gray.opacity(0.15) : Color.orange.opacity(0.15))
                    .cornerRadius(8)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .padding(.top, 44) // Safe area
    }

    private var bottomToolbar: some View {
        VStack(spacing: 12) {
            // Progress bar
            if viewModel.totalChapters > 1 {
                HStack {
                    Text("\(viewModel.currentChapterIndex + 1)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 30)

                    Slider(
                        value: Binding(
                            get: { Double(viewModel.currentChapterIndex) },
                            set: { viewModel.navigateToChapter(at: Int($0)) }
                        ),
                        in: 0...Double(max(viewModel.totalChapters - 1, 1)),
                        step: 1
                    )

                    Text("\(viewModel.totalChapters)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 30)
                }
                .padding(.horizontal)
            }

            // Toolbar buttons
            HStack(spacing: 0) {
                toolbarButton(icon: "list.bullet", label: L10n.Reader.tableOfContents) {
                    showTOC = true
                }

                Spacer()

                toolbarButton(icon: "textformat.size", label: L10n.Reader.settings) {
                    showSettings = true
                }

                Spacer()

                // Progress indicator
                VStack(spacing: 2) {
                    Text("\(Int(viewModel.progress * 100))%")
                        .font(.caption)
                        .fontWeight(.medium)
                    Text("progress")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)

                Spacer()

                toolbarButton(icon: "bookmark", label: L10n.Reader.bookmarks) {
                    // TODO: Implement bookmarks
                }

                Spacer()

                toolbarButton(icon: "highlighter", label: L10n.Reader.highlights) {
                    // TODO: Show highlights list
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 34) // Safe area
        }
        .padding(.top, 12)
    }

    private func toolbarButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Helpers

    private func closeReader() {
        Task {
            await viewModel.endReadingSession()
            viewModel.saveReadingProgress()
            dismiss()
        }
    }

    private func scheduleToolbarHide() {
        hideToolbarTask?.cancel()
        hideToolbarTask = Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            if !Task.isCancelled {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showToolbar = false
                    }
                }
            }
        }
    }
}

// MARK: - Readium Navigator Wrapper
// Note: Full Readium 3.x integration requires additional configuration.
// This placeholder shows the publication info while proper navigation is being implemented.

#if canImport(ReadiumShared) && canImport(ReadiumNavigator)
struct ReadiumNavigatorWrapper: View {
    let publication: Publication
    let settings: ReadingSettings
    let onTap: () -> Void
    let onLocationChanged: (Locator) -> Void

    var body: some View {
        VStack(spacing: 20) {
            // Show publication metadata
            if let title = publication.metadata.title {
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            if let author = publication.metadata.authors.first?.name {
                Text("by \(author)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Info about EPUB support status
            VStack(spacing: 12) {
                Image(systemName: "book.pages")
                    .font(.system(size: 48))
                    .foregroundColor(.blue)

                Text("EPUB Loaded Successfully")
                    .font(.headline)

                Text("The book '\(publication.metadata.title ?? "Unknown")' has been loaded.\nFull reader integration coming soon.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Text("\(publication.readingOrder.count) chapters")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(settings.colorMode.backgroundColor.opacity(0.5))
            .cornerRadius(16)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(settings.colorMode.backgroundColor)
        .onTapGesture {
            onTap()
        }
    }
}
#endif

// MARK: - EPUB Table of Contents View

struct EPUBTableOfContentsView: View {
    let items: [EPUBTOCItem]
    let currentHref: String?
    let onSelectItem: (EPUBTOCItem) -> Void

    @Environment(\.dismiss) var dismiss

    /// Flattened TOC item with level for indentation
    private struct FlatTOCItem: Identifiable {
        let id: UUID
        let item: EPUBTOCItem
        let level: Int
    }

    /// Flatten hierarchical TOC into linear list with levels
    private var flattenedItems: [FlatTOCItem] {
        var result: [FlatTOCItem] = []
        func flatten(_ items: [EPUBTOCItem], level: Int) {
            for item in items {
                result.append(FlatTOCItem(id: item.id, item: item, level: level))
                flatten(item.children, level: level + 1)
            }
        }
        flatten(items, level: 0)
        return result
    }

    var body: some View {
        NavigationStack {
            Group {
                if items.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text(L10n.Reader.noTableOfContents)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(flattenedItems) { flatItem in
                        Button {
                            onSelectItem(flatItem.item)
                        } label: {
                            HStack {
                                Text(flatItem.item.title)
                                    .foregroundColor(.primary)
                                    .padding(.leading, CGFloat(flatItem.level * 16))

                                Spacer()

                                if flatItem.item.href == currentHref {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                        .font(.caption)
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(L10n.Reader.tableOfContents)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(L10n.Reader.done) { dismiss() }
                }
            }
        }
    }
}

#Preview {
    EPUBReaderView(
        bookType: "ebook",
        id: 1,
        title: "Sample EPUB Book",
        coverUrl: nil
    )
}
