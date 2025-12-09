import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("首页", systemImage: "house")
                }
                .tag(0)

            EbooksView()
                .tabItem {
                    Label("电子书", systemImage: "book")
                }
                .tag(1)

            MagazinesView()
                .tabItem {
                    Label("杂志", systemImage: "newspaper")
                }
                .tag(2)

            BooksView()
                .tabItem {
                    Label("实体书", systemImage: "books.vertical")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Label("我的", systemImage: "person")
                }
                .tag(4)
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
}
