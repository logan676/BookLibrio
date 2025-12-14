import SwiftUI

/// Main tab view - 3-tab structure:
/// 书架 (Bookshelf) | 书城 (Store) | 我 (Profile)
/// Note: 书城 contains two separate sections - 电子书 (Ebooks) and 杂志 (Magazines) - they are NEVER mixed
/// Note: 阅读 (Reading) tab removed - recent reading moved to 书架
/// Note: 书友 (Friends) tab temporarily removed - FriendsTabView.swift kept for future use
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Bookshelf (书架) - Personal library with recent reading
            NavigationStack {
                MyBookshelfView()
            }
            .tabItem {
                Label("书架", systemImage: "books.vertical")
            }
            .tag(0)

            // Tab 2: Store (书城) - Separate tabs for ebooks and magazines
            StoreTabView()
                .tabItem {
                    Label("书城", systemImage: "storefront")
                }
                .tag(1)

            // Tab 3: Profile (我) - User profile and settings
            ProfileView()
                .tabItem {
                    Label(L10n.Tab.profile, systemImage: "person")
                }
                .tag(2)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
}
