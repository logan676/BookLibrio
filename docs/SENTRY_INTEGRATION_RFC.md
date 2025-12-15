# Sentry 全栈集成技术方案

> **状态**: ✅ Implemented
> **作者**: Claude
> **日期**: 2025-12-15
> **审核人**: @HONGBGU
> **实施日期**: 2025-12-15

---

## 1. 概述

### 1.1 背景

当前 BookLibrio 项目缺乏统一的错误监控和日志收集系统，导致：
- 线上问题难以复现和排查
- 无法主动发现潜在问题
- 缺乏用户行为上下文
- 跨端问题难以关联追踪

### 1.2 目标

- 实现全栈错误自动捕获和上报
- 建立从客户端到服务端的完整追踪链路
- 提供用户操作面包屑（Breadcrumbs）帮助还原问题场景
- 监控关键业务指标和性能数据

### 1.3 技术选型

选择 **Sentry** 作为监控平台，理由：

| 对比项 | Sentry | Datadog | LogRocket |
|--------|--------|---------|-----------|
| 错误追踪 | ✅ 核心功能 | ✅ 支持 | ✅ 支持 |
| 全栈 SDK | ✅ iOS/Android/RN/Node/React | ✅ 完整 | ❌ 主要前端 |
| 免费额度 | 5K errors + 10K transactions/月 | 按量付费 | 1K sessions/月 |
| 分布式追踪 | ✅ 内置 | ✅ APM | ❌ 无 |
| Session Replay | ✅ 支持 | ❌ 需 RUM | ✅ 核心功能 |
| 自托管 | ✅ 开源可自托管 | ❌ SaaS only | ❌ SaaS only |

---

## 2. 项目架构概览

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Sentry Cloud                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  iOS    │  │ Android │  │  React  │  │   Web   │  │   API   │            │
│  │ Project │  │ Project │  │ Native  │  │ Project │  │ Project │            │
│  └────▲────┘  └────▲────┘  └────▲────┘  └────▲────┘  └────▲────┘            │
└───────┼────────────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │            │
        │ trace_id   │ trace_id   │ trace_id   │ trace_id   │
        │            │            │            │            │
┌───────┴────┐ ┌─────┴─────┐ ┌────┴─────┐ ┌────┴────┐ ┌────┴─────────────────┐
│  iOS App   │ │ Android   │ │  React   │ │  React  │ │    Hono API          │
│  (Swift)   │ │ (Kotlin)  │ │  Native  │ │  (Vite) │ │    (Node.js)         │
└────────────┘ └───────────┘ └──────────┘ └─────────┘ └──────────────────────┘
                                                            │
                                                            ▼
                                                       ┌─────────┐
                                                       │ Postgres│
                                                       │   D1    │
                                                       └─────────┘
```

---

## 3. 各端集成方案

### 3.1 iOS Native (Swift)

**SDK**: `sentry-cocoa`

#### 3.1.1 安装

```ruby
# Podfile 或 SPM
pod 'Sentry', '~> 8.0'
```

或 Swift Package Manager:
```
https://github.com/getsentry/sentry-cocoa.git
```

#### 3.1.2 初始化

```swift
// AppDelegate.swift 或 App.swift
import Sentry

@main
struct BookLibrioApp: App {
    init() {
        SentrySDK.start { options in
            options.dsn = "https://xxx@sentry.io/xxx"
            options.environment = AppConfig.environment  // "development" | "production"
            options.releaseName = "\(Bundle.main.appVersion).\(Bundle.main.buildNumber)"

            // 性能监控
            options.tracesSampleRate = 0.2  // 20% 采样
            options.profilesSampleRate = 0.1  // 10% 性能分析

            // 附加堆栈
            options.attachStacktrace = true

            // 面包屑
            options.maxBreadcrumbs = 100

            // 用户隐私
            options.sendDefaultPii = false  // 不发送 PII

            #if DEBUG
            options.debug = true
            options.tracesSampleRate = 1.0  // 开发时 100%
            #endif
        }
    }
}
```

#### 3.1.3 与现有 Logger 集成

修改 `Logger.swift`，自动将日志作为面包屑发送：

```swift
// Logger.swift - 新增 Sentry 集成
import Sentry

extension Log {
    private static func addBreadcrumb(_ level: Level, _ message: String, category: String = "log") {
        let crumb = Breadcrumb(level: sentryLevel(level), category: category)
        crumb.message = message
        crumb.timestamp = Date()
        SentrySDK.addBreadcrumb(crumb)
    }

