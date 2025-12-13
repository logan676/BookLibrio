# BookPost 开发计划

> **周期**: 4个月 (16周)
> **目标**: 用户体验优先，完成核心功能
> **团队**: 2-3人小团队
> **基于**: PRODUCT_CONCEPT.md 需求评估

---

## 📊 开发进度总览

```
月份        第1月           第2月           第3月           第4月
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段       🔵 阅读体验强化    🟢 AI功能完善    🟡 社交&内容发现   🟣 商业化&打磨
完成度目标   46% → 60%       60% → 75%       75% → 88%       88% → 95%
```

---

## 第一阶段：阅读体验强化 (第1-4周)

### 🎯 阶段目标
将阅读器从"能用"提升到"好用"，建立核心竞争力

### 📋 任务清单

#### Week 1-2: 阅读器增强

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | EPUB 完整渲染集成 (Readium 3.x) | iOS | 5天 | - |
| P0 | 阅读进度同步优化 | Full-stack | 2天 | - |
| P1 | 全文搜索功能 | iOS + API | 3天 | - |
| P1 | 书签功能实现 | iOS + API | 2天 | - |
| P2 | 阅读器手势优化 (左右翻页流畅度) | iOS | 2天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/Reader/EPUBReaderView.swift`
- `packages/api/src/routes/reading-sessions.ts`

#### Week 3-4: 书架与内容管理

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | 书架排序功能 (8种排序方式) | iOS | 2天 | - |
| P0 | 书架筛选功能 (分类/状态) | iOS | 2天 | - |
| P1 | 批量选择与操作 | iOS | 2天 | - |
| P1 | 长按快捷菜单 | iOS | 1天 | - |
| P2 | 阅读进度展示优化 | iOS | 1天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/Profile/MyBookshelfView.swift`
- 新建: `BookshelfView.swift` (独立书架页面)

### ✅ 第一阶段验收标准

- [ ] EPUB 可正常渲染，支持翻页、缩放
- [ ] 书架支持按"默认/更新时间/阅读进度/评分"排序
- [ ] 阅读器支持全文搜索，可跳转结果位置
- [ ] 书签可添加、查看、删除、跳转
- [ ] 阅读进度在多设备间正确同步

---

## 第二阶段：AI功能完善 (第5-8周)

### 🎯 阶段目标
AI 功能从"有"到"真正可用"，实现 AI 朗读这一核心差异化功能

### 📋 任务清单

#### Week 5-6: AI 朗读播放器 (核心功能)

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | TTS 引擎集成 (系统 AVSpeechSynthesizer) | iOS | 3天 | - |
| P0 | 朗读播放器 UI | iOS | 3天 | TTS引擎 |
| P0 | 播放控制 (播放/暂停/上下章) | iOS | 2天 | 播放器UI |
| P1 | 语音选择功能 | iOS | 1天 | TTS引擎 |
| P1 | 倍速控制 (0.5x-2.0x) | iOS | 1天 | 播放器UI |
| P1 | 睡眠定时器 | iOS | 1天 | 播放器UI |
| P2 | 迷你播放器 (书架底部悬浮) | iOS | 2天 | 播放器UI |

**新建文件:**
- `packages/ios/BookPost/Views/Reader/AudioPlayerView.swift`
- `packages/ios/BookPost/Views/Reader/MiniPlayerView.swift`
- `packages/ios/BookPost/Services/TTSManager.swift`

#### Week 7-8: AI 智能功能

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | AI 问答真实 API 对接 | Full-stack | 3天 | Claude API |
| P1 | AI 查词功能完善 (词典+AI解读) | iOS + API | 3天 | - |
| P1 | AI 大纲生成 | API | 2天 | Claude API |
| P2 | AI 导读卡片 | iOS | 2天 | AI大纲 |
| P2 | 问答历史记录保存 | iOS + API | 1天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/AI/AIQuestionView.swift`
- `packages/api/src/services/claudeAI.ts`
- `packages/api/src/routes/ai.ts`

### ✅ 第二阶段验收标准

- [ ] 可朗读任意章节，支持后台播放
- [ ] 播放器支持倍速、定时关闭
- [ ] 迷你播放器在书架/书城显示
- [ ] AI 问答返回真实的上下文相关回答
- [ ] 查词显示词典释义 + AI 深度解读

---

## 第三阶段：社交与内容发现 (第9-12周)

### 🎯 阶段目标
完善社交互动，提升内容发现效率，增强用户粘性

### 📋 任务清单

#### Week 9-10: 社交功能完善

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | 想法可见性设置 (公开/私密/互关/隐藏) | iOS + API | 2天 | - |
| P0 | 好友动态时间线完善 | iOS | 3天 | - |
| P1 | 引用卡片生成器 | iOS | 3天 | - |
| P1 | 社区想法浏览 (瀑布流) | iOS | 2天 | - |
| P2 | 好友阅读笔记查看 | iOS | 2天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/Social/PublishThoughtView.swift`
- `packages/ios/BookPost/Views/Profile/ActivityFeedView.swift`
- 新建: `packages/ios/BookPost/Views/Social/QuoteCardView.swift`

