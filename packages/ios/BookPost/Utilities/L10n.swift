import Foundation

/// Localization helper for BookLibrio
/// Usage: L10n.tab.home, L10n.auth.login, etc.
enum L10n {

    // MARK: - Common
    enum Common {
        static var appName: String { NSLocalizedString("app.name", comment: "") }
        static var loading: String { NSLocalizedString("common.loading", comment: "") }
        static var retry: String { NSLocalizedString("common.retry", comment: "") }
        static var cancel: String { NSLocalizedString("common.cancel", comment: "") }
        static var confirm: String { NSLocalizedString("common.confirm", comment: "") }
        static var ok: String { NSLocalizedString("common.ok", comment: "") }
        static var error: String { NSLocalizedString("common.error", comment: "") }
        static var success: String { NSLocalizedString("common.success", comment: "") }
        static var search: String { NSLocalizedString("common.search", comment: "") }
        static var all: String { NSLocalizedString("common.all", comment: "") }
        static var noContent: String { NSLocalizedString("common.noContent", comment: "") }
        static var unknownTitle: String { NSLocalizedString("common.unknownTitle", comment: "") }
        static var user: String { NSLocalizedString("common.user", comment: "") }
    }

    // MARK: - Tab Bar
    enum Tab {
        static var home: String { NSLocalizedString("tab.home", comment: "") }
        static var ebooks: String { NSLocalizedString("tab.ebooks", comment: "") }
        static var magazines: String { NSLocalizedString("tab.magazines", comment: "") }
        static var books: String { NSLocalizedString("tab.books", comment: "") }
        static var profile: String { NSLocalizedString("tab.profile", comment: "") }
    }

    // MARK: - Auth
    enum Auth {
        static var login: String { NSLocalizedString("auth.login", comment: "") }
        static var register: String { NSLocalizedString("auth.register", comment: "") }
        static var logout: String { NSLocalizedString("auth.logout", comment: "") }
        static var email: String { NSLocalizedString("auth.email", comment: "") }
        static var password: String { NSLocalizedString("auth.password", comment: "") }
        static var loginToAccount: String { NSLocalizedString("auth.loginToAccount", comment: "") }
        static var createAccount: String { NSLocalizedString("auth.createAccount", comment: "") }
        static var noAccount: String { NSLocalizedString("auth.noAccount", comment: "") }
        static var hasAccount: String { NSLocalizedString("auth.hasAccount", comment: "") }
        static var passwordMinLength: String { NSLocalizedString("auth.passwordMinLength", comment: "") }
        static var logoutConfirm: String { NSLocalizedString("auth.logoutConfirm", comment: "") }
        static var logoutMessage: String { NSLocalizedString("auth.logoutMessage", comment: "") }
    }

    // MARK: - Home
    enum Home {
        static var continueReading: String { NSLocalizedString("home.continueReading", comment: "") }
        static var quickAccess: String { NSLocalizedString("home.quickAccess", comment: "") }
        static var noReadingHistory: String { NSLocalizedString("home.noReadingHistory", comment: "") }

        static func page(_ number: Int) -> String {
            String(format: NSLocalizedString("home.page", comment: ""), number)
        }
    }

    // MARK: - Ebooks
    enum Ebooks {
        static var title: String { NSLocalizedString("ebooks.title", comment: "") }
        static var noEbooks: String { NSLocalizedString("ebooks.noEbooks", comment: "") }
        static var startReading: String { NSLocalizedString("ebooks.startReading", comment: "") }

        static func count(_ number: Int) -> String {
            String(format: NSLocalizedString("ebooks.count", comment: ""), number)
        }
    }

    // MARK: - Magazines
    enum Magazines {
        static var title: String { NSLocalizedString("magazines.title", comment: "") }
        static var noMagazines: String { NSLocalizedString("magazines.noMagazines", comment: "") }
        static var allPublishers: String { NSLocalizedString("magazines.allPublishers", comment: "") }

        static func count(_ number: Int) -> String {
            String(format: NSLocalizedString("magazines.count", comment: ""), number)
        }

        static func year(_ year: Int) -> String {
            String(format: NSLocalizedString("magazines.year", comment: ""), year)
        }

        static func pageCount(_ count: Int) -> String {
            String(format: NSLocalizedString("magazines.pageCount", comment: ""), count)
        }
    }

    // MARK: - Books
    enum Books {
        static var title: String { NSLocalizedString("books.title", comment: "") }
        static var noBooks: String { NSLocalizedString("books.noBooks", comment: "") }
    }