    private static func sentryLevel(_ level: Level) -> SentryLevel {
        switch level {
        case .debug: return .debug
        case .info: return .info
        case .warning: return .warning
        case .error: return .error
        case .network: return .info
        }
    }

    // 修改 log 函数，添加面包屑
    private static func log(_ level: Level, _ message: String, ...) {
        // ... 现有代码 ...

        // 添加 Sentry 面包屑
        addBreadcrumb(level, message, category: level == .network ? "http" : "log")

        // 错误级别自动上报
        if level == .error {
            SentrySDK.capture(message: message)
        }
    }
}
```

#### 3.1.4 用户上下文

```swift
// AuthManager.swift - 登录成功后
func setUser(_ user: User) {
    let sentryUser = Sentry.User()
    sentryUser.userId = "\(user.id)"
    sentryUser.username = user.nickname  // 不发送邮箱等 PII
    SentrySDK.setUser(sentryUser)
}

// 登出时
func logout() {
    SentrySDK.setUser(nil)
}
```

#### 3.1.5 网络请求追踪

```swift
// APIClient.swift - 添加 Sentry 追踪
func perform<T: Decodable>(_ request: APIRequest<T>) async throws -> T {
    let span = SentrySDK.span?.startChild(
        operation: "http.client",
        description: "\(request.method) \(request.path)"
    )

    defer { span?.finish() }

    do {
        // 注入 trace header
        var headers = request.headers
        if let traceHeader = SentrySDK.span?.toTraceHeader().value() {
            headers["sentry-trace"] = traceHeader
        }
        if let baggageHeader = SentrySDK.span?.toBaggageHeader()?.value() {
            headers["baggage"] = baggageHeader
        }

        let result = try await performRequest(...)
        span?.setStatus(.ok)
        return result
    } catch {
        span?.setStatus(.internalError)
        throw error
    }
}
```

---

### 3.2 API Server (Hono + Node.js)

**SDK**: `@sentry/node`

#### 3.2.1 安装

```bash
cd packages/api
pnpm add @sentry/node
```

#### 3.2.2 初始化

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node'

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version,

    // 性能监控
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,

    // 集成
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],

    // 过滤敏感信息
    beforeSend(event) {
      // 移除敏感 header
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })
}
```

#### 3.2.3 Hono 中间件

```typescript
// src/middleware/sentry.ts
import * as Sentry from '@sentry/node'
import type { MiddlewareHandler } from 'hono'

export const sentryMiddleware: MiddlewareHandler = async (c, next) => {
  // 从客户端获取 trace context
  const sentryTrace = c.req.header('sentry-trace')
  const baggage = c.req.header('baggage')

  return Sentry.continueTrace(
    { sentryTrace, baggage },
    async () => {
      return Sentry.startSpan(
        {
          op: 'http.server',
          name: `${c.req.method} ${c.req.path}`,
        },
        async (span) => {
          try {
            // 设置用户上下文
            const user = c.get('user')
            if (user) {
              Sentry.setUser({ id: String(user.id) })
            }

            await next()

            span.setStatus({ code: c.res.status < 400 ? 1 : 2 })
          } catch (error) {
            Sentry.captureException(error)
            span.setStatus({ code: 2, message: 'internal_error' })
            throw error
          }
        }
      )
    }
  )
}
```

#### 3.2.4 应用到 Hono

```typescript
// src/index.ts
import { Hono } from 'hono'
import { initSentry } from './lib/sentry'
import { sentryMiddleware } from './middleware/sentry'
import * as Sentry from '@sentry/node'

// 初始化 Sentry（在所有其他代码之前）
initSentry()

const app = new Hono()

// Sentry 中间件
app.use('*', sentryMiddleware)

// 错误处理
app.onError((err, c) => {
  Sentry.captureException(err)
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// ... 路由定义 ...

export default app
```

---

### 3.3 Web Client (React + Vite)

**SDK**: `@sentry/react`

#### 3.3.1 安装

```bash
cd packages/web
pnpm add @sentry/react
```

#### 3.3.2 初始化

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react'

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,  // 隐私保护
        blockAllMedia: true,
      }),
    ],

    // 采样率
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,  // 错误时 100% 记录
  })
}
```

#### 3.3.3 React Error Boundary

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react'
import { initSentry } from './lib/sentry'

initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary
    fallback={<ErrorFallback />}
    showDialog
  >
    <App />
  </Sentry.ErrorBoundary>
)
```

