import SwiftUI

/// First-time user onboarding experience
/// Guides new users through app features and preference setup
struct OnboardingView: View {
    @Binding var hasCompletedOnboarding: Bool
    @State private var currentPage = 0
    @State private var selectedGenres: Set<String> = []
    @State private var dailyGoal: Int = 30
    @State private var preferredReadingTime: ReadingTimePreference = .evening

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            title: "欢迎来到 BookPost",
            subtitle: "发现阅读的乐趣",
            description: "海量正版书籍、杂志、有声书\n让阅读成为你生活的一部分",
            imageName: "books.vertical.fill",
            imageColor: .blue
        ),
        OnboardingPage(
            title: "记录阅读时光",
            subtitle: "追踪你的阅读进度",
            description: "设置每日目标，记录阅读时间\n养成持续阅读的好习惯",
            imageName: "chart.line.uptrend.xyaxis",
            imageColor: .green
        ),
        OnboardingPage(
            title: "分享阅读感悟",
            subtitle: "与书友一起成长",
            description: "发表书评、收藏金句、分享读书心得\n在这里找到志同道合的朋友",
            imageName: "bubble.left.and.bubble.right.fill",
            imageColor: .orange
        )
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Skip button
            HStack {
                Spacer()
                if currentPage < pages.count {
                    Button("跳过") {
                        completeOnboarding()
                    }
                    .foregroundColor(.secondary)
                    .padding()
                }
            }

            // Content
            TabView(selection: $currentPage) {
                // Feature pages
                ForEach(0..<pages.count, id: \.self) { index in
                    featurePage(pages[index])
                        .tag(index)
                }

                // Genre selection
                genreSelectionPage
                    .tag(pages.count)

                // Reading goal setup
                readingGoalPage
                    .tag(pages.count + 1)

                // Final welcome
                finalWelcomePage
                    .tag(pages.count + 2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: currentPage)

            // Bottom area
            VStack(spacing: 16) {
                // Page indicator
                pageIndicator

                // Action button
                actionButton
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Feature Page

    private func featurePage(_ page: OnboardingPage) -> some View {
        VStack(spacing: 32) {
            Spacer()

            // Illustration
            ZStack {
                Circle()
                    .fill(page.imageColor.opacity(0.1))
                    .frame(width: 200, height: 200)

                Circle()
                    .fill(page.imageColor.opacity(0.2))
                    .frame(width: 150, height: 150)

                Image(systemName: page.imageName)
                    .font(.system(size: 60))
                    .foregroundColor(page.imageColor)
            }

            // Text
            VStack(spacing: 16) {
                Text(page.title)
                    .font(.title)
                    .fontWeight(.bold)

                Text(page.subtitle)
                    .font(.title3)
                    .foregroundColor(.secondary)

                Text(page.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }

    // MARK: - Genre Selection Page

    private var genreSelectionPage: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Text("选择你喜欢的类型")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("我们将为你推荐更合适的书籍")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Genre grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(Genre.allGenres, id: \.self) { genre in
                    genreButton(genre)
                }
            }
            .padding(.horizontal, 24)

            Text("已选择 \(selectedGenres.count) 个类型")
                .font(.caption)
                .foregroundColor(.secondary)

            Spacer()
            Spacer()
        }
    }

    private func genreButton(_ genre: String) -> some View {
        let isSelected = selectedGenres.contains(genre)

        return Button {
            withAnimation(.spring(response: 0.3)) {
                if isSelected {
                    selectedGenres.remove(genre)
                } else {
                    selectedGenres.insert(genre)
                }
            }
        } label: {
            Text(genre)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isSelected ? Color.blue : Color(.systemGray6))
                .cornerRadius(12)
        }
    }

    // MARK: - Reading Goal Page

    private var readingGoalPage: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 8) {
                Text("设置阅读目标")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("每天阅读一点，积累成就感")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Goal picker
            VStack(spacing: 16) {
                Text("\(dailyGoal)")
                    .font(.system(size: 72, weight: .bold, design: .rounded))
                    .foregroundColor(.blue)

                Text("分钟/天")
                    .font(.title3)
                    .foregroundColor(.secondary)

                // Slider
                HStack {
                    Text("15")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Slider(value: Binding(
                        get: { Double(dailyGoal) },
                        set: { dailyGoal = Int($0) }
                    ), in: 15...120, step: 5)
                    .tint(.blue)

                    Text("120")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 32)
            }

            // Reading time preference
            VStack(spacing: 12) {
                Text("你通常什么时候阅读？")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 12) {
                    ForEach(ReadingTimePreference.allCases, id: \.self) { time in
                        readingTimeButton(time)
                    }
                }
            }
            .padding(.top, 16)

            Spacer()
            Spacer()
        }
    }

    private func readingTimeButton(_ time: ReadingTimePreference) -> some View {
        let isSelected = preferredReadingTime == time

        return Button {
            withAnimation {
                preferredReadingTime = time
            }
        } label: {
            VStack(spacing: 8) {
                Image(systemName: time.iconName)
                    .font(.title2)

                Text(time.displayName)
                    .font(.caption)
            }
            .foregroundColor(isSelected ? .white : .primary)
            .frame(width: 80, height: 80)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .cornerRadius(16)
        }
    }

    // MARK: - Final Welcome Page

    private var finalWelcomePage: some View {
        VStack(spacing: 32) {
            Spacer()

            // Celebration icon
            ZStack {
                Circle()
                    .fill(Color.yellow.opacity(0.2))
                    .frame(width: 160, height: 160)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)
            }

            VStack(spacing: 16) {
                Text("一切就绪！")
                    .font(.title)
                    .fontWeight(.bold)

                Text("开始你的阅读之旅吧")
                    .font(.title3)
                    .foregroundColor(.secondary)

                // Summary
                VStack(spacing: 12) {
                    if !selectedGenres.isEmpty {
                        summaryRow(
                            icon: "heart.fill",
                            text: "喜欢 \(selectedGenres.count) 种类型"
                        )
                    }

                    summaryRow(
                        icon: "target",
                        text: "每天阅读 \(dailyGoal) 分钟"
                    )

                    summaryRow(
                        icon: preferredReadingTime.iconName,
                        text: "\(preferredReadingTime.displayName)阅读"
                    )
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(16)
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()
        }
    }

    private func summaryRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)

            Spacer()
        }
    }

    // MARK: - Bottom Components

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<(pages.count + 3), id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? Color.blue : Color(.systemGray4))
                    .frame(width: 8, height: 8)
                    .scaleEffect(index == currentPage ? 1.2 : 1.0)
                    .animation(.spring(response: 0.3), value: currentPage)
            }
        }
    }

    private var actionButton: some View {
        Button {
            if currentPage < pages.count + 2 {
                withAnimation {
                    currentPage += 1
                }
            } else {
                completeOnboarding()
            }
        } label: {
            Text(actionButtonTitle)
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.blue)
                .cornerRadius(14)
        }
    }

    private var actionButtonTitle: String {
        switch currentPage {
        case pages.count + 2:
            return "开始阅读"
        case pages.count:
            return selectedGenres.isEmpty ? "稍后选择" : "下一步"
        default:
            return "继续"
        }
    }

    private func completeOnboarding() {
        // Save preferences
        UserDefaults.standard.set(Array(selectedGenres), forKey: "preferredGenres")
        UserDefaults.standard.set(dailyGoal, forKey: "dailyReadingGoal")
        UserDefaults.standard.set(preferredReadingTime.rawValue, forKey: "preferredReadingTime")

        withAnimation {
            hasCompletedOnboarding = true
        }
    }
}

