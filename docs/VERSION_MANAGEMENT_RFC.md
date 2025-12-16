# BookLibrio 全栈版本管理方案

> **状态**: ✅ Implemented
> **作者**: Claude
> **日期**: 2025-12-16
> **审核人**: @HONGBGU

---

## 1. 背景与动机

### 1.1 当前问题

| 平台 | 当前版本 | 版本文件位置 |
|------|---------|-------------|
| Root Monorepo | `0.1.0` | `package.json` |
| Web Frontend | `0.1.0` | `packages/web/package.json` |
| API Backend | `1.0.0` | `packages/api/package.json` |
| Shared Library | `0.1.0` | `packages/shared/package.json` |
| React Native | `1.0.0` | `packages/mobile/app.json` |
| iOS Native | `1.0` (build 1) | `packages/ios/BookLibrio.xcodeproj/project.pbxproj` |
| Android Native | `1.0.0` (code 1) | `packages/android/app/build.gradle.kts` |

**主要问题**:
1. 版本号不一致（0.1.0 vs 1.0.0）
2. 无自动化版本管理
3. 发布时需要手动修改 7+ 个文件
4. Sentry 无法有效追踪版本回归

### 1.2 Sentry 集成需求

Sentry 依赖准确的版本号进行：
- **Release Health** - 监控每个版本的崩溃率
- **Regression Detection** - 检测新版本引入的问题
- **Issue Grouping** - 按版本分组问题
- **Source Maps** - 关联正确版本的符号表/Source Maps

当前 Sentry release 格式：
```
iOS:     1.0+1        (MARKETING_VERSION+CURRENT_PROJECT_VERSION)
Android: 1.0.0+1      (versionName+versionCode)
API:     1.0.0        (package.json version)
Web:     0.1.0        (package.json version)
```

---

## 2. 版本策略选择

### 选项 A: 统一版本号 (Recommended)

所有平台使用相同的语义化版本号：

```
v1.2.3
│ │ └── Patch: Bug fixes, 小改动
│ └──── Minor: 新功能, 向后兼容
└────── Major: 重大变更, 可能不兼容
```

**优点**:
- 简单直观，所有平台版本一致
- Sentry 可以轻松关联前后端问题
- 用户和开发者都清楚当前版本

**缺点**:
- 即使只改了 API，所有平台版本号都会变
- 可能导致版本号增长较快

### 选项 B: 独立版本号

每个平台独立管理版本：

```
API:     v2.1.0
Web:     v1.5.2
iOS:     v1.3.0
Android: v1.3.0
Mobile:  v1.2.1
```

**优点**:
- 每个平台版本号反映自身变更
- 版本号增长更有意义

**缺点**:
- 管理复杂
- 难以判断兼容性
- Sentry 追踪更复杂

### 选项 C: 混合策略 (Alternative)

客户端统一版本，服务端独立版本：

```
Clients (iOS/Android/Web/Mobile): v1.2.3 (统一)
API Backend: v2.1.0 (独立)
```

**优点**:
- 客户端保持一致性
- API 可以独立迭代

**缺点**:
- 需要维护兼容性矩阵

---

## 3. 推荐方案: 统一版本号

### 3.1 版本号格式

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

示例:
1.0.0           # 正式版本
1.1.0-beta.1    # Beta 版本
1.1.0-rc.1      # Release Candidate
1.1.0+20231216  # 带构建日期
```

### 3.2 平台特定格式

| 平台 | 版本格式 | 示例 |
|------|---------|------|
| iOS | `MAJOR.MINOR.PATCH` + Build Number | `1.2.3` (build 45) |
| Android | `MAJOR.MINOR.PATCH` + Version Code | `1.2.3` (code 10203) |
| API | `MAJOR.MINOR.PATCH` | `1.2.3` |
| Web | `MAJOR.MINOR.PATCH` | `1.2.3` |
| Mobile | `MAJOR.MINOR.PATCH` | `1.2.3` |

### 3.3 Build Number / Version Code 策略

**iOS Build Number**: 递增整数，每次构建 +1
```
1.0.0 build 1
1.0.0 build 2  (bug fix rebuild)
1.0.1 build 3
1.1.0 build 4
```

**Android Version Code**: 编码版本号
```
versionCode = MAJOR * 10000 + MINOR * 100 + PATCH