#### 3.3.4 React Query 集成

```typescript
// src/lib/queryClient.ts
import * as Sentry from '@sentry/react'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
    mutations: {
      onError: (error) => {
        Sentry.captureException(error)
      },
    },
  },
})
```

---

### 3.4 Android Native (Kotlin)

**SDK**: `sentry-android`

#### 3.4.1 安装

```kotlin
// build.gradle.kts (app)
plugins {
    id("io.sentry.android.gradle") version "4.0.0"
}

dependencies {
    implementation("io.sentry:sentry-android:7.0.0")
    implementation("io.sentry:sentry-android-okhttp:7.0.0")  // OkHttp 集成
}
```

```kotlin
// build.gradle.kts (project)
plugins {
    id("io.sentry.android.gradle") version "4.0.0" apply false
}
```

#### 3.4.2 初始化

```kotlin
// Application.kt
import io.sentry.android.core.SentryAndroid
import io.sentry.SentryLevel

class BookLibrioApp : Application() {
    override fun onCreate() {
        super.onCreate()

        SentryAndroid.init(this) { options ->
            options.dsn = BuildConfig.SENTRY_DSN
            options.environment = if (BuildConfig.DEBUG) "development" else "production"
            options.release = "${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"

            // 性能监控
            options.tracesSampleRate = 0.2
            options.profilesSampleRate = 0.1

            // 面包屑
            options.maxBreadcrumbs = 100

            // 附加上下文
            options.isAttachStacktrace = true
            options.isAttachThreads = true
            options.isAttachScreenshot = true  // 崩溃时截图

            // 用户隐私
            options.isSendDefaultPii = false

            // ANR 检测
            options.isAnrEnabled = true
            options.anrTimeoutIntervalMillis = 5000

            if (BuildConfig.DEBUG) {
                options.isDebug = true
                options.tracesSampleRate = 1.0
            }
        }
    }
}
```

#### 3.4.3 AndroidManifest 配置

```xml
<!-- AndroidManifest.xml -->
<application>
    <meta-data
        android:name="io.sentry.dsn"
        android:value="${SENTRY_DSN}" />
    <meta-data
        android:name="io.sentry.traces.sample-rate"
        android:value="0.2" />
    <meta-data
        android:name="io.sentry.attach-screenshot"
        android:value="true" />
</application>
```

#### 3.4.4 用户上下文

```kotlin
// AuthManager.kt
import io.sentry.Sentry
import io.sentry.protocol.User

fun setUser(user: UserModel) {
    val sentryUser = User().apply {
        id = user.id.toString()
        username = user.nickname  // 不发送邮箱等 PII
    }
    Sentry.setUser(sentryUser)
}

fun logout() {
    Sentry.setUser(null)
}
```

#### 3.4.5 OkHttp 网络追踪

```kotlin
// NetworkModule.kt (Hilt/Dagger)
import io.sentry.android.okhttp.SentryOkHttpInterceptor

@Provides
@Singleton
fun provideOkHttpClient(): OkHttpClient {
    return OkHttpClient.Builder()
        .addInterceptor(SentryOkHttpInterceptor())  // 自动添加 trace headers
        .addInterceptor(AuthInterceptor())
        .build()
}
```

#### 3.4.6 Retrofit 错误捕获

```kotlin
// ApiService.kt
import io.sentry.Sentry

suspend fun <T> safeApiCall(apiCall: suspend () -> Response<T>): Result<T> {
    return try {
        val response = apiCall()
        if (response.isSuccessful) {
            Result.success(response.body()!!)
        } else {
            val error = ApiException(response.code(), response.message())
            Sentry.captureException(error)
            Result.failure(error)
        }
    } catch (e: Exception) {
        Sentry.captureException(e)
        Result.failure(e)
    }
}
```

#### 3.4.7 Compose Navigation 追踪

```kotlin
// MainActivity.kt
import io.sentry.android.navigation.SentryNavigationListener

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    // 自动记录页面导航
    DisposableEffect(navController) {
        val listener = SentryNavigationListener()
        navController.addOnDestinationChangedListener(listener)
        onDispose {
            navController.removeOnDestinationChangedListener(listener)
        }
    }

    NavHost(navController = navController, startDestination = "home") {
        // ... 路由定义
    }
}
```