    // MARK: - Profile
    enum Profile {
        static var title: String { NSLocalizedString("profile.title", comment: "") }
        static var readingHistory: String { NSLocalizedString("profile.readingHistory", comment: "") }
        static var settings: String { NSLocalizedString("profile.settings", comment: "") }
        static var myBookshelf: String { NSLocalizedString("profile.myBookshelf", comment: "") }
        static var readingNotes: String { NSLocalizedString("profile.readingNotes", comment: "") }
        static var readingGoals: String { NSLocalizedString("profile.readingGoals", comment: "") }
        static var readingStreak: String { NSLocalizedString("profile.readingStreak", comment: "") }
        static var activity: String { NSLocalizedString("profile.activity", comment: "") }
        static var leaderboard: String { NSLocalizedString("profile.leaderboard", comment: "") }
        static var myBadges: String { NSLocalizedString("profile.myBadges", comment: "") }
    }

    // MARK: - Bookshelf
    enum Bookshelf {
        static var title: String { NSLocalizedString("bookshelf.title", comment: "") }
        static var empty: String { NSLocalizedString("bookshelf.empty", comment: "") }
        static var browseBooks: String { NSLocalizedString("bookshelf.browseBooks", comment: "") }
        static var noBooks: String { NSLocalizedString("bookshelf.noBooks", comment: "") }
        static var wantToRead: String { NSLocalizedString("bookshelf.wantToRead", comment: "") }
        static var reading: String { NSLocalizedString("bookshelf.reading", comment: "") }
        static var finished: String { NSLocalizedString("bookshelf.finished", comment: "") }
        static var abandoned: String { NSLocalizedString("bookshelf.abandoned", comment: "") }
        static var ebook: String { NSLocalizedString("bookshelf.ebook", comment: "") }
        static var magazine: String { NSLocalizedString("bookshelf.magazine", comment: "") }
        static var sortByAdded: String { NSLocalizedString("bookshelf.sortByAdded", comment: "") }
        static var sortByUpdated: String { NSLocalizedString("bookshelf.sortByUpdated", comment: "") }
        static var sortByTitle: String { NSLocalizedString("bookshelf.sortByTitle", comment: "") }
        static var sortByProgress: String { NSLocalizedString("bookshelf.sortByProgress", comment: "") }
        static var sort: String { NSLocalizedString("bookshelf.sort", comment: "") }
        static var type: String { NSLocalizedString("bookshelf.type", comment: "") }
    }

    // MARK: - Notes
    enum Notes {
        static var title: String { NSLocalizedString("notes.title", comment: "") }
        static var searchPlaceholder: String { NSLocalizedString("notes.searchPlaceholder", comment: "") }
        static var empty: String { NSLocalizedString("notes.empty", comment: "") }
        static var noNotesForYear: String { NSLocalizedString("notes.noNotesForYear", comment: "") }
        static var noSearchResults: String { NSLocalizedString("notes.noSearchResults", comment: "") }
        static var startReading: String { NSLocalizedString("notes.startReading", comment: "") }
        static var loadMore: String { NSLocalizedString("notes.loadMore", comment: "") }
        static var detail: String { NSLocalizedString("notes.detail", comment: "") }
        static var loadFailed: String { NSLocalizedString("notes.loadFailed", comment: "") }
        static var content: String { NSLocalizedString("notes.content", comment: "") }
        static var underlines: String { NSLocalizedString("notes.underlines", comment: "") }
        static var comments: String { NSLocalizedString("notes.comments", comment: "") }

        static func year(_ year: Int) -> String {
            String(format: NSLocalizedString("notes.year", comment: ""), year)
        }

        static func underlineCount(_ count: Int) -> String {
            String(format: NSLocalizedString("notes.underlineCount", comment: ""), count)
        }

        static func commentCount(_ count: Int) -> String {
            String(format: NSLocalizedString("notes.commentCount", comment: ""), count)
        }
    }

    // MARK: - Goals
    enum Goals {
        static var title: String { NSLocalizedString("goals.title", comment: "") }
        static var setGoal: String { NSLocalizedString("goals.setGoal", comment: "") }
        static var selectGoal: String { NSLocalizedString("goals.selectGoal", comment: "") }
        static var completed: String { NSLocalizedString("goals.completed", comment: "") }
        static var target: String { NSLocalizedString("goals.target", comment: "") }
        static var read: String { NSLocalizedString("goals.read", comment: "") }
        static var remaining: String { NSLocalizedString("goals.remaining", comment: "") }
        static var noGoalSet: String { NSLocalizedString("goals.noGoalSet", comment: "") }
        static var adjustGoal: String { NSLocalizedString("goals.adjustGoal", comment: "") }
        static var currentStreak: String { NSLocalizedString("goals.currentStreak", comment: "") }
        static var maxStreak: String { NSLocalizedString("goals.maxStreak", comment: "") }
        static var light: String { NSLocalizedString("goals.light", comment: "") }
        static var moderate: String { NSLocalizedString("goals.moderate", comment: "") }
        static var standard: String { NSLocalizedString("goals.standard", comment: "") }
        static var intensive: String { NSLocalizedString("goals.intensive", comment: "") }
    }

