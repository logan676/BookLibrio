# iOS Implementation Gap Analysis

Based on: **IOS_CLIENT_ARCHITECTURE.md** (WeRead PRD v1.0, 65 design pages)

**Analysis Date**: 2025-12-12

---

## Summary

| Category | Required | Implemented | Completion |
|----------|----------|-------------|------------|
| Tab Navigation | 5 tabs | 5 tabs | 100% |
| Models | ~25 | ~18 | 72% |
| Store Module | 6 views | 6 views | 100% |
| Bookshelf Module | 3 views | 2 views | 67% |
| Book Detail Module | 5 views | 2 views | 40% |
| Reader Module | 9 views | 6 views | 67% |
| Audio Player Module | 4 views | 2 views | 50% |
| AI Features Module | 3 views | 1 view | 33% |
| Social Module | 6 views | 6 views | 100% |
| Profile Module | 7 views | 11 views | 100% |
| Membership Module | 3 views | 1 view | 33% |
| Onboarding | 1 view | 1 view | 100% |
| Messages | 1 view | 1 view | 100% |
| Settings | 1 view | 1 view (16+ sub-views) | 100% |

**Overall Estimated Completion: ~75%**

---

## 1. Navigation Structure

### Required (from PRD)
```
┌────────┬──────────┬────────┬────────┬─────────┐
│ 阅读   │   书架   │  书城  │  书友  │    我   │
│Reading │Bookshelf │ Store  │Friends │ Profile │
└────────┴──────────┴────────┴────────┴─────────┘
```

### Current Implementation
```
┌────────┬──────────┬──────────┬─────────┐
│  首页  │  电子书  │   杂志   │   我    │
│  Home  │  Ebooks  │Magazines │ Profile │
└────────┴──────────┴──────────┴─────────┘
```

### Gap
- [ ] Missing **Reading** tab (快速继续阅读入口)
- [ ] Missing **Bookshelf** tab (个人书架管理)
- [ ] Missing **Friends** tab (社交动态)
- [x] Profile tab exists
- [ ] Store is split into Ebooks/Magazines instead of unified Store

---

## 2. Store Module (书城)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| StoreHomeView | 书城首页 (推荐、猜你喜欢、每日书单) | Missing |
| CategoryView | 分类浏览 (28个一级分类) | Missing |
| CategoryDetailView | 分类详情 + 筛选 (字数/付费/排序) | Missing |
| RankingView | 榜单页面 (飙升榜、热搜榜等11种榜单) | Missing |
| BookListView | 书单详情页 | Missing |
| SearchView | 搜索功能 | Partial (SearchBarView exists) |

### Current Implementation
- `EbooksView.swift` - Basic ebook listing with category pills
- `MagazinesView.swift` - Basic magazine listing

### Missing Features
- [ ] Personalized recommendations ("猜你喜欢")
- [ ] Daily book lists
- [ ] Quick entry buttons (分类/榜单/会员专享/书单/免费书/当月新书)
- [ ] Two-level category system
- [ ] Advanced filters (word count, payment type, sort options)
- [ ] 11 ranking types
- [ ] Curated book lists

---

## 3. Bookshelf Module (书架)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| BookshelfView | 书架主视图 | Partial |
| BookshelfGridView | 3列网格布局 | Missing |
| MiniPlayerView | 悬浮音频播放器 | Missing |

### Current Implementation
- `MyBookshelfView.swift` - Basic bookshelf with filtering

### Missing Features
- [ ] 8 sort options (默认/更新/进度/推荐值/书名/分类/字数/付费)
- [ ] Import functionality
- [ ] Batch selection mode
- [ ] Long press quick actions menu
- [ ] Mini audio player overlay
- [ ] 3-column grid layout
- [ ] Book download status indicator

---

## 4. Book Detail Module (书籍详情)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| BookDetailView | 书籍详情主页 | Partial |
| AIGuideView | AI导读 (主题卡片) | Missing |
| PopularHighlightsView | 热门划线 | Missing |
| RelatedBooksView | 延展阅读 | Missing |
| ReviewsView | 书评/点评 | Partial |

### Current Implementation
- `BookDetailView.swift` - Basic book details
- `EbookDetailView.swift` - Ebook-specific details
- `MagazineDetailView.swift` - Magazine-specific details
- `ReviewFormView.swift` - Review submission