// MARK: - Supporting Models

struct OnboardingPage {
    let title: String
    let subtitle: String
    let description: String
    let imageName: String
    let imageColor: Color
}

enum ReadingTimePreference: String, CaseIterable {
    case morning = "morning"
    case afternoon = "afternoon"
    case evening = "evening"
    case night = "night"

    var displayName: String {
        switch self {
        case .morning: return "早晨"
        case .afternoon: return "下午"
        case .evening: return "傍晚"
        case .night: return "深夜"
        }
    }

    var iconName: String {
        switch self {
        case .morning: return "sunrise.fill"
        case .afternoon: return "sun.max.fill"
        case .evening: return "sunset.fill"
        case .night: return "moon.stars.fill"
        }
    }
}

enum Genre {
    static let allGenres: [String] = [
        "小说", "历史", "传记",
        "科幻", "推理", "言情",
        "科普", "心理", "哲学",
        "商业", "技术", "艺术",
        "旅行", "美食", "健康"
    ]
}

// MARK: - Onboarding Wrapper

/// A view modifier that shows onboarding for first-time users
struct OnboardingWrapper: ViewModifier {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    func body(content: Content) -> some View {
        ZStack {
            content

            if !hasCompletedOnboarding {
                OnboardingView(hasCompletedOnboarding: $hasCompletedOnboarding)
                    .transition(.opacity)
            }
        }
    }
}

extension View {
    func withOnboarding() -> some View {
        modifier(OnboardingWrapper())
    }
}

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
}