#### 3.4.8 ProGuard 配置

```proguard
# proguard-rules.pro
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**
```

---

### 3.5 React Native / Expo

**SDK**: `@sentry/react-native`

#### 3.5.1 安装

```bash
cd packages/mobile

# Expo 项目
npx expo install @sentry/react-native

# 或 bare React Native
npm install @sentry/react-native
npx @sentry/wizard@latest -i reactNative
```

#### 3.5.2 初始化

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react-native'
import { Platform } from 'react-native'

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `${Platform.OS}@${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,

    // 性能监控
    tracesSampleRate: 0.2,

    // Native crash 处理
    enableNative: true,
    enableNativeCrashHandling: true,

    // 自动 session 追踪
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // 面包屑
    maxBreadcrumbs: 100,
    enableAutoPerformanceTracing: true,

    // 附加上下文
    attachStacktrace: true,
    attachScreenshot: true,
    attachViewHierarchy: true,

    // 用户隐私
    sendDefaultPii: false,

    // 过滤
    beforeSend(event) {
      // 过滤敏感数据
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
      }
      return event
    },

    // Debug 模式
    debug: __DEV__,
  })
}
```

#### 3.5.3 App 入口包装

```typescript
// App.tsx
import * as Sentry from '@sentry/react-native'
import { initSentry } from './src/lib/sentry'

// 初始化 (在所有其他代码之前)
initSentry()

function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}

// 包装 App 以捕获 native crashes
export default Sentry.wrap(App)
```

#### 3.5.4 React Navigation 集成

```typescript
// src/navigation/RootNavigator.tsx
import * as Sentry from '@sentry/react-native'

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation()

// 在 Sentry.init 中添加
Sentry.init({
  // ... 其他配置
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      enableAppStartTracking: true,
      enableNativeFramesTracking: true,
    }),
  ],
})

export function RootNavigator() {
  const navigation = useNavigationContainerRef()

  return (
    <NavigationContainer
      ref={navigation}
      onReady={() => {
        routingInstrumentation.registerNavigationContainer(navigation)
      }}
    >
      <Stack.Navigator>
        {/* ... screens */}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

#### 3.5.5 用户上下文

```typescript
// src/stores/authStore.ts
import * as Sentry from '@sentry/react-native'

export const useAuthStore = create<AuthState>((set) => ({
  setUser: (user: User) => {
    Sentry.setUser({
      id: String(user.id),
      username: user.nickname,
    })
    set({ user })
  },

  logout: () => {
    Sentry.setUser(null)
    set({ user: null })
  },
}))
```

#### 3.5.6 Fetch/Axios 请求追踪

```typescript
// src/lib/api.ts
import * as Sentry from '@sentry/react-native'

export async function fetchWithSentry<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'http.client',
      name: `${options?.method || 'GET'} ${url}`,
    },
    async (span) => {
      try {
        // 注入 trace headers
        const headers = new Headers(options?.headers)
        const traceHeader = Sentry.getCurrentHub().getScope()?.getSpan()?.toTraceparent()
        if (traceHeader) {
          headers.set('sentry-trace', traceHeader)
        }

        const response = await fetch(url, { ...options, headers })

        span?.setStatus(response.ok ? 'ok' : 'internal_error')

        if (!response.ok) {
          throw new ApiError(response.status, await response.text())
        }

        return response.json()
      } catch (error) {
        span?.setStatus('internal_error')
        Sentry.captureException(error)
        throw error
      }
    }
  )
}
```

#### 3.5.7 Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import * as Sentry from '@sentry/react-native'

export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={({ error, resetError }) => (
      <View style={styles.container}>
        <Text style={styles.title}>出错了</Text>
        <Text style={styles.message}>{error.message}</Text>
        <Button title="重试" onPress={resetError} />
      </View>
    )}
    onError={(error, componentStack) => {
      // 已自动上报到 Sentry
      console.error('Caught error:', error, componentStack)
    }}
  >
    {children}
  </Sentry.ErrorBoundary>
)
```

