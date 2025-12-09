# BookPost Android

Native Android client for BookPost digital library, built with Kotlin and Jetpack Compose.

## Features

- Browse and read ebooks (PDF/EPUB)
- Browse and read magazines (PDF)
- Manage physical book collection
- Reading progress sync across devices
- Offline caching support
- Material3 design

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | Kotlin |
| UI | Jetpack Compose + Material3 |
| Architecture | MVVM + Clean Architecture |
| DI | Hilt |
| Networking | Retrofit + OkHttp |
| Serialization | Kotlin Serialization |
| Local DB | Room |
| Preferences | DataStore |
| Image Loading | Coil |
| PDF Reader | AndroidPdfViewer |

## Project Structure

```
app/src/main/java/com/bookpost/
├── BookPostApp.kt              # Application class
├── MainActivity.kt             # Main entry point
├── di/                         # Hilt modules
│   ├── AppModule.kt
│   ├── NetworkModule.kt
│   └── DatabaseModule.kt
├── data/
│   ├── remote/
│   │   ├── api/                # Retrofit interfaces
│   │   ├── dto/                # Data transfer objects
│   │   └── interceptor/        # OkHttp interceptors
│   ├── local/
│   │   ├── db/                 # Room database
│   │   └── datastore/          # Preferences
│   └── repository/             # Repository implementations
├── domain/
│   └── model/                  # Domain models
└── ui/
    ├── theme/                  # Material theme
    ├── navigation/             # Navigation graph
    ├── components/             # Reusable composables
    └── screen/
        ├── auth/               # Login/Register
        ├── home/               # Home screen
        ├── ebooks/             # Ebooks list/detail
        ├── magazines/          # Magazines list/detail
        ├── books/              # Physical books
        ├── profile/            # User profile
        └── reader/             # PDF reader
```

## Setup

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 35
- Kotlin 2.0+

### 1. Open Project

Open `packages/android` folder in Android Studio.

### 2. Configure API Endpoint

Create `local.properties` in the android folder:

```properties
sdk.dir=/path/to/Android/sdk

# API configuration
API_BASE_URL=https://bookpost-api.fly.dev

# For local development (use 10.0.2.2 for emulator)
API_BASE_URL_DEBUG=http://10.0.2.2:3001
```

### 3. Build and Run

```bash
# Using Gradle wrapper
./gradlew assembleDebug

# Or use Android Studio
# Click Run > Run 'app'
```

## Architecture

### Layers

```
┌─────────────────────────────────────┐
│             UI Layer                │
│  (Compose Screens + ViewModels)     │
├─────────────────────────────────────┤
│           Domain Layer              │
│      (Models + Use Cases)           │
├─────────────────────────────────────┤
│            Data Layer               │
│ (Repositories + Data Sources)       │
└─────────────────────────────────────┘
```

### Data Flow

```
UI (Composable)
    │
    ▼
ViewModel (StateFlow)
    │
    ▼
Repository
    │
    ├──► Remote (Retrofit API)
    │
    └──► Local (Room + DataStore)
```

## Key Components

### Authentication

- Bearer token authentication
- Automatic token refresh
- Secure token storage with DataStore

### Offline Support

- Room database for caching ebooks/magazines metadata
- PDF files cached in app's cache directory
- Reading progress synced when online

### PDF Reader

- Uses `android-pdf-viewer` library
- Supports page navigation
- Saves reading position automatically

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

### 1. Create Signing Key

```bash
keytool -genkey -v -keystore bookpost.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bookpost
```

### 2. Configure Signing

Create `signing.properties`:

```properties
storeFile=bookpost.jks
storePassword=your_password
keyAlias=bookpost
keyPassword=your_password
```

### 3. Build Release APK

```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

### 4. Build Release Bundle (for Play Store)

```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

## Dependencies

```kotlin
// Core
implementation("androidx.core:core-ktx:1.15.0")
implementation("androidx.activity:activity-compose:1.9.3")

// Compose
implementation(platform("androidx.compose:compose-bom:2024.11.00"))
implementation("androidx.compose.material3:material3")
implementation("androidx.navigation:navigation-compose:2.8.4")

// Hilt
implementation("com.google.dagger:hilt-android:2.52")
implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

// Networking
implementation("com.squareup.retrofit2:retrofit:2.11.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

// Local Storage
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.datastore:datastore-preferences:1.1.1")

// Image Loading
implementation("io.coil-kt:coil-compose:2.7.0")

// PDF Viewer
implementation("com.github.barteksc:android-pdf-viewer:3.2.0-beta.1")
```

## Contributing

1. Follow Kotlin coding conventions
2. Use meaningful commit messages
3. Write unit tests for ViewModels
4. Test on multiple screen sizes

## License

MIT