    // MARK: - Stats
    enum Stats {
        static var title: String { NSLocalizedString("stats.title", comment: "") }
        static var overview: String { NSLocalizedString("stats.overview", comment: "") }
        static var totalReadingTime: String { NSLocalizedString("stats.totalReadingTime", comment: "") }
        static var readingDays: String { NSLocalizedString("stats.readingDays", comment: "") }
        static var booksFinished: String { NSLocalizedString("stats.booksFinished", comment: "") }
        static var currentStreak: String { NSLocalizedString("stats.currentStreak", comment: "") }
        static var longestStreak: String { NSLocalizedString("stats.longestStreak", comment: "") }
        static var days: String { NSLocalizedString("stats.days", comment: "") }
        static var less: String { NSLocalizedString("stats.less", comment: "") }
        static var more: String { NSLocalizedString("stats.more", comment: "") }
        static var booksRead: String { NSLocalizedString("stats.booksRead", comment: "") }
        static var underlines: String { NSLocalizedString("stats.underlines", comment: "") }
        static var ideas: String { NSLocalizedString("stats.ideas", comment: "") }

        // Weekday abbreviations
        static var sun: String { NSLocalizedString("stats.weekday.sun", comment: "") }
        static var mon: String { NSLocalizedString("stats.weekday.mon", comment: "") }
        static var tue: String { NSLocalizedString("stats.weekday.tue", comment: "") }
        static var wed: String { NSLocalizedString("stats.weekday.wed", comment: "") }
        static var thu: String { NSLocalizedString("stats.weekday.thu", comment: "") }
        static var fri: String { NSLocalizedString("stats.weekday.fri", comment: "") }
        static var sat: String { NSLocalizedString("stats.weekday.sat", comment: "") }
    }

    // MARK: - Leaderboard
    enum Leaderboard {
        static var title: String { NSLocalizedString("leaderboard.title", comment: "") }
        static var friends: String { NSLocalizedString("leaderboard.friends", comment: "") }
        static var global: String { NSLocalizedString("leaderboard.global", comment: "") }
        static var loadFailed: String { NSLocalizedString("leaderboard.loadFailed", comment: "") }
        static var weeklyRanking: String { NSLocalizedString("leaderboard.weeklyRanking", comment: "") }
        static var settlementTime: String { NSLocalizedString("leaderboard.settlementTime", comment: "") }
        static var myRanking: String { NSLocalizedString("leaderboard.myRanking", comment: "") }
        static var participants: String { NSLocalizedString("leaderboard.participants", comment: "") }
        static var readingTime: String { NSLocalizedString("leaderboard.readingTime", comment: "") }
        static var readingDays: String { NSLocalizedString("leaderboard.readingDays", comment: "") }
        static var rankChange: String { NSLocalizedString("leaderboard.rankChange", comment: "") }
        static var fullRanking: String { NSLocalizedString("leaderboard.fullRanking", comment: "") }
    }

    // MARK: - Activity
    enum Activity {
        static var title: String { NSLocalizedString("activity.title", comment: "") }
        static var following: String { NSLocalizedString("activity.following", comment: "") }
        static var global: String { NSLocalizedString("activity.global", comment: "") }
        static var empty: String { NSLocalizedString("activity.empty", comment: "") }
        static var followUsers: String { NSLocalizedString("activity.followUsers", comment: "") }
        static var noActivity: String { NSLocalizedString("activity.noActivity", comment: "") }
        static var loadMore: String { NSLocalizedString("activity.loadMore", comment: "") }
    }

    // MARK: - User Profile
    enum UserProfile {
        static var title: String { NSLocalizedString("userProfile.title", comment: "") }
        static var loadFailed: String { NSLocalizedString("userProfile.loadFailed", comment: "") }
        static var followers: String { NSLocalizedString("userProfile.followers", comment: "") }
        static var following: String { NSLocalizedString("userProfile.following", comment: "") }
        static var mutualFollow: String { NSLocalizedString("userProfile.mutualFollow", comment: "") }
        static var follow: String { NSLocalizedString("userProfile.follow", comment: "") }
        static var unfollow: String { NSLocalizedString("userProfile.unfollow", comment: "") }
        static var readingTime: String { NSLocalizedString("userProfile.readingTime", comment: "") }
        static var booksFinished: String { NSLocalizedString("userProfile.booksFinished", comment: "") }
        static var streak: String { NSLocalizedString("userProfile.streak", comment: "") }
    }