1.0.0  → 10000
1.0.1  → 10001
1.2.3  → 10203
2.0.0  → 20000
```

### 3.4 Sentry Release 命名

```
iOS:     booklibrio-ios@1.2.3+45
Android: booklibrio-android@1.2.3+10203
API:     booklibrio-api@1.2.3
Web:     booklibrio-web@1.2.3
Mobile:  booklibrio-mobile@1.2.3
```

---

## 4. 实现方案

### 4.1 版本配置文件

创建统一的版本配置文件 `version.json`：

```json
{
  "version": "1.2.3",
  "buildNumber": 45,
  "releaseDate": "2025-12-16",
  "changelog": "https://github.com/user/booklibrio/releases/tag/v1.2.3"
}
```

### 4.2 版本同步脚本

创建 `scripts/bump-version.ts`：

```typescript
#!/usr/bin/env npx ts-node

/**
 * 全栈版本同步工具
 *
 * Usage:
 *   npx ts-node scripts/bump-version.ts patch   # 1.0.0 → 1.0.1
 *   npx ts-node scripts/bump-version.ts minor   # 1.0.0 → 1.1.0
 *   npx ts-node scripts/bump-version.ts major   # 1.0.0 → 2.0.0
 *   npx ts-node scripts/bump-version.ts 1.2.3   # 设置指定版本
 */

import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

// 需要更新的文件
const VERSION_FILES = {
  // Node.js packages
  'package.json': updatePackageJson,
  'packages/api/package.json': updatePackageJson,
  'packages/web/package.json': updatePackageJson,
  'packages/shared/package.json': updatePackageJson,
  'packages/mobile/package.json': updatePackageJson,
  'packages/mobile/app.json': updateAppJson,

  // Native apps
  'packages/ios/BookLibrio.xcodeproj/project.pbxproj': updateXcodeProject,
  'packages/android/app/build.gradle.kts': updateGradleKts,

  // Version config
  'version.json': updateVersionJson,
}

function updatePackageJson(content: string, version: string): string {
  const json = JSON.parse(content)
  json.version = version
  return JSON.stringify(json, null, 2) + '\n'
}

function updateAppJson(content: string, version: string): string {
  const json = JSON.parse(content)
  json.expo.version = version
  return JSON.stringify(json, null, 2) + '\n'
}

function updateXcodeProject(content: string, version: string): string {
  // Update MARKETING_VERSION
  return content.replace(
    /MARKETING_VERSION = [\d.]+;/g,
    `MARKETING_VERSION = ${version};`
  )
}

function updateGradleKts(content: string, version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  const versionCode = major * 10000 + minor * 100 + patch

  return content
    .replace(/versionCode = \d+/, `versionCode = ${versionCode}`)
    .replace(/versionName = "[^"]+"/, `versionName = "${version}"`)
}

function updateVersionJson(content: string, version: string): string {
  let json = {}
  try {
    json = JSON.parse(content)
  } catch {}

  return JSON.stringify({
    ...json,
    version,
    buildNumber: (json.buildNumber || 0) + 1,
    releaseDate: new Date().toISOString().split('T')[0],
  }, null, 2) + '\n'
}

// ... main function implementation
```

### 4.3 NPM Scripts

在根目录 `package.json` 添加：

```json
{
  "scripts": {
    "version:patch": "ts-node scripts/bump-version.ts patch",
    "version:minor": "ts-node scripts/bump-version.ts minor",
    "version:major": "ts-node scripts/bump-version.ts major",
    "version:set": "ts-node scripts/bump-version.ts",
    "version:check": "ts-node scripts/check-version.ts"
  }
}
```

### 4.4 CI/CD 集成

GitHub Actions 自动发布 workflow `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Verify version consistency
        run: npm run version:check

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true

      - name: Deploy API
        run: fly deploy --app bookpost-api-hono

      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: booklibrio
        with:
          environment: production
          version: ${{ steps.version.outputs.VERSION }}