### Missing Features
- [ ] Readers count and statistics display
- [ ] Recommendation score with bar chart
- [ ] Evaluation tags (神作/好评如潮/值得一读)
- [ ] AI guide topics (horizontal scroll cards)
- [ ] Popular highlights section
- [ ] Related books carousel
- [ ] Related book lists
- [ ] Publisher info + follow button
- [ ] "今日X人在读" indicator
- [ ] AI问书 floating button

---

## 5. Reader Module (阅读器)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| ReaderContainerView | 阅读器容器 | Missing |
| EPUBReaderView | EPUB阅读器 | Missing |
| PDFReaderView | PDF阅读器 | Exists |
| ReaderToolbar | 顶部/底部工具栏 | Missing |
| ReaderSettingsSheet | 阅读设置 | Missing |
| TableOfContentsView | 目录/AI大纲/搜索 | Missing |
| TextSelectionMenu | 划线/想法/分享菜单 | Missing |
| HighlightView | 划线展示 | Missing |
| ThoughtBubbleView | 好友想法气泡 | Missing |

### Current Implementation
- `PDFReaderView.swift` - Basic PDF rendering

### Missing Features
- [ ] EPUB support (requires ReadiumKit)
- [ ] Tap to show/hide toolbar
- [ ] Bottom toolbar (目录/标记/进度/亮度/字体/设置)
- [ ] Text selection actions (复制/划线/写想法/分享书摘/查询/听当前)
- [ ] Highlight system (6 colors, 3 styles)
- [ ] Thought visibility options (公开/私密/关注/屏蔽好友)
- [ ] Friends' thought bubbles in text
- [ ] Reading settings:
  - [ ] Brightness control
  - [ ] Color modes (白色/米黄/浅绿/深色)
  - [ ] Background textures
  - [ ] Font families (系统字体/宋体/楷体/黑体)
  - [ ] Font size slider
  - [ ] Margin size
  - [ ] Line spacing
  - [ ] First line indent toggle
  - [ ] Page flip animation (左右滑动/上下滑动/仿真翻页/淡入淡出)
- [ ] Progress bar with chapter navigation
- [ ] Time and battery display

---

## 6. Audio Player Module (AI有声书)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| AudioPlayerView | 全屏播放器 | Missing |
| MiniPlayerView | 迷你悬浮播放器 | Missing |
| VoiceSelectionView | AI声音选择 | Missing |
| SleepTimerView | 定时关闭 | Missing |

### Current Implementation
- None

### Missing Features
- [ ] Full-screen audio player with cover art
- [ ] Chapter navigation (上一章/下一章)
- [ ] 15-second skip forward/backward
- [ ] Playback speed control (0.5x - 2.0x)
- [ ] AI voice selection (多种音色)
- [ ] Sleep timer (15/30/45/60分钟, 播完本章)
- [ ] Original text view (同步显示原文)
- [ ] Background audio playback
- [ ] Lock screen controls
- [ ] Now Playing info

---

## 7. AI Features Module

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| AIQuestionView | AI问书对话 | Missing |
| AILookupView | 词汇查询 (字典+AI) | Missing |
| AIOutlineView | AI大纲/导读 | Missing |

### Current Implementation
- None

### Missing Features
- [ ] AI Q&A chat interface
- [ ] Quick action buttons (书籍亮点/背景解读/关键概念)
- [ ] Conversation history
- [ ] Word/phrase lookup:
  - [ ] Dictionary definition (《辞海》)
  - [ ] AI interpretation with context
  - [ ] Related books recommendations
- [ ] AI-generated book outline
- [ ] Celebrity recommendations

---

## 8. Social Module (书友)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| FriendsTabView | 书友Tab主页 | ✅ Exists |
| FriendsActivityView | 好友动态 | ✅ Exists |
| PublishThoughtView | 发布想法 | Partial |
| TopicSelectionView | 话题选择 | ✅ Exists |
| LeaderboardView | 阅读排行榜 | ✅ Exists |
| ShareSheet | 分享面板 | ✅ Exists |

### Current Implementation
- `FriendsTabView.swift` - Friends tab with activity feed
- `LeaderboardView.swift` - Reading leaderboard
- `ActivityFeedView.swift` - Activity feed
- `FollowListView.swift` - Following/Followers
- `TopicSelectionView.swift` - Topic/hashtag selection with categories
- `ShareSheet.swift` - Rich share sheet with quote cards

