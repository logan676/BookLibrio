import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int, String?)
    case unauthorized
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "无效的 URL"
        case .networkError(let error):
            return "网络错误: \(error.localizedDescription)"
        case .decodingError(let error):
            return "数据解析错误: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return message ?? "服务器错误 (\(code))"
        case .unauthorized:
            return "未授权，请重新登录"
        case .unknown:
            return "未知错误"
        }
    }
}

class APIClient {
    static let shared = APIClient()

    #if DEBUG
    private let baseURL = "http://localhost:3001"
    #else
    private let baseURL = "https://bookpost-api.fly.dev"
    #endif

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
    }

    // MARK: - Request Building

    private func buildRequest(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        queryItems: [URLQueryItem]? = nil,
        requiresAuth: Bool = false
    ) throws -> URLRequest {
        var components = URLComponents(string: baseURL + path)
        components?.queryItems = queryItems?.filter { $0.value != nil }

        guard let url = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            request.httpBody = body
        }

        if requiresAuth, let token = AuthManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }

            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                let message = String(data: data, encoding: .utf8)
                throw APIError.serverError(httpResponse.statusCode, message)
            }

            return try decoder.decode(T.self, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Auth API

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(["email": email, "password": password])
        let request = try buildRequest(path: "/api/auth/login", method: "POST", body: body)
        return try await perform(request)
    }

    func register(username: String, email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode([
            "username": username,
            "email": email,
            "password": password
        ])
        let request = try buildRequest(path: "/api/auth/register", method: "POST", body: body)
        return try await perform(request)
    }

    func refreshToken(_ refreshToken: String) async throws -> RefreshTokenResponse {
        let body = try JSONEncoder().encode(["refreshToken": refreshToken])
        let request = try buildRequest(path: "/api/auth/refresh", method: "POST", body: body)
        return try await perform(request)
    }

    func getMe() async throws -> UserResponse {
        let request = try buildRequest(path: "/api/auth/me", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - Ebooks API

    func getEbooks(category: Int? = nil, search: String? = nil, limit: Int? = nil, offset: Int? = nil) async throws -> EbooksResponse {
        var queryItems: [URLQueryItem] = []
        if let category = category { queryItems.append(URLQueryItem(name: "category", value: "\(category)")) }
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }
        if let offset = offset { queryItems.append(URLQueryItem(name: "offset", value: "\(offset)")) }

        let request = try buildRequest(path: "/api/ebooks", queryItems: queryItems.isEmpty ? nil : queryItems)
        return try await perform(request)
    }

    func getEbook(id: Int) async throws -> EbookResponse {
        let request = try buildRequest(path: "/api/ebooks/\(id)")
        return try await perform(request)
    }

    func getEbookCategories() async throws -> EbookCategoriesResponse {
        let request = try buildRequest(path: "/api/ebook-categories")
        return try await perform(request)
    }

    func downloadEbookFile(id: Int) async throws -> URL {
        let request = try buildRequest(path: "/api/ebooks/\(id)/file", requiresAuth: true)
        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0, nil)
        }

        // Move to cache directory
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let pdfDir = cacheDir.appendingPathComponent("pdfs/ebooks", isDirectory: true)
        try FileManager.default.createDirectory(at: pdfDir, withIntermediateDirectories: true)

        let destURL = pdfDir.appendingPathComponent("\(id).pdf")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        return destURL
    }

    // MARK: - Magazines API

    func getMagazines(publisher: Int? = nil, year: Int? = nil, search: String? = nil, limit: Int? = nil, offset: Int? = nil) async throws -> MagazinesResponse {
        var queryItems: [URLQueryItem] = []
        if let publisher = publisher { queryItems.append(URLQueryItem(name: "publisher", value: "\(publisher)")) }
        if let year = year { queryItems.append(URLQueryItem(name: "year", value: "\(year)")) }
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }
        if let offset = offset { queryItems.append(URLQueryItem(name: "offset", value: "\(offset)")) }

        let request = try buildRequest(path: "/api/magazines", queryItems: queryItems.isEmpty ? nil : queryItems)
        return try await perform(request)
    }

    func getMagazine(id: Int) async throws -> MagazineResponse {
        let request = try buildRequest(path: "/api/magazines/\(id)")
        return try await perform(request)
    }

    func getPublishers() async throws -> PublishersResponse {
        let request = try buildRequest(path: "/api/magazines/publishers")
        return try await perform(request)
    }

    func downloadMagazineFile(id: Int) async throws -> URL {
        let request = try buildRequest(path: "/api/magazines/\(id)/file", requiresAuth: true)
        let (tempURL, response) = try await session.download(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0, nil)
        }

        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let pdfDir = cacheDir.appendingPathComponent("pdfs/magazines", isDirectory: true)
        try FileManager.default.createDirectory(at: pdfDir, withIntermediateDirectories: true)

        let destURL = pdfDir.appendingPathComponent("\(id).pdf")
        if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
        }
        try FileManager.default.moveItem(at: tempURL, to: destURL)

        return destURL
    }

    // MARK: - Books API

    func getBooks(search: String? = nil, author: String? = nil) async throws -> BooksResponse {
        var queryItems: [URLQueryItem] = []
        if let search = search, !search.isEmpty { queryItems.append(URLQueryItem(name: "search", value: search)) }
        if let author = author, !author.isEmpty { queryItems.append(URLQueryItem(name: "author", value: author)) }

        let request = try buildRequest(path: "/api/books", queryItems: queryItems.isEmpty ? nil : queryItems, requiresAuth: true)
        return try await perform(request)
    }

    func getBook(id: Int) async throws -> BookResponse {
        let request = try buildRequest(path: "/api/books/\(id)", requiresAuth: true)
        return try await perform(request)
    }

    // MARK: - Reading History API

    func getReadingHistory(limit: Int? = nil) async throws -> ReadingHistoryResponse {
        var queryItems: [URLQueryItem] = []
        if let limit = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(limit)")) }

        let request = try buildRequest(path: "/api/reading-history", queryItems: queryItems.isEmpty ? nil : queryItems, requiresAuth: true)
        return try await perform(request)
    }

    func updateReadingHistory(itemType: ItemType, itemId: Int, title: String?, coverUrl: String?, lastPage: Int?) async throws {
        let payload = UpdateReadingHistoryRequest(
            itemType: itemType.rawValue,
            itemId: itemId,
            title: title,
            coverUrl: coverUrl,
            lastPage: lastPage
        )
        let body = try JSONEncoder().encode(payload)
        let request = try buildRequest(path: "/api/reading-history", method: "POST", body: body, requiresAuth: true)
        let _: ReadingHistoryResponse = try await perform(request)
    }
}
