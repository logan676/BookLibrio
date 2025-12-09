import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // User info section
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.username ?? "用户")
                                .font(.title2)
                                .fontWeight(.semibold)

                            Text(authManager.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Menu section
                Section {
                    NavigationLink(destination: Text("阅读记录")) {
                        Label("阅读记录", systemImage: "clock")
                    }

                    NavigationLink(destination: Text("设置")) {
                        Label("设置", systemImage: "gear")
                    }
                }

                // Logout section
                Section {
                    Button(role: .destructive) {
                        showLogoutAlert = true
                    } label: {
                        Label("退出登录", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("我的")
            .alert("确认退出", isPresented: $showLogoutAlert) {
                Button("取消", role: .cancel) {}
                Button("确定", role: .destructive) {
                    authManager.logout()
                }
            } message: {
                Text("确定要退出登录吗?")
            }
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager.shared)
}
