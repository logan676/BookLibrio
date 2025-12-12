import SwiftUI

/// Main settings view with categorized settings sections
/// Includes account, reading preferences, notifications, privacy, and app info
struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Account section
                accountSection

                // Reading preferences
                readingPreferencesSection

                // Notifications
                notificationsSection

                // Privacy & Security
                privacySection

                // Storage & Cache
                storageSection

                // About & Help
                aboutSection

                // Logout
                logoutSection
            }
            .navigationTitle("设置")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showMembership) {
                MembershipView()
            }
            .alert("确认退出登录", isPresented: $viewModel.showLogoutAlert) {
                Button("取消", role: .cancel) { }
                Button("退出", role: .destructive) {
                    viewModel.logout()
                }
            } message: {
                Text("退出后需要重新登录")
            }
            .alert("清除缓存", isPresented: $viewModel.showClearCacheAlert) {
                Button("取消", role: .cancel) { }
                Button("清除", role: .destructive) {
                    viewModel.clearCache()
                }
            } message: {
                Text("将清除所有本地缓存数据，包括已下载的书籍封面")
            }
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section {
            // Profile edit
            NavigationLink {
                ProfileEditView()
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 56, height: 56)
                        .overlay(
                            Text(String(viewModel.username.prefix(1)))
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                        )

                    VStack(alignment: .leading, spacing: 4) {
                        Text(viewModel.username)
                            .font(.headline)

                        Text("编辑个人资料")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            // Membership
            Button {
                viewModel.showMembership = true
            } label: {
                HStack {
                    Image(systemName: "crown.fill")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text("会员中心")
                        .foregroundColor(.primary)

                    Spacer()

                    if viewModel.isMember {
                        Text("已开通")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Account & Security
            NavigationLink {
                AccountSecurityView()
            } label: {
                HStack {
                    Image(systemName: "lock.shield")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("账号与安全")
                }
            }
        } header: {
            Text("账号")
        }
    }

    // MARK: - Reading Preferences Section

    private var readingPreferencesSection: some View {
        Section {
            // Font size
            NavigationLink {
                FontSettingsView()
            } label: {
                HStack {
                    Image(systemName: "textformat.size")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("字体设置")

                    Spacer()

                    Text(viewModel.fontSizeDescription)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Reading theme
            NavigationLink {
                ThemeSettingsView()
            } label: {
                HStack {
                    Image(systemName: "paintpalette")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text("阅读主题")

                    Spacer()

                    Text(viewModel.currentTheme)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Page turn animation
            Toggle(isOn: $viewModel.pageFlipAnimation) {
                HStack {
                    Image(systemName: "book.pages")
                        .foregroundColor(.orange)
                        .frame(width: 24)

                    Text("翻页动画")
                }
            }

            // Auto brightness
            Toggle(isOn: $viewModel.autoBrightness) {
                HStack {
                    Image(systemName: "sun.max")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text("自动调节亮度")
                }
            }

            // Keep screen on
            Toggle(isOn: $viewModel.keepScreenOn) {
                HStack {
                    Image(systemName: "display")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text("阅读时保持屏幕常亮")
                }
            }
        } header: {
            Text("阅读设置")
        }
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        Section {
            Toggle(isOn: $viewModel.readingReminder) {
                HStack {
                    Image(systemName: "bell.badge")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text("阅读提醒")
                }
            }

            if viewModel.readingReminder {
                NavigationLink {
                    ReminderTimeSettingsView()
                } label: {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.blue)
                            .frame(width: 24)

                        Text("提醒时间")

                        Spacer()

                        Text(viewModel.reminderTime)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Toggle(isOn: $viewModel.newBookNotification) {
                HStack {
                    Image(systemName: "book.circle")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text("新书推荐")
                }
            }

            Toggle(isOn: $viewModel.socialNotification) {
                HStack {
                    Image(systemName: "person.2")
                        .foregroundColor(.purple)
                        .frame(width: 24)

                    Text("社交动态")
                }
            }

            Toggle(isOn: $viewModel.systemNotification) {
                HStack {
                    Image(systemName: "bell")
                        .foregroundColor(.orange)
                        .frame(width: 24)

                    Text("系统通知")
                }
            }
        } header: {
            Text("通知设置")
        }
    }

    // MARK: - Privacy Section

    private var privacySection: some View {
        Section {
            // Profile visibility
            NavigationLink {
                PrivacySettingsView()
            } label: {
                HStack {
                    Image(systemName: "eye")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("隐私设置")
                }
            }

            // Blocked users
            NavigationLink {
                BlockedUsersView()
            } label: {
                HStack {
                    Image(systemName: "person.crop.circle.badge.minus")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text("黑名单")
                }
            }

            // Data download
            NavigationLink {
                DataExportView()
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.down")
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text("下载我的数据")
                }
            }
        } header: {
            Text("隐私与安全")
        }
    }

    // MARK: - Storage Section

    private var storageSection: some View {
        Section {
            // Cache size
            HStack {
                Image(systemName: "internaldrive")
                    .foregroundColor(.gray)
                    .frame(width: 24)

                Text("缓存大小")

                Spacer()

                Text(viewModel.cacheSize)
                    .foregroundColor(.secondary)
            }

            // Clear cache button
            Button {
                viewModel.showClearCacheAlert = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                        .foregroundColor(.red)
                        .frame(width: 24)

                    Text("清除缓存")
                        .foregroundColor(.red)
                }
            }

            // Download settings
            NavigationLink {
                DownloadSettingsView()
            } label: {
                HStack {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("下载设置")
                }
            }
        } header: {
            Text("存储")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section {
            // Help & Feedback
            NavigationLink {
                HelpCenterView()
            } label: {
                HStack {
                    Image(systemName: "questionmark.circle")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("帮助与反馈")
                }
            }

            // Rate app
            Button {
                viewModel.rateApp()
            } label: {
                HStack {
                    Image(systemName: "star")
                        .foregroundColor(.yellow)
                        .frame(width: 24)

                    Text("给我们评分")
                        .foregroundColor(.primary)
                }
            }

            // Share app
            Button {
                viewModel.shareApp()
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text("分享给朋友")
                        .foregroundColor(.primary)
                }
            }

            // About
            NavigationLink {
                AboutView()
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                        .foregroundColor(.gray)
                        .frame(width: 24)

                    Text("关于")

                    Spacer()

                    Text("v\(viewModel.appVersion)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Terms & Privacy
            NavigationLink {
                LegalView()
            } label: {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundColor(.gray)
                        .frame(width: 24)

                    Text("用户协议与隐私政策")
                }
            }
        } header: {
            Text("关于")
        }
    }

    // MARK: - Logout Section

    private var logoutSection: some View {
        Section {
            Button {
                viewModel.showLogoutAlert = true
            } label: {
                HStack {
                    Spacer()
                    Text("退出登录")
                        .foregroundColor(.red)
                    Spacer()
                }
            }
        }
    }
}

// MARK: - Settings ViewModel

@MainActor
class SettingsViewModel: ObservableObject {
    // Account
    @Published var username = "读书爱好者"
    @Published var isMember = false
    @Published var showMembership = false
    @Published var showLogoutAlert = false

    // Reading preferences
    @Published var fontSizeDescription = "中"
    @Published var currentTheme = "默认"
    @Published var pageFlipAnimation = true
    @Published var autoBrightness = true
    @Published var keepScreenOn = false

    // Notifications
    @Published var readingReminder = true
    @Published var reminderTime = "21:00"
    @Published var newBookNotification = true
    @Published var socialNotification = true
    @Published var systemNotification = true

    // Storage
    @Published var cacheSize = "计算中..."
    @Published var showClearCacheAlert = false

    // App info
    let appVersion: String

    init() {
        appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        calculateCacheSize()
    }

    private func calculateCacheSize() {
        // Calculate actual cache size
        Task {
            let size = await getCacheSize()
            await MainActor.run {
                cacheSize = formatBytes(size)
            }
        }
    }

    private func getCacheSize() async -> Int64 {
        var totalSize: Int64 = 0

        // URLCache size
        totalSize += Int64(URLCache.shared.currentDiskUsage)

        // Documents directory
        if let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            totalSize += directorySize(at: documentsURL)
        }

        // Caches directory
        if let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            totalSize += directorySize(at: cachesURL)
        }

        return totalSize
    }

    private func directorySize(at url: URL) -> Int64 {
        let fileManager = FileManager.default
        var size: Int64 = 0

        if let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                    size += Int64(fileSize)
                }
            }
        }

        return size
    }

    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }

    func clearCache() {
        // Clear URLCache
        URLCache.shared.removeAllCachedResponses()

        // Clear caches directory
        if let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            try? FileManager.default.removeItem(at: cachesURL)
            try? FileManager.default.createDirectory(at: cachesURL, withIntermediateDirectories: true)
        }

        // Recalculate
        calculateCacheSize()
    }

    func logout() {
        // Clear auth token and user data
        UserDefaults.standard.removeObject(forKey: "authToken")
        UserDefaults.standard.removeObject(forKey: "userId")

        // Post notification to update UI
        NotificationCenter.default.post(name: .userDidLogout, object: nil)
    }

    func rateApp() {
        // Open App Store review page
        if let url = URL(string: "https://apps.apple.com/app/id123456789?action=write-review") {
            UIApplication.shared.open(url)
        }
    }

    func shareApp() {
        let text = "推荐你使用 BookPost，一款优秀的阅读应用！"
        let url = URL(string: "https://apps.apple.com/app/id123456789")!

        let activityVC = UIActivityViewController(activityItems: [text, url], applicationActivities: nil)

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - Notification Extension

extension Notification.Name {
    static let userDidLogout = Notification.Name("userDidLogout")
}

// MARK: - Placeholder Views

struct ProfileEditView: View {
    @Environment(\.dismiss) var dismiss
    @State private var displayName = "读书爱好者"
    @State private var bio = ""
    @State private var showImagePicker = false

    var body: some View {
        Form {
            Section {
                HStack {
                    Spacer()
                    Button {
                        showImagePicker = true
                    } label: {
                        VStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Image(systemName: "camera.fill")
                                        .foregroundColor(.blue)
                                )

                            Text("更换头像")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                    Spacer()
                }
            }

            Section {
                TextField("昵称", text: $displayName)

                TextField("个人简介", text: $bio, axis: .vertical)
                    .lineLimit(3...6)
            } header: {
                Text("基本信息")
            }
        }
        .navigationTitle("编辑资料")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("保存") {
                    // Save changes
                    dismiss()
                }
            }
        }
    }
}

