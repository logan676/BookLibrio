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
    }

    // MARK: - Reader
    enum Reader {
        static var close: String { NSLocalizedString("reader.close", comment: "") }
        static var downloadFailed: String { NSLocalizedString("reader.downloadFailed", comment: "") }
        static var openFailed: String { NSLocalizedString("reader.openFailed", comment: "") }
    }
}