### Implemented Features
- [x] Separate Friends tab
- [x] Topic categories (5 categories with multiple topics)
- [x] Trending topics
- [x] Share destinations (WeChat, 朋友圈, 书友, System share)
- [x] Quote card templates (日历/简约/典雅/暗黑)
- [x] QR code generation option
- [x] Copy link option

### Remaining Features
- [ ] Activity type filters
- [ ] Publish thought with:
  - [ ] Image attachments (up to 9)
  - [ ] User mentions (@)
  - [ ] Visibility settings

---

## 9. Profile Module (个人中心)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| ProfileTabView | Profile Tab容器 | ✅ Exists |
| ProfileHomeView | 个人中心首页 | ✅ Exists |
| StatisticsView | 阅读统计 | ✅ Exists |
| BadgesView | 勋章页面 | ✅ Exists |
| BadgeDetailView | 勋章详情弹窗 | ✅ Exists |
| PersonalPageView | 个人主页 | ✅ Exists |
| SettingsView | 设置页面 | ✅ Exists (16+ sub-views) |
| OnboardingView | 新用户引导 | ✅ Exists |
| MessageInboxView | 消息收件箱 | ✅ Exists |

### Current Implementation
- `ProfileView.swift` - Profile home
- `MyBookshelfView.swift` - Personal bookshelf
- `DailyGoalsView.swift` - Daily reading goals
- `StreakView.swift` - Reading streaks
- `BadgesView.swift` - Badge display
- `BadgeDetailView.swift` - Badge detail modal with progress
- `ReadingStatsView.swift` - Reading statistics
- `UserProfileView.swift` - Public user profile
- `OnboardingView.swift` - First-time user onboarding flow
- `MessageInboxView.swift` - In-app notifications inbox
- `SettingsView.swift` - Complete settings with 16+ sub-views:
  - ProfileEditView, AccountSecurityView, FontSettingsView
  - ThemeSettingsView, ReminderTimeSettingsView, PrivacySettingsView
  - BlockedUsersView, DataExportView, DownloadSettingsView
  - HelpCenterView, FeedbackView, AboutView, LegalView

### Implemented Features
- [x] Membership status banner
- [x] In-app message inbox with categories
- [x] Full settings page with all sections
- [x] Badge detail modal with sharing
- [x] First-time onboarding experience
- [x] Privacy settings
- [x] Account security settings
- [x] Help center and feedback

---

## 10. Membership Module (会员系统)

### Required Views
| View | Purpose | Status |
|------|---------|--------|
| MembershipView | 会员中心 | ✅ Exists |
| PlanSelectionView | 套餐选择 | Integrated |
| RedeemCodeView | 兑换码 | Missing |

### Current Implementation
- `MembershipView.swift` - Complete membership center with:
  - Benefits display (6 key benefits)
  - Pricing plans (连续包月, 月卡, 季卡, 年卡)
  - Plan comparison
  - FAQ section

### Implemented Features
- [x] Membership benefits display
- [x] Pricing plans:
  - [x] 连续包月 (auto-renewal)
  - [x] 月卡
  - [x] 季卡
  - [x] 年卡
- [x] Plan selection UI
- [x] Current membership status display

### Remaining Features
- [ ] In-app purchase integration (StoreKit)
- [ ] Promo/discount banner
- [ ] Redemption code input
- [ ] 联合月卡/年卡 (bundled plans)

---

## 11. Data Models

### Implemented Models
| Model | Purpose | File |
|-------|---------|------|
| User | User profile data | User.swift |
| Ebook, Magazine, Book | Content types | Ebook.swift, Magazine.swift, Book.swift |
| BookDetail | Book metadata | BookDetail.swift |
| ReadingHistory, ReadingSession | Reading tracking | ReadingHistory.swift, ReadingSession.swift |
| ReadingStats, ReadingGoal | Statistics | ReadingStats.swift, ReadingGoal.swift |
| Badge, EarnedBadge, BadgeProgress | Achievement system | Badge.swift |
| Social (FriendActivity, LeaderboardEntry) | Social features | Social.swift |
| Note (Underline, Comment, Idea) | Reader annotations | Note.swift |
| ReaderModels | Reader settings/state | ReaderModels.swift |
| Topic, TopicCategory | Social topics | TopicSelectionView.swift (inline) |
| ShareContent | Share types | ShareSheet.swift (inline) |
| InboxMessage, MessageCategory | Notifications | MessageInboxView.swift (inline) |
| MembershipPlan | Subscription plans | MembershipView.swift (inline) |
| OnboardingPage | Onboarding flow | OnboardingView.swift (inline) |