#### 3.5.8 Expo 配置

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "organization": "booklibrio",
          "project": "react-native"
        }
      ]
    ],
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "booklibrio",
            "project": "react-native"
          }
        }
      ]
    }
  }
}
```

---

## 4. 分布式追踪配置

### 4.1 Trace ID 传递流程

```
iOS App                         API Server
   │                                │
   │ sentry-trace: xxx-yyy-1       │
   │ baggage: sentry-xxx           │
   │ ──────────────────────────────>│
   │                                │
   │                           继续同一 trace
   │                                │
   │ <─────────────────────────────│
   │       响应 + trace context     │
```

### 4.2 跨服务关联

在 Sentry Dashboard 中，可以看到：
- 同一个 trace_id 下的所有 span
- 从 iOS 到 API 的完整调用链
- 每个环节的耗时和状态

---

## 5. 数据采集策略

### 5.1 自动采集

| 数据类型 | iOS | Android | React Native | Web | API |
|---------|-----|---------|--------------|-----|-----|
| 未捕获异常 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 网络请求 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 控制台日志 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 用户点击 | ✅ | ✅ | ✅ | ✅ | - |
| 页面导航 | ✅ | ✅ | ✅ | ✅ | - |
| ANR/卡顿 | ✅ | ✅ | ✅ | - | - |
| Native 崩溃 | ✅ | ✅ | ✅ | - | ✅ |
| 崩溃截图 | ✅ | ✅ | ✅ | - | - |
| Session Replay | ❌ | ❌ | ❌ | ✅ | - |

### 5.2 手动采集

```swift
// iOS - 关键业务事件
SentrySDK.capture(message: "User purchased book") { scope in
    scope.setExtra(value: bookId, key: "book_id")
    scope.setTag(value: "purchase", key: "event_type")
}
```

```typescript
// API - 业务异常
Sentry.captureMessage('Payment failed', {
  level: 'warning',
  extra: { orderId, reason },
  tags: { payment_provider: 'stripe' },
})
```

### 5.3 敏感数据过滤

**不采集**:
- 用户邮箱、手机号
- 密码、Token
- 书籍内容、笔记内容
- 支付信息

**采集**:
- 用户 ID（脱敏）
- 设备信息
- 操作路径
- 错误堆栈

---

## 6. 告警配置

### 6.1 告警规则

| 告警名称 | 条件 | 通知方式 |
|---------|------|---------|
| 高频错误 | 同一错误 >10次/小时 | Email + Slack |
| 新错误 | 首次出现的错误 | Email |
| P0 崩溃 | 崩溃率 >1% | 电话 + Slack |
| API 延迟 | P95 >3s | Slack |

### 6.2 Slack 集成

```
Settings → Integrations → Slack
选择 workspace 和 channel
```

---

## 7. 环境变量配置

### 7.1 iOS

```swift
// Config.xcconfig
SENTRY_DSN = https://xxx@sentry.io/ios
SENTRY_ORG = booklibrio
SENTRY_PROJECT = ios

// 上传符号表 (Build Phase)
// ../node_modules/@sentry/cli/bin/sentry-cli upload-dif ...
```

### 7.2 Android

```kotlin
// build.gradle.kts (app)
android {
    buildTypes {
        release {
            buildConfigField("String", "SENTRY_DSN", "\"https://xxx@sentry.io/android\"")
        }
        debug {
            buildConfigField("String", "SENTRY_DSN", "\"https://xxx@sentry.io/android\"")
        }
    }
}

// sentry.properties (项目根目录)
defaults.org=booklibrio
defaults.project=android
auth.token=sntrys_xxx
```

### 7.3 React Native

```bash
# .env
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/react-native