#### Week 11-12: 内容发现优化

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | 分类详情筛选 (字数/付费/排序) | iOS | 3天 | - |
| P1 | 个性化推荐理由展示 | iOS + API | 2天 | - |
| P1 | 书单详情页 | iOS | 2天 | - |
| P1 | 每日书单功能 | iOS + API | 2天 | - |
| P2 | 搜索历史与热门搜索 | iOS | 1天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/Store/StoreCategoryView.swift`
- `packages/ios/BookPost/Views/Store/StoreHomeView.swift`
- 新建: `packages/ios/BookPost/Views/Store/BookListDetailView.swift`

### ✅ 第三阶段验收标准

- [ ] 发布想法时可选择可见范围
- [ ] 可生成精美引用卡片并分享
- [ ] 分类页支持多维度筛选
- [ ] 推荐书籍显示"为你推荐的理由"
- [ ] 书单详情页可正常浏览

---

## 第四阶段：商业化与打磨 (第13-16周)

### 🎯 阶段目标
实现商业化基础，完善细节体验，准备上线

### 📋 任务清单

#### Week 13-14: 会员系统

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | 会员权益展示页 | iOS | 2天 | - |
| P0 | StoreKit 2 集成 | iOS | 3天 | - |
| P0 | 订阅购买流程 | iOS + API | 3天 | StoreKit |
| P1 | 会员状态检查与权限控制 | Full-stack | 2天 | 订阅系统 |
| P2 | 兑换码功能 | iOS + API | 2天 | - |

**新建文件:**
- `packages/ios/BookPost/Views/Membership/MembershipView.swift`
- `packages/ios/BookPost/Views/Membership/SubscriptionPlanView.swift`
- `packages/ios/BookPost/Services/StoreKitManager.swift`

#### Week 15-16: 体验打磨与上线准备

| 优先级 | 任务 | 负责 | 工作量 | 依赖 |
|--------|------|------|--------|------|
| P0 | 阅读数据分享卡片 | iOS | 2天 | - |
| P0 | 设置页面完善 | iOS | 2天 | - |
| P1 | 个人主页隐私设置 | iOS + API | 2天 | - |
| P1 | 通知系统完善 | iOS + API | 2天 | - |
| P1 | 性能优化与 Bug 修复 | All | 3天 | - |
| P2 | App Store 上架准备 | iOS | 2天 | - |

**关键文件:**
- `packages/ios/BookPost/Views/Profile/ReadingStatsView.swift`
- 新建: `packages/ios/BookPost/Views/Settings/SettingsView.swift`

### ✅ 第四阶段验收标准

- [ ] 可完成会员订阅购买流程
- [ ] 非会员内容有正确的付费提示
- [ ] 阅读数据可生成分享卡片
- [ ] 设置页功能完整 (通知/隐私/缓存等)
- [ ] 无 P0 级 Bug，性能流畅

---

## 📅 里程碑时间表

```
Week  1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16
      |━━━━━━━━━━━|   |━━━━━━━━━━━|   |━━━━━━━━━━━━|   |━━━━━━━━━━━|
      阅读器增强      AI朗读播放器      社交功能完善      会员系统
          |━━━━━━━━━━━|   |━━━━━━━━━━━|   |━━━━━━━━━━━|       |━━━━━|
          书架优化        AI智能功能      内容发现优化      打磨上线

🏁 M1: Week 4  - 阅读体验完整
🏁 M2: Week 8  - AI功能可用
🏁 M3: Week 12 - 社交闭环
🏁 M4: Week 16 - 商业化上线
```

---

## 👥 团队分工建议 (2-3人)

### 方案A: 2人团队

| 角色 | 负责模块 | 技能要求 |
|------|----------|----------|
| **iOS 开发** | 阅读器、UI、播放器、StoreKit | Swift/SwiftUI, AVFoundation |
| **全栈开发** | API、数据库、AI集成、运维 | Node.js, PostgreSQL, Claude API |

### 方案B: 3人团队

| 角色 | 负责模块 | 技能要求 |
|------|----------|----------|
| **iOS 主开发** | 阅读器、播放器 | Swift, PDFKit, Readium |
| **iOS 副开发** | UI、社交、商店 | SwiftUI, StoreKit |
| **后端开发** | API、AI、数据 | Hono, Drizzle, Claude API |

---

## ⚠️ 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Readium 集成复杂 | 阅读器延期 | 预留1周缓冲，必要时用 WebView 方案 |
| AI 成本超预期 | 功能受限 | 实现缓存机制，限制免费用户调用次数 |
| StoreKit 审核问题 | 上线延期 | 提前提交测试，熟悉苹果政策 |
| 社交功能低使用率 | ROI不高 | 先实现核心，根据数据决定深入程度 |

---

## 📊 功能完成度预期

| 阶段 | 书架 | 商店 | 阅读器 | AI | 社交 | 会员 | 总体 |
|------|------|------|--------|-----|------|------|------|
| 当前 | 40% | 60% | 70% | 55% | 35% | 10% | **46%** |
| M1后 | **75%** | 65% | **90%** | 55% | 35% | 10% | **60%** |
| M2后 | 75% | 70% | 90% | **85%** | 40% | 10% | **75%** |
| M3后 | 80% | **85%** | 92% | 85% | **75%** | 15% | **88%** |
| M4后 | 85% | 88% | 95% | 88% | 80% | **80%** | **95%** |

---

## 🚀 快速开始：第一周任务

### 本周目标
完成 EPUB 渲染和阅读进度同步

### Day 1-2: EPUB 渲染
```swift
// EPUBReaderView.swift - 替换 placeholder 为真实渲染
// 1. 配置 Readium Navigator
// 2. 实现 EPUBNavigatorDelegate
// 3. 处理翻页和位置回调
```

### Day 3-4: 阅读进度
```swift
// ReadingSessionManager.swift
// 1. 增加位置存储
// 2. 心跳时发送当前位置
// 3. 恢复阅读时跳转到上次位置
```

### Day 5: 集成测试
- 测试 EPUB 打开流畅度
- 测试退出后再进入位置是否正确
- 测试多设备同步

---

*文档版本: 1.0*
*创建日期: 2024-12*
*更新日期: -*