### Still Missing
| Model | Purpose |
|-------|---------|
| BookCategory | 28 categories + two-level structure |
| Ranking / RankingItem | 11 ranking types |
| BookList | Curated book lists |
| AIConversation / AIMessage | AI Q&A history |
| AIVoice | TTS voice options |
| AudioPlayerState | Full playback state |
| SleepTimer | Sleep timer settings |

---

## 12. Missing API Endpoints Integration

### Backend APIs Needed (not yet called from iOS)
| Category | Endpoints |
|----------|-----------|
| Store | GET /api/categories, GET /api/rankings, GET /api/recommendations |
| Books | GET /api/books/{id}/ai-guide, GET /api/books/{id}/popular-highlights |
| AI | POST /api/ai/ask-book, POST /api/ai/lookup, POST /api/ai/generate-audio |
| Social | POST /api/social/thoughts, GET /api/social/topics |
| Membership | GET /api/membership/plans, POST /api/membership/subscribe |
| Bookshelf | GET /api/bookshelf (with sort), POST /api/bookshelf/import |

---

## 13. Priority Implementation Order

### Phase 1: Critical (High Impact, Foundation)
1. **Reader Module** - Core reading experience
   - EPUB support with ReadiumKit
   - Text selection & highlighting
   - Reading settings (themes, fonts)

2. **Unified Store** - Content discovery
   - Merge Ebooks/Magazines into Store tab
   - Add categories and rankings
   - Search improvements

### Phase 2: High Priority
3. **Tab Navigation Restructure**
   - Add Reading tab (continue reading)
   - Add Bookshelf tab (manage library)
   - Add Friends tab (social)

4. **Bookshelf Enhancement**
   - Sort options
   - Download management
   - Mini player

### Phase 3: AI Features
5. **Audio Player** - AI TTS
6. **AI Q&A** - Book conversations
7. **AI Lookup** - Word definitions

### Phase 4: Social & Engagement
8. **Social Module** - Friends tab
   - Publish thoughts
   - Topic system
   - Share functionality

9. **Membership** - Monetization
   - Plans display
   - In-app purchase

### Phase 5: Polish
10. **Profile Enhancement**
11. **Badge Details**
12. **Settings Complete**

---

## Quick Reference: Files to Create

### Views (30+ new files needed)
```
Features/
├── Store/Views/
│   ├── StoreHomeView.swift
│   ├── CategoryView.swift
│   ├── CategoryDetailView.swift
│   ├── RankingView.swift
│   └── BookListView.swift
├── Reader/Views/
│   ├── ReaderContainerView.swift
│   ├── EPUBReaderView.swift
│   ├── ReaderToolbar.swift
│   ├── ReaderSettingsSheet.swift
│   ├── TableOfContentsView.swift
│   ├── TextSelectionMenu.swift
│   ├── HighlightView.swift
│   └── ThoughtBubbleView.swift
├── AudioPlayer/Views/
│   ├── AudioPlayerView.swift
│   ├── MiniPlayerView.swift
│   ├── VoiceSelectionView.swift
│   └── SleepTimerView.swift
├── AI/Views/
│   ├── AIQuestionView.swift
│   ├── AILookupView.swift
│   └── AIOutlineView.swift
├── Social/Views/
│   ├── FriendsTabView.swift
│   ├── PublishThoughtView.swift
│   ├── TopicSelectionView.swift
│   └── ShareSheet.swift
└── Membership/Views/
    ├── MembershipView.swift
    ├── PlanSelectionView.swift
    └── RedeemCodeView.swift
```

### Models (10+ new files needed)
```
Models/
├── BookCategory.swift
├── Ranking.swift
├── BookList.swift
├── Highlight.swift
├── Thought.swift
├── AIConversation.swift
├── AIVoice.swift
├── Topic.swift
├── MembershipPlan.swift
├── AudioPlayerState.swift
└── ReadingSettings.swift
```

---

*Last updated: 2025-12-12 (Phase 5 Complete)*