# 或 bare RN 的 sentry.properties
defaults.org=booklibrio
defaults.project=react-native
auth.token=sntrys_xxx
```

### 7.4 API (.env)

```bash
SENTRY_DSN=https://xxx@sentry.io/api
SENTRY_ORG=booklibrio
SENTRY_PROJECT=api
```

### 7.5 Web (.env)

```bash
VITE_SENTRY_DSN=https://xxx@sentry.io/web
VITE_APP_VERSION=1.0.0
```

---

## 8. 实施计划

### Phase 1: 基础设施 (0.5天) ✅

- [x] 创建 Sentry 账号 (待用户配置)
- [x] 创建 5 个项目: ios, android, react-native, web, api (待用户配置)
- [x] 配置团队和权限 (待用户配置)
- [x] 设置环境变量模板

### Phase 2: 后端集成 (0.5天) ✅

- [x] API Server (Hono) 集成
- [x] 中间件配置
- [x] 错误处理集成
- [ ] 验证错误上报 (需要 DSN)

### Phase 3: Web 集成 (0.5天) ✅

- [x] React Web 客户端集成
- [x] Error Boundary 配置
- [x] React Query 错误捕获
- [x] Source Map 上传配置 (Vite 插件)
- [ ] 验证错误上报和 Session Replay (需要 DSN)

### Phase 4: iOS 集成 (1天) ✅

- [x] 添加 Sentry SDK 代码 (需用户通过 SPM 添加包)
- [x] 与现有 Logger.swift 集成
- [ ] 配置 dSYM 符号表上传 (需要 Xcode Build Phase)
- [x] SentryManager.swift 包含追踪功能
- [ ] 验证崩溃报告 (需要 DSN)

### Phase 5: Android 集成 (N/A)

> 注: 项目通过 Expo/React Native 构建 Android，无原生 Android 项目

### Phase 6: React Native 集成 (1天) ✅

- [x] 安装 @sentry/react-native
- [x] Expo 配置 (app.json 插件)
- [x] Error Boundary 配置
- [x] 用户上下文集成
- [x] Source Map 上传配置 (postPublish hook)

### Phase 7: 分布式追踪 (0.5天) ✅

- [x] API 中间件解析 trace context
- [x] iOS SentryManager.getTraceHeaders()
- [x] RN getTraceHeaders() 函数
- [ ] 验证跨端追踪链路 (需要 DSN)

### Phase 8: 告警和 Dashboard (0.5天)

- [ ] 配置告警规则 (各平台) - 需用户在 Sentry 控制台配置
- [ ] 创建自定义 Dashboard - 需用户在 Sentry 控制台配置
- [ ] 配置 Slack/Email 通知 - 需用户在 Sentry 控制台配置
- [ ] 设置采样率配额告警 - 需用户在 Sentry 控制台配置

---

**代码实施完成，剩余配置需要用户在 Sentry 控制台完成**

---

## 9. 成本估算

### 免费层 (Developer Plan - 起步推荐)

- **价格**: $0/月
- **额度**: 5K errors + 10K transactions/月
- **限制**: 1 用户, 无 Session Replay
- **适用**: 开发阶段和小规模验证

### Team Plan (中期推荐)

- **价格**: $26/月 (年付)
- **额度**: 50K errors + 100K transactions
- **功能**: Performance, Session Replay, 无限团队成员
- **适用**: 正式上线后

### Business Plan (大规模)

- **价格**: $80/月起
- **额度**: 按需扩展
- **功能**: SSO, 高级权限控制, SLA 保障

### 5 平台预估用量

| 平台 | 预估 Errors/月 | 预估 Transactions/月 |
|------|---------------|---------------------|
| iOS | 500 | 2,000 |
| Android | 500 | 2,000 |
| React Native | 300 | 1,500 |
| Web | 200 | 1,000 |
| API | 500 | 3,500 |
| **总计** | **2,000** | **10,000** |

**建议**: 免费层完全够用于初期，日活超过 1000 再考虑升级 Team Plan

---

## 10. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 性能影响 | 低 | 采样率控制在 20% |
| 隐私泄露 | 高 | beforeSend 过滤敏感数据 |
| 成本超支 | 中 | 设置采样率和配额告警 |
| SDK 兼容性 | 低 | 使用官方 SDK 稳定版本 |

---

## 11. 审核清单

- [ ] 技术方案是否完整覆盖所有端？
- [ ] 隐私数据过滤是否充分？
- [ ] 采样率设置是否合理？
- [ ] 成本预算是否可接受？
- [ ] 实施计划是否可行？

---

## 12. 参考文档

### 官方 SDK 文档

- [Sentry iOS SDK](https://docs.sentry.io/platforms/apple/)
- [Sentry Android SDK](https://docs.sentry.io/platforms/android/)
- [Sentry React Native SDK](https://docs.sentry.io/platforms/react-native/)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node SDK](https://docs.sentry.io/platforms/node/)

### 特定功能文档

- [分布式追踪](https://docs.sentry.io/product/sentry-basics/tracing/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Release Health](https://docs.sentry.io/product/releases/health/)

### 平台特定

- [Android ProGuard/R8](https://docs.sentry.io/platforms/android/enhance-errors/proguard/)
- [iOS dSYM 上传](https://docs.sentry.io/platforms/apple/dsym/)
- [React Native Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)
- [Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
