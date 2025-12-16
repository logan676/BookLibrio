import Foundation

/// Configuration for Cloudflare R2 public access
///
/// This service manages the R2.dev public URL and provides URL conversion
/// utilities to transform API proxy paths to direct R2 public URLs.
///
/// ## Usage
/// 1. Enable R2.dev subdomain in Cloudflare Dashboard
/// 2. Update `r2PublicBaseURL` with your assigned URL
/// 3. The app will automatically use public URLs for faster access
///
/// ## Benefits of Public Access
/// - Faster response times (direct access, no Worker proxy)
/// - Reduced Worker CPU usage
/// - Native support for Range requests (audio/video seeking)
/// - Lower operational costs at scale
struct R2Config {

    /// The R2.dev public base URL (e.g., "https://pub-xxxxx.r2.dev")
    /// Set to nil to disable public access and use API proxy instead
    ///
    /// To get your R2.dev URL:
    /// 1. Go to Cloudflare Dashboard → R2
    /// 2. Select your bucket → Settings
    /// 3. Enable "R2.dev subdomain" under Public Access
    /// 4. Copy the generated URL
    static let r2PublicBaseURL: String? = "https://pub-73af92edb8bd4843bcd42a213279531e.r2.dev"

    /// Whether R2 public access is enabled
    static var isPublicAccessEnabled: Bool {
        return r2PublicBaseURL != nil && !r2PublicBaseURL!.isEmpty
    }

    /// API base URL (fallback when public access is disabled)
    static let apiBaseURL = "https://bookpost-api-hono.fly.dev"

    // MARK: - URL Conversion

    /// Converts an API proxy path or coverUrl to a public R2 URL
    ///
    /// Examples:
    /// - `/api/r2-covers/ebooks/book.jpg` → `https://pub-xxx.r2.dev/covers/ebooks/book.jpg`
    /// - `/api/avatars/user.jpg` → `https://pub-xxx.r2.dev/avatars/user.jpg`
    /// - `https://external.com/cover.jpg` → `https://external.com/cover.jpg` (unchanged)
    ///
    /// - Parameter urlString: The original URL string (relative or absolute)
    /// - Parameter useThumbnail: If true, returns thumbnail URL for covers
    /// - Returns: The converted URL, or original if public access is disabled
    static func convertToPublicURL(_ urlString: String?, useThumbnail: Bool = false) -> URL? {
        guard let urlString = urlString, !urlString.isEmpty else { return nil }

        // If it's already an absolute external URL, return as-is
        if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
            // Check if it's our API URL that should be converted
            if let baseURL = r2PublicBaseURL,
               urlString.hasPrefix(apiBaseURL) {
                let relativePath = String(urlString.dropFirst(apiBaseURL.count))
                return convertRelativePathToPublicURL(relativePath, baseURL: baseURL, useThumbnail: useThumbnail)
            }
            return URL(string: urlString)
        }

        // Handle relative paths
        if let baseURL = r2PublicBaseURL {
            return convertRelativePathToPublicURL(urlString, baseURL: baseURL, useThumbnail: useThumbnail)
        } else {
            // Fallback to API proxy
            var finalUrl = apiBaseURL + urlString
            if useThumbnail && urlString.contains("/r2-covers/") {
                finalUrl += "?thumb=1"
            }
            return URL(string: finalUrl)
        }
    }

    /// Converts a relative API path to R2 public URL
    private static func convertRelativePathToPublicURL(_ path: String, baseURL: String, useThumbnail: Bool) -> URL? {
        var r2Key: String?

        // Convert API proxy paths to R2 keys
        if path.hasPrefix("/api/r2-covers/") {
            // /api/r2-covers/ebooks/book.jpg → covers/ebooks/book.jpg
            let filename = String(path.dropFirst("/api/r2-covers/".count))
            if useThumbnail {
                r2Key = "covers/thumbs/" + filename
            } else {
                r2Key = "covers/" + filename
            }
        } else if path.hasPrefix("/api/avatars/") {
            // /api/avatars/user.jpg → avatars/user.jpg
            r2Key = "avatars/" + String(path.dropFirst("/api/avatars/".count))
        } else if path.hasPrefix("/") {
            // Other relative paths - try to use as-is
            r2Key = String(path.dropFirst())
        }

        if let key = r2Key {
            return URL(string: baseURL + "/" + key)
        }

        // Fallback to API proxy
        return URL(string: apiBaseURL + path)
    }

    // MARK: - Direct R2 Key URLs

    /// Builds a public URL directly from an R2 key
    ///
    /// - Parameter r2Key: The R2 object key (e.g., "ebooks/book.epub")
    /// - Returns: Public URL if enabled, nil otherwise
    static func publicURL(forKey r2Key: String) -> URL? {
        guard let baseURL = r2PublicBaseURL else { return nil }
        return URL(string: baseURL + "/" + r2Key)
    }

    /// Builds a public URL for an ebook file
    /// - Parameter s3Key: The s3Key from database (e.g., "ebooks/book.epub")
    static func ebookURL(s3Key: String) -> URL? {
        return publicURL(forKey: s3Key)
    }

    /// Builds a public URL for a magazine file
    /// - Parameter s3Key: The s3Key from database
    static func magazineURL(s3Key: String) -> URL? {
        return publicURL(forKey: s3Key)
    }

    /// Builds a public URL for a magazine page image
    /// - Parameters:
    ///   - magazineId: The magazine ID
    ///   - page: The page number
    static func magazinePageURL(magazineId: Int, page: Int) -> URL? {
        return publicURL(forKey: "magazine_pages/\(magazineId)/\(page).jpg")
    }

    /// Builds a public URL for an audio file
    /// - Parameter s3Key: The s3Key from database
    static func audioURL(s3Key: String) -> URL? {
        return publicURL(forKey: s3Key)
    }

    /// Builds a public URL for a cover image
    /// - Parameters:
    ///   - type: Cover type ("ebooks", "magazines", "rankings")
    ///   - filename: The filename
    ///   - thumbnail: Whether to use thumbnail version
    static func coverURL(type: String, filename: String, thumbnail: Bool = false) -> URL? {
        let prefix = thumbnail ? "covers/thumbs" : "covers"
        return publicURL(forKey: "\(prefix)/\(type)/\(filename)")
    }

    /// Builds a public URL for a user avatar
    /// - Parameter filename: The avatar filename
    static func avatarURL(filename: String) -> URL? {
        return publicURL(forKey: "avatars/\(filename)")
    }
}
