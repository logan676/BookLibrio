# BookPost iOS

Native iOS client for BookPost digital library, built with Swift and SwiftUI.

## Features

- Browse and read ebooks (PDF/EPUB)
- Browse and read magazines (PDF)
- Manage physical book collection
- Reading progress sync across devices
- Offline caching support
- Native iOS design

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | Swift 5.9+ |
| UI | SwiftUI |
| Architecture | MVVM |
| Concurrency | async/await |
| PDF Reader | PDFKit |
| Networking | URLSession |
| Storage | UserDefaults + FileManager |

## Project Structure

```
BookPost/
├── App/
│   ├── BookPostApp.swift       # App entry point
│   ├── ContentView.swift       # Root view
│   └── MainTabView.swift       # Tab navigation
├── Models/
│   ├── User.swift
│   ├── Ebook.swift
│   ├── Magazine.swift
│   ├── Book.swift
│   └── ReadingHistory.swift
├── Views/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   ├── Home/
│   │   └── HomeView.swift
│   ├── Ebooks/
│   │   ├── EbooksView.swift
│   │   └── EbookDetailView.swift
│   ├── Magazines/
│   │   ├── MagazinesView.swift
│   │   └── MagazineDetailView.swift
│   ├── Books/
│   │   └── BooksView.swift
│   ├── Profile/
│   │   └── ProfileView.swift
│   ├── Reader/
│   │   └── PDFReaderView.swift
│   └── Components/
│       ├── BookCoverView.swift
│       ├── SearchBarView.swift
│       └── LoadingView.swift
├── ViewModels/
│   ├── HomeViewModel.swift
│   └── EbooksViewModel.swift
├── Services/
│   ├── APIClient.swift         # Network layer
│   └── AuthManager.swift       # Authentication
└── Utilities/
    └── Extensions.swift
```

## Setup

### Prerequisites

- Xcode 15.0 or later
- iOS 16.0+ deployment target
- macOS Sonoma or later (recommended)

### 1. Open Project

```bash
cd packages/ios
open BookPost.xcodeproj
```

Or create a new Xcode project and add the source files.

### 2. Configure API Endpoint

Edit `Services/APIClient.swift`:

```swift
#if DEBUG
private let baseURL = "http://localhost:3001"
#else
private let baseURL = "https://bookpost-api.fly.dev"
#endif
```

### 3. Build and Run

Select a simulator or device and press `Cmd + R`.

## Architecture

### MVVM Pattern

```
┌─────────────────────────────────────┐
│              View                   │
│         (SwiftUI Views)             │
│                                     │
│   @StateObject viewModel            │
│   @EnvironmentObject authManager    │
├─────────────────────────────────────┤
│           ViewModel                 │
│      (@MainActor class)             │
│                                     │
│   @Published properties             │
│   async functions                   │
├─────────────────────────────────────┤
│           Services                  │
│   (APIClient + AuthManager)         │
└─────────────────────────────────────┘
```

### Data Flow

```
View
  │
  ├── User interaction
  │
  ▼
ViewModel
  │
  ├── Call API
  │
  ▼
APIClient
  │
  ├── Network request
  │
  ▼
Server Response
  │
  ├── Decode JSON
  │
  ▼
ViewModel
  │
  ├── Update @Published
  │
  ▼
View (re-renders)
```

## Key Components

### APIClient

Centralized network layer with:
- Generic request builder
- JSON encoding/decoding
- Error handling
- File downloads

```swift
// Example usage
let response = try await APIClient.shared.getEbooks(category: 1)
```

### AuthManager

Handles authentication state:
- Login/Register
- Token storage
- Session management

```swift
// Usage in views
@EnvironmentObject var authManager: AuthManager

// Check login state
if authManager.isLoggedIn {
    MainTabView()
} else {
    LoginView()
}
```

### PDFReaderView

Native PDF viewing with PDFKit:
- Page navigation
- Zoom support
- Reading progress tracking

## API Endpoints Used

| Feature | Endpoint |
|---------|----------|
| Login | `POST /api/auth/login` |
| Register | `POST /api/auth/register` |
| Get User | `GET /api/auth/me` |
| List Ebooks | `GET /api/ebooks` |
| Get Ebook | `GET /api/ebooks/:id` |
| Download Ebook | `GET /api/ebooks/:id/file` |
| List Magazines | `GET /api/magazines` |
| Get Magazine | `GET /api/magazines/:id` |
| Download Magazine | `GET /api/magazines/:id/file` |
| Reading History | `GET/POST /api/reading-history` |

## Building for Release

### 1. Configure Signing

1. Open project in Xcode
2. Select project in navigator
3. Go to "Signing & Capabilities"
4. Select your team
5. Set bundle identifier

### 2. Archive for App Store

1. Select "Any iOS Device" as destination
2. Product > Archive
3. Distribute App

### 3. TestFlight

1. Upload archive to App Store Connect
2. Submit for TestFlight review
3. Distribute to testers

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Features Breakdown

### Authentication
- Email/password login
- User registration
- Persistent sessions
- Logout functionality

### Ebooks
- Grid layout with covers
- Category filtering
- Search functionality
- PDF reader integration

### Magazines
- Publisher filtering
- Year filtering
- PDF reader with page tracking

### Reading History
- Continue reading cards
- Last page tracking
- Cross-device sync

### Profile
- User information display
- Logout option
- Settings (future)

## Testing

### Unit Tests

```bash
xcodebuild test -scheme BookPost -destination 'platform=iOS Simulator,name=iPhone 15'
```

### UI Tests

```bash
xcodebuild test -scheme BookPostUITests -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Contributing

1. Follow Swift style guide
2. Use SwiftUI best practices
3. Write clear commit messages
4. Test on multiple device sizes

## License

MIT
