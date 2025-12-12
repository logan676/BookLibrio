import SwiftUI

/// Main tab view following PRD's 5-tab structure:
/// 阅读 (Reading) | 书架 (Bookshelf) | 书城 (Store) | 书友 (Friends) | 我 (Profile)
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Reading (阅读) - Quick continue reading entry
            ReadingTabView()
                .tabItem {
                    Label("阅读", systemImage: "book")
                }
                .tag(0)

            // Tab 2: Bookshelf (书架) - Personal library management
            NavigationStack {
                MyBookshelfView()
            }
            .tabItem {
                Label("书架", systemImage: "books.vertical")
            }
            .tag(1)

            // Tab 3: Store (书城) - Unified ebook & magazine store
            StoreHomeView()
                .tabItem {
                    Label("书城", systemImage: "storefront")
                }
                .tag(2)

            // Tab 4: Friends (书友) - Social features
            FriendsTabView()
                .tabItem {
                    Label("书友", systemImage: "person.2")
                }
                .tag(3)

            // Tab 5: Profile (我) - User profile and settings
            ProfileView()
                .tabItem {
                    Label(L10n.Tab.profile, systemImage: "person")
                }
                .tag(4)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
}