    // MARK: - Follow
    enum Follow {
        static var followers: String { NSLocalizedString("follow.followers", comment: "") }
        static var following: String { NSLocalizedString("follow.following", comment: "") }
        static var noFollowers: String { NSLocalizedString("follow.noFollowers", comment: "") }
        static var noFollowing: String { NSLocalizedString("follow.noFollowing", comment: "") }
        static var loadMore: String { NSLocalizedString("follow.loadMore", comment: "") }
    }

    // MARK: - Review
    enum Review {
        static var rating: String { NSLocalizedString("review.rating", comment: "") }
        static var stars: String { NSLocalizedString("review.stars", comment: "") }
        static var detail: String { NSLocalizedString("review.detail", comment: "") }
    }

    // MARK: - Reader
    enum Reader {
        static var close: String { NSLocalizedString("reader.close", comment: "") }
        static var downloadFailed: String { NSLocalizedString("reader.downloadFailed", comment: "") }
        static var openFailed: String { NSLocalizedString("reader.openFailed", comment: "") }
        static var loading: String { NSLocalizedString("reader.loading", comment: "") }
        static var settings: String { NSLocalizedString("reader.settings", comment: "") }
        static var tableOfContents: String { NSLocalizedString("reader.tableOfContents", comment: "") }
        static var highlights: String { NSLocalizedString("reader.highlights", comment: "") }
        static var bookmarks: String { NSLocalizedString("reader.bookmarks", comment: "") }
        static var done: String { NSLocalizedString("reader.done", comment: "") }
        static var reset: String { NSLocalizedString("reader.reset", comment: "") }
        static var noTableOfContents: String { NSLocalizedString("reader.noTableOfContents", comment: "") }

        // Settings sections
        static var brightness: String { NSLocalizedString("reader.brightness", comment: "") }
        static var backgroundColor: String { NSLocalizedString("reader.backgroundColor", comment: "") }
        static var fontSize: String { NSLocalizedString("reader.fontSize", comment: "") }
        static var fontFamily: String { NSLocalizedString("reader.fontFamily", comment: "") }
        static var lineSpacing: String { NSLocalizedString("reader.lineSpacing", comment: "") }
        static var margins: String { NSLocalizedString("reader.margins", comment: "") }
        static var other: String { NSLocalizedString("reader.other", comment: "") }
        static var keepScreenOn: String { NSLocalizedString("reader.keepScreenOn", comment: "") }
        static var previewText: String { NSLocalizedString("reader.previewText", comment: "") }

        // Color modes
        static var colorWhite: String { NSLocalizedString("reader.color.white", comment: "") }
        static var colorSepia: String { NSLocalizedString("reader.color.sepia", comment: "") }
        static var colorGreen: String { NSLocalizedString("reader.color.green", comment: "") }
        static var colorDark: String { NSLocalizedString("reader.color.dark", comment: "") }

        // Font families
        static var fontSystem: String { NSLocalizedString("reader.font.system", comment: "") }
        static var fontSongti: String { NSLocalizedString("reader.font.songti", comment: "") }
        static var fontKaiti: String { NSLocalizedString("reader.font.kaiti", comment: "") }
        static var fontHeiti: String { NSLocalizedString("reader.font.heiti", comment: "") }

        // Line spacing
        static var spacingCompact: String { NSLocalizedString("reader.spacing.compact", comment: "") }
        static var spacingNormal: String { NSLocalizedString("reader.spacing.normal", comment: "") }
        static var spacingRelaxed: String { NSLocalizedString("reader.spacing.relaxed", comment: "") }
        static var spacingLoose: String { NSLocalizedString("reader.spacing.loose", comment: "") }

        // Margin sizes
        static var marginSmall: String { NSLocalizedString("reader.margin.small", comment: "") }
        static var marginMedium: String { NSLocalizedString("reader.margin.medium", comment: "") }
        static var marginLarge: String { NSLocalizedString("reader.margin.large", comment: "") }

        static func page(_ number: Int) -> String {
            String(format: NSLocalizedString("reader.page", comment: ""), number)
        }

        static func pageOf(_ current: Int, _ total: Int) -> String {
            String(format: NSLocalizedString("reader.pageOf", comment: ""), current, total)
        }

        static func totalPages(_ count: Int) -> String {
            String(format: NSLocalizedString("reader.totalPages", comment: ""), count)
        }
    }
}