struct AccountSecurityView: View {
    var body: some View {
        List {
            Section {
                NavigationLink {
                    Text("修改密码")
                } label: {
                    HStack {
                        Text("修改密码")
                        Spacer()
                    }
                }

                NavigationLink {
                    Text("绑定手机")
                } label: {
                    HStack {
                        Text("绑定手机")
                        Spacer()
                        Text("138****8888")
                            .foregroundColor(.secondary)
                    }
                }

                NavigationLink {
                    Text("绑定邮箱")
                } label: {
                    HStack {
                        Text("绑定邮箱")
                        Spacer()
                        Text("未绑定")
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section {
                NavigationLink {
                    Text("第三方账号")
                } label: {
                    Text("第三方账号绑定")
                }
            }

            Section {
                Button(role: .destructive) {
                    // Delete account
                } label: {
                    Text("注销账号")
                }
            }
        }
        .navigationTitle("账号与安全")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FontSettingsView: View {
    @State private var fontSize: Double = 18
    @State private var lineSpacing: Double = 1.5
    @State private var selectedFont = "系统默认"

    let fonts = ["系统默认", "苹方", "宋体", "楷体", "黑体"]

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("字号")
                        Spacer()
                        Text("\(Int(fontSize))")
                            .foregroundColor(.secondary)
                    }

                    Slider(value: $fontSize, in: 12...28, step: 1)
                }

                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("行距")
                        Spacer()
                        Text(String(format: "%.1f", lineSpacing))
                            .foregroundColor(.secondary)
                    }

                    Slider(value: $lineSpacing, in: 1.0...2.5, step: 0.1)
                }
            } header: {
                Text("字体大小")
            }

