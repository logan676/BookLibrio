import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label(L10n.Tab.home, systemImage: "house")
                }
                .tag(0)

            EbooksView()
                .tabItem {
                    Label(L10n.Tab.ebooks, systemImage: "book")
                }
                .tag(1)

            MagazinesView()
                .tabItem {
                    Label(L10n.Tab.magazines, systemImage: "newspaper")
                }
                .tag(2)

            BooksView()
                .tabItem {
                    Label(L10n.Tab.books, systemImage: "books.vertical")
                }
                .tag(3)

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
