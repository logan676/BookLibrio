import SwiftUI

/// Topic selection view for tagging thoughts and posts
/// Displays trending topics and categorized topic lists
struct TopicSelectionView: View {
    @Binding var selectedTopics: [Topic]
    @Environment(\.dismiss) var dismiss

    @State private var searchText = ""
    @State private var allTopics: [TopicCategory] = TopicCategory.sampleCategories
    @State private var trendingTopics: [Topic] = Topic.trendingTopics

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Selected topics bar
                if !selectedTopics.isEmpty {
                    selectedTopicsBar
                }

                // Search bar
                searchBar

                // Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Search results or default content
                        if !searchText.isEmpty {
                            searchResults
                        } else {
                            // Trending topics
                            trendingSection

                            // Categories
                            categoriesSection
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("选择话题")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }

    // MARK: - Selected Topics Bar

    private var selectedTopicsBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(selectedTopics) { topic in
                    HStack(spacing: 4) {
                        Text("#\(topic.name)")
                            .font(.subheadline)

                        Button {
                            withAnimation {
                                selectedTopics.removeAll { $0.id == topic.id }
                            }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.caption)
                        }
                    }
                    .foregroundColor(.blue)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(16)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField("搜索话题", text: $searchText)
                .textFieldStyle(.plain)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Search Results

    private var searchResults: some View {
        VStack(alignment: .leading, spacing: 12) {
            let filtered = allTopics.flatMap { $0.topics }.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }

            if filtered.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)

                    Text("未找到相关话题")
                        .foregroundColor(.secondary)

                    Button {
                        // Create new topic
                        let newTopic = Topic(id: UUID().uuidString, name: searchText, postCount: 0)
                        toggleTopic(newTopic)
                    } label: {
                        Text("创建话题 #\(searchText)")
                            .foregroundColor(.blue)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ForEach(filtered) { topic in
                    topicRow(topic)
                }
            }
        }
    }

    // MARK: - Trending Section

    private var trendingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("热门话题")
                    .font(.headline)
            }

            FlowLayout(spacing: 8) {
                ForEach(trendingTopics) { topic in
                    topicChip(topic)
                }
            }
        }
    }

    // MARK: - Categories Section

    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(allTopics) { category in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: category.icon)
                            .foregroundColor(category.color)
                        Text(category.name)
                            .font(.headline)
                    }

                    FlowLayout(spacing: 8) {
                        ForEach(category.topics) { topic in
                            topicChip(topic)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Topic Views

    private func topicChip(_ topic: Topic) -> some View {
        let isSelected = selectedTopics.contains { $0.id == topic.id }

        return Button {
            toggleTopic(topic)
        } label: {
            HStack(spacing: 4) {
                Text("#\(topic.name)")
                    .font(.subheadline)

                if topic.postCount > 0 {
                    Text("\(topic.postCount)")
                        .font(.caption2)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                }
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(16)
        }
    }

    private func topicRow(_ topic: Topic) -> some View {
        let isSelected = selectedTopics.contains { $0.id == topic.id }

        return Button {
            toggleTopic(topic)
        } label: {
            HStack {
                Text("#\(topic.name)")
                    .font(.body)
                    .foregroundColor(.primary)

                Spacer()

                if topic.postCount > 0 {
                    Text("\(topic.postCount)人讨论")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            .padding(.vertical, 8)
        }
    }

    private func toggleTopic(_ topic: Topic) {
        withAnimation {
            if let index = selectedTopics.firstIndex(where: { $0.id == topic.id }) {
                selectedTopics.remove(at: index)
            } else {
                if selectedTopics.count < 5 {
                    selectedTopics.append(topic)
                }
            }
        }
    }
}

// MARK: - Topic Model

struct Topic: Identifiable, Equatable {
    let id: String
    let name: String
    let postCount: Int

    static let trendingTopics: [Topic] = [
        Topic(id: "1", name: "2024年度好书", postCount: 12345),
        Topic(id: "2", name: "读书笔记", postCount: 8932),
        Topic(id: "3", name: "科幻推荐", postCount: 6721),
        Topic(id: "4", name: "历史故事", postCount: 5432),
        Topic(id: "5", name: "心理学", postCount: 4521),
        Topic(id: "6", name: "人物传记", postCount: 3892),
        Topic(id: "7", name: "经典文学", postCount: 3456),
        Topic(id: "8", name: "职场成长", postCount: 2987)
    ]
}

// MARK: - Topic Category

struct TopicCategory: Identifiable {
    let id: String
    let name: String
    let icon: String
    let color: Color
    let topics: [Topic]

    static let sampleCategories: [TopicCategory] = [
        TopicCategory(
            id: "1",
            name: "文学小说",
            icon: "book.fill",
            color: .blue,
            topics: [
                Topic(id: "lit1", name: "经典文学", postCount: 3456),
                Topic(id: "lit2", name: "当代小说", postCount: 2341),
                Topic(id: "lit3", name: "外国文学", postCount: 1892),
                Topic(id: "lit4", name: "诗歌散文", postCount: 1234)
            ]
        ),
        TopicCategory(
            id: "2",
            name: "社科人文",
            icon: "person.3.fill",
            color: .orange,
            topics: [
                Topic(id: "soc1", name: "历史故事", postCount: 5432),
                Topic(id: "soc2", name: "哲学思考", postCount: 2341),
                Topic(id: "soc3", name: "社会观察", postCount: 1892),
                Topic(id: "soc4", name: "人物传记", postCount: 3892)
            ]
        ),
        TopicCategory(
            id: "3",
            name: "科技科学",
            icon: "atom",
            color: .green,
            topics: [
                Topic(id: "sci1", name: "科幻推荐", postCount: 6721),
                Topic(id: "sci2", name: "科普读物", postCount: 2341),
                Topic(id: "sci3", name: "数学之美", postCount: 892),
                Topic(id: "sci4", name: "编程技术", postCount: 1567)
            ]
        ),
        TopicCategory(
            id: "4",
            name: "心理成长",
            icon: "brain.head.profile",
            color: .purple,
            topics: [
                Topic(id: "psy1", name: "心理学", postCount: 4521),
                Topic(id: "psy2", name: "自我提升", postCount: 3421),
                Topic(id: "psy3", name: "职场成长", postCount: 2987),
                Topic(id: "psy4", name: "情感关系", postCount: 2156)
            ]
        ),
        TopicCategory(
            id: "5",
            name: "生活方式",
            icon: "leaf.fill",
            color: .mint,
            topics: [
                Topic(id: "life1", name: "美食烹饪", postCount: 1892),
                Topic(id: "life2", name: "旅行见闻", postCount: 2341),
                Topic(id: "life3", name: "健康养生", postCount: 1567),
                Topic(id: "life4", name: "理财投资", postCount: 2987)
            ]
        )
    ]
}

// MARK: - Note: FlowLayout is defined in StoreSearchView.swift

#Preview {
    TopicSelectionView(selectedTopics: .constant([]))
}