```

---

## 5. Sentry 版本集成

### 5.1 iOS Sentry 配置

```swift
// SentryManager.swift
SentrySDK.start { options in
    options.dsn = "..."

    // Release format: booklibrio-ios@1.2.3+buildNumber
    if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
       let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
        options.releaseName = "booklibrio-ios@\(version)+\(build)"
    }
}
```

### 5.2 Android Sentry 配置

```kotlin
// SentryManager.kt
SentryAndroid.init(context) { options ->
    options.dsn = "..."

    // Release format: booklibrio-android@1.2.3+versionCode
    options.release = "booklibrio-android@${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"
}
```

### 5.3 API Backend Sentry 配置

```typescript
// src/lib/sentry.ts
import packageJson from '../../package.json'

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: `booklibrio-api@${packageJson.version}`,
    environment: process.env.NODE_ENV || 'development',
})
```

### 5.4 Web Sentry 配置

```typescript
// src/lib/sentry.ts
Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `booklibrio-web@${import.meta.env.VITE_APP_VERSION}`,
})
```

---

## 6. 版本发布流程

### 6.1 发布检查清单

```markdown
## Pre-Release Checklist

- [ ] 所有测试通过
- [ ] 更新 CHANGELOG.md
- [ ] 运行 `npm run version:patch/minor/major`
- [ ] 验证所有平台版本号一致 `npm run version:check`
- [ ] 提交版本变更 `git commit -m "chore: bump version to x.x.x"`
- [ ] 创建 Git Tag `git tag vx.x.x`
- [ ] 推送 Tag `git push origin vx.x.x`
- [ ] 验证 GitHub Actions 发布流程
- [ ] 验证 Sentry Release 创建成功
```

### 6.2 快速发布命令

```bash
# 发布 patch 版本 (bug fix)
npm run version:patch && git add -A && git commit -m "chore: release v$(cat version.json | jq -r .version)" && git tag v$(cat version.json | jq -r .version) && git push && git push --tags

# 或者使用 npm version (如果配置了 postversion hook)
npm version patch -m "chore: release v%s"
```

---

## 7. 迁移计划

### Phase 1: 初始化 (Day 1)

1. [ ] 创建 `version.json` 配置文件
2. [ ] 创建 `scripts/bump-version.ts` 脚本
3. [ ] 统一所有平台版本号为 `1.0.0`
4. [ ] 更新 Sentry release 命名格式

### Phase 2: 自动化 (Day 2)

1. [ ] 添加 NPM scripts
2. [ ] 创建 GitHub Actions release workflow
3. [ ] 配置 Sentry release 自动创建
4. [ ] 添加版本检查脚本

### Phase 3: 验证 (Day 3)

1. [ ] 测试版本同步脚本
2. [ ] 测试 CI/CD 流程
3. [ ] 验证 Sentry 版本追踪
4. [ ] 文档更新

---

## 8. 决策点

请确认以下决策：

### Q1: 版本策略选择
- [ ] **选项 A**: 统一版本号 (推荐)
- [ ] **选项 B**: 独立版本号
- [ ] **选项 C**: 混合策略

### Q2: 初始版本号
- [ ] **1.0.0** - 表示已上线的稳定版本
- [ ] **0.1.0** - 表示还在 Beta 阶段

### Q3: Android Version Code 策略
- [ ] **编码策略**: `MAJOR * 10000 + MINOR * 100 + PATCH` (推荐)
- [ ] **递增策略**: 每次发布 +1

### Q4: Sentry Release 命名
- [ ] **带平台前缀**: `booklibrio-ios@1.2.3` (推荐)
- [ ] **不带前缀**: `1.2.3`

---

## 9. 参考资料

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Sentry Release Management](https://docs.sentry.io/product/releases/)
- [Apple Version Numbers](https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring)
- [Android Versioning](https://developer.android.com/studio/publish/versioning)

---

**请 Review 后确认上述决策点，我将开始实施。**
