import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var selectedEbookId: Int?
    @State private var selectedMagazineId: Int?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if !viewModel.readingHistory.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("继续阅读")
                                .font(.title2)
                                .fontWeight(.bold)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(viewModel.readingHistory) { entry in
                                        ReadingHistoryCard(entry: entry) {
                                            switch entry.type {
                                            case .ebook:
                                                selectedEbookId = entry.itemId
                                            case .magazine:
                                                selectedMagazineId = entry.itemId
                                            case .book:
                                                break // TODO
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Quick access section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("快速入口")
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)

                        HStack(spacing: 12) {
                            QuickAccessCard(
                                title: "电子书",
                                icon: "book",
                                color: .blue
                            )

                            QuickAccessCard(
                                title: "杂志",
                                icon: "newspaper",
                                color: .green
                            )

                            QuickAccessCard(
                                title: "实体书",
                                icon: "books.vertical",
                                color: .orange
                            )
                        }
                        .padding(.horizontal)
                    }

                    if viewModel.readingHistory.isEmpty && !viewModel.isLoading {
                        VStack(spacing: 16) {
                            Spacer()
                            Image(systemName: "book.closed")
                                .font(.system(size: 50))
                                .foregroundColor(.secondary)

                            Text("暂无阅读记录\n开始探索您的书架吧")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Spacer()
                        }
                        .frame(height: 200)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("BookLibrio")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadReadingHistory()
            }
            .navigationDestination(item: $selectedEbookId) { id in
                EbookDetailView(ebookId: id)
            }
            .navigationDestination(item: $selectedMagazineId) { id in
                MagazineDetailView(magazineId: id)
            }
        }
    }
}

struct ReadingHistoryCard: View {
    let entry: ReadingHistoryEntry
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading) {
                BookCoverView(coverUrl: entry.coverUrl, title: entry.title ?? "")
                    .frame(width: 120, height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.title ?? "未知标题")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let lastPage = entry.lastPage {
                        Text("第 \(lastPage) 页")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(width: 120)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct QuickAccessCard: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager.shared)
}