            Section {
                ForEach(fonts, id: \.self) { font in
                    Button {
                        selectedFont = font
                    } label: {
                        HStack {
                            Text(font)
                                .foregroundColor(.primary)

                            Spacer()

                            if selectedFont == font {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } header: {
                Text("字体")
            }

            Section {
                // Preview
                Text("人们曾在我身边来来去去，有些人我记得，有些人我不记得。但有一个人，我永远都忘不了她。")
                    .font(.system(size: fontSize))
                    .lineSpacing(CGFloat((lineSpacing - 1) * fontSize))
                    .padding()
            } header: {
                Text("预览")
            }
        }
        .navigationTitle("字体设置")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ThemeSettingsView: View {
    @State private var selectedTheme = "默认"

    let themes: [(name: String, bg: Color, text: Color)] = [
        ("默认", .white, .black),
        ("护眼", Color(red: 0.95, green: 0.93, blue: 0.87), .black),
        ("夜间", Color(red: 0.1, green: 0.1, blue: 0.1), .white),
        ("羊皮纸", Color(red: 0.96, green: 0.94, blue: 0.88), Color(red: 0.3, green: 0.2, blue: 0.1))
    ]

    var body: some View {
        List {
            Section {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(themes, id: \.name) { theme in
                        Button {
                            selectedTheme = theme.name
                        } label: {
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(theme.bg)
                                    .frame(height: 80)
                                    .overlay(
                                        Text("Aa")
                                            .font(.title)
                                            .foregroundColor(theme.text)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedTheme == theme.name ? Color.blue : Color.gray.opacity(0.3), lineWidth: selectedTheme == theme.name ? 2 : 1)
                                    )

                                Text(theme.name)
                                    .font(.caption)
                                    .foregroundColor(selectedTheme == theme.name ? .blue : .primary)
                            }
                        }
                    }
                }
                .padding(.vertical, 8)
            } header: {
                Text("主题")
            }

            Section {
                Toggle("跟随系统深色模式", isOn: .constant(true))
            }
        }
        .navigationTitle("阅读主题")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ReminderTimeSettingsView: View {
    @State private var reminderTime = Date()
    @State private var selectedDays: Set<Int> = [1, 2, 3, 4, 5, 6, 7]

    let weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

    var body: some View {
        List {
            Section {
                DatePicker("提醒时间", selection: $reminderTime, displayedComponents: .hourAndMinute)
            }

            Section {
                ForEach(1...7, id: \.self) { day in
                    Button {
                        if selectedDays.contains(day) {
                            selectedDays.remove(day)
                        } else {
                            selectedDays.insert(day)
                        }
                    } label: {
                        HStack {
                            Text(weekdays[day - 1])
                                .foregroundColor(.primary)

                            Spacer()

                            if selectedDays.contains(day) {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } header: {
                Text("重复")
            }
        }
        .navigationTitle("提醒时间")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySettingsView: View {
    @State private var profileVisibility = "公开"
    @State private var showReadingStatus = true
    @State private var showBookshelf = true
    @State private var allowMessages = true

    var body: some View {
        List {
            Section {
                Picker("主页可见性", selection: $profileVisibility) {
                    Text("公开").tag("公开")
                    Text("仅好友").tag("仅好友")
                    Text("私密").tag("私密")
                }
            }

            Section {
                Toggle("显示阅读状态", isOn: $showReadingStatus)
                Toggle("显示我的书架", isOn: $showBookshelf)
                Toggle("允许陌生人私信", isOn: $allowMessages)
            } header: {
                Text("社交隐私")
            }
        }
        .navigationTitle("隐私设置")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct BlockedUsersView: View {
    @State private var blockedUsers: [String] = []

    var body: some View {
        List {
            if blockedUsers.isEmpty {
                ContentUnavailableView(
                    "暂无黑名单",
                    systemImage: "person.crop.circle.badge.minus",
                    description: Text("被拉黑的用户将无法查看你的主页和向你发送消息")
                )
            } else {
                ForEach(blockedUsers, id: \.self) { user in
                    HStack {
                        Text(user)
                        Spacer()
                        Button("移除") {
                            blockedUsers.removeAll { $0 == user }
                        }
                        .foregroundColor(.red)
                    }
                }
            }
        }
        .navigationTitle("黑名单")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataExportView: View {
    @State private var isExporting = false

    var body: some View {
        List {
            Section {
                Text("你可以下载一份包含你所有数据的副本，包括阅读记录、笔记、评论等。")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Section {
                Button {
                    isExporting = true
                    // Export data
                } label: {
                    HStack {
                        Text("请求数据导出")
                        if isExporting {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
                .disabled(isExporting)
            }
        }
        .navigationTitle("下载数据")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DownloadSettingsView: View {
    @State private var wifiOnly = true
    @State private var autoDownload = false
    @State private var downloadQuality = "标准"

    var body: some View {
        List {
            Section {
                Toggle("仅在 Wi-Fi 下下载", isOn: $wifiOnly)
                Toggle("自动下载新书", isOn: $autoDownload)
            }

            Section {
                Picker("下载质量", selection: $downloadQuality) {
                    Text("高质量").tag("高质量")
                    Text("标准").tag("标准")
                    Text("节省空间").tag("节省空间")
                }
            } header: {
                Text("质量设置")
            }
        }
        .navigationTitle("下载设置")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HelpCenterView: View {
    var body: some View {
        List {
            Section {
                NavigationLink {
                    Text("常见问题")
                } label: {
                    HStack {
                        Image(systemName: "questionmark.circle")
                            .foregroundColor(.blue)
                        Text("常见问题")
                    }
                }

                NavigationLink {
                    Text("使用教程")
                } label: {
                    HStack {
                        Image(systemName: "book")
                            .foregroundColor(.green)
                        Text("使用教程")
                    }
                }
            }

            Section {
                NavigationLink {
                    FeedbackView()
                } label: {
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.orange)
                        Text("意见反馈")
                    }
                }

                Button {
                    // Open customer service
                } label: {
                    HStack {
                        Image(systemName: "message")
                            .foregroundColor(.purple)
                        Text("在线客服")
                            .foregroundColor(.primary)
                    }
                }
            }
        }
        .navigationTitle("帮助与反馈")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FeedbackView: View {
    @State private var feedbackType = "功能建议"
    @State private var content = ""
    @State private var contactInfo = ""

    let types = ["功能建议", "Bug 反馈", "内容问题", "其他"]

    var body: some View {
        Form {
            Section {
                Picker("反馈类型", selection: $feedbackType) {
                    ForEach(types, id: \.self) { type in
                        Text(type).tag(type)
                    }
                }
            }

            Section {
                TextField("请详细描述你的问题或建议", text: $content, axis: .vertical)
                    .lineLimit(5...10)
            } header: {
                Text("反馈内容")
            }

            Section {
                TextField("邮箱或手机号（选填）", text: $contactInfo)
            } header: {
                Text("联系方式")
            } footer: {
                Text("方便我们联系你了解更多情况")
            }

            Section {
                Button("提交反馈") {
                    // Submit feedback
                }
                .frame(maxWidth: .infinity)
                .disabled(content.isEmpty)
            }
        }
        .navigationTitle("意见反馈")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AboutView: View {
    var body: some View {
        List {
            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "book.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        Text("BookPost")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("让阅读成为习惯")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
            }

            Section {
                HStack {
                    Text("版本")
                    Spacer()
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                        .foregroundColor(.secondary)
                }

                HStack {
                    Text("构建号")
                    Spacer()
                    Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Link(destination: URL(string: "https://bookpost.app")!) {
                    HStack {
                        Text("官方网站")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .foregroundColor(.secondary)
                    }
                }

                Link(destination: URL(string: "https://weibo.com/bookpost")!) {
                    HStack {
                        Text("官方微博")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section {
                Text("© 2024 BookPost. All rights reserved.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("关于")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LegalView: View {
    var body: some View {
        List {
            NavigationLink {
                ScrollView {
                    Text("用户服务协议内容...")
                        .padding()
                }
                .navigationTitle("用户服务协议")
            } label: {
                Text("用户服务协议")
            }

            NavigationLink {
                ScrollView {
                    Text("隐私政策内容...")
                        .padding()
                }
                .navigationTitle("隐私政策")
            } label: {
                Text("隐私政策")
            }

            NavigationLink {
                ScrollView {
                    Text("版权声明内容...")
                        .padding()
                }
                .navigationTitle("版权声明")
            } label: {
                Text("版权声明")
            }
        }
        .navigationTitle("法律条款")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    SettingsView()
}
