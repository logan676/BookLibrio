# iOS 勋章 UI 差距分析文档

基于设计图 (`stitch_badge_detail_screen`) 与当前 iOS 原生客户端实现的对比分析。

## ✅ 实现状态 (2025-12-14 更新)

### iOS 前端改进：
- ✅ Badge 数据模型扩展 (tier, rarity, lore, requirements)
- ✅ 3D 金属材质卡片组件 (BadgeMetallicCard)
- ✅ 详情页三信息标签 (Date/Category/Tier)
- ✅ 多条需求列表 (Requirements)
- ✅ LORE 传说部分
- ✅ EARNED 标签
- ✅ 按稀有度分组和筛选
- ✅ 顶部统计卡片 (阅读量/等级/里程碑)

### 后端 API 改进 (2025-12-14 新增)：
- ✅ Database Schema 添加新字段 (tier, rarity, lore, xpValue, requirements JSONB)
- ✅ Routes Zod Schema 更新支持新字段
- ✅ Badge Service 返回新字段数据
- ✅ 自动计算 tier/rarity/xpValue (兜底逻辑)
- ✅ 支持多条需求列表 (requirements array)
- ✅ 部分默认勋章添加 lore 传说文本

---

## 一、勋章列表页面 (BadgesView)

### 1.1 顶部统计卡片

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 显示总勋章数 (12/50) | ✅ 已实现 (`totalEarned/totalBadges`) | - | - |
| 显示阅读量 (1,240 Read) | ❌ 未实现 | 需要添加阅读统计数据展示 | P1 |
| 显示用户等级 (Lv5) | ❌ 未实现 | 需要添加用户等级展示 | P1 |
| 下一里程碑进度 (Next Milestone: Level 6) | ❌ 未实现 | 需要添加里程碑进度条和文案 | P2 |
| 进度环形图 | ✅ 已实现 (圆形进度环) | 设计图使用数字+小图标，可考虑优化 | P3 |

**改进建议：**
```
设计图布局:
┌─────────────────────────────────────────┐
│  12/50        1,240         Lv5        │
│  ⭐ Earned    📖 Read      🏆 Level    │
│─────────────────────────────────────────│
│  Next Milestone: Level 6   ▓▓▓▓░░ 80%  │
└─────────────────────────────────────────┘
```

### 1.2 分类筛选器

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 按稀有度筛选 (All/Gold/Silver) | ❌ 按类别筛选 | 设计图按材质/稀有度，当前按功能类别 | P1 |
| 筛选器样式 (圆角pill) | ✅ 已实现 | 样式基本匹配 | - |

**改进建议：**
- 添加按稀有度筛选: `All | Gold | Silver | Bronze/Iron`
- 稀有度对应: Gold=Legendary, Silver=Epic, Bronze=Rare, Iron=Common

### 1.3 勋章分组展示

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 按稀有度分组 (Legendary/Epic/Common) | ❌ 按状态分组 (Earned/In Progress) | 分组逻辑不同 | P1 |
| 分组标题带星标 (★ Legendary (Gold)) | ❌ 简单文本标题 | 需要添加稀有度图标和颜色 | P2 |
| 金/银/铜材质背景卡片 | ❌ 无材质卡片背景 | 需要添加3D材质卡片背景 | P1 |

**设计图分组样式：**
```
★ Legendary (Gold)     <- 金色标题
┌────────┐ ┌────────┐
│ 🏆     │ │ 🎓     │   <- 金色边框卡片
│ Badge  │ │ Badge  │
│ Name   │ │ Name   │
└────────┘ └────────┘

★ Epic (Silver)        <- 银色标题
┌────────┐ ┌────────┐
│ 🔬     │ │ 📚     │   <- 银色边框卡片
│ Badge  │ │ Badge  │
└────────┘ └────────┘

★ Common (Iron)        <- 灰色标题
┌────────┐ ┌────────┐
│ 📖     │ │ 🎯     │   <- 灰色边框卡片
│ Badge  │ │ Badge  │
│ 5/10   │ │ 500 XP │   <- 进度显示
└────────┘ └────────┘
```

### 1.4 勋章卡片设计

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 3D立体边框卡片 | ❌ 扁平卡片 | 需要添加3D金属边框效果 | P1 |
| 金/银/铜材质背景 | ❌ 无材质效果 | 需要根据稀有度显示不同材质 | P1 |
| 圆形勋章悬浮在卡片上方 | ✅ 有3D勋章效果 | 但未悬浮于卡片上方 | P2 |
| 卡片内显示进度 (5/10 或 500 XP) | ✅ 已实现 | 样式可优化 | P3 |

---

## 二、勋章详情页面 (EnhancedBadgeDetailSheet)

### 2.1 顶部大型勋章展示

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 金色边框大型3D勋章 | ✅ 已实现 (Interactive3DBadgeView) | 基本匹配 | - |
| 勋章发光效果 | ✅ 已实现 (ambient glow) | 可增强发光强度 | P3 |
| "✓ EARNED" 标签 | ❌ 未实现 | 需要在勋章上方添加已获得标签 | P1 |
| 龙头/装饰元素 (DragonBadge) | ❌ 未实现 | 设计图顶部有装饰图案，当前无 | P2 |

**设计图勋章区域：**
```
        ◆ DragonBadge

    ╭─────────────────╮
    │   ✓ EARNED      │  <- 绿色已获得标签
    │                 │
    │    ┌─────┐      │
    │   ╱  🏆   ╲     │  <- 大型3D金色勋章
    │  │   ●●●   │    │     带发光效果
    │   ╲_______╱     │
    │                 │
    ╰─────────────────╯
```

### 2.2 勋章信息区域

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 勋章名称 (Scholar of the Ancients) | ✅ 已实现 | - | - |
| 勋章描述 | ✅ 已实现 | - | - |
| **三个信息标签** | ❌ 未实现 | **关键差距** | **P0** |
| - Start Date (Oct 24) | ❌ 分散显示 | 需要标签化展示 | P1 |
| - Category (Legendary) | ❌ 未显示稀有度 | 需要添加稀有度标签 | P1 |
| - Tier (Gold) | ❌ 未显示等级 | 需要添加等级标签 | P1 |

**设计图信息标签布局：**
```
┌──────────────┬──────────────┬──────────────┐
│  Start Date  │   Category   │     Tier     │
│    Oct 24    │  Legendary   │     Gold     │
└──────────────┴──────────────┴──────────────┘
```

### 2.3 Requirements 需求列表

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| 多条需求列表 | ❌ 单一进度条 | **关键差距** - 需要支持多条需求 | **P0** |
| 每条需求独立进度 | ❌ 未实现 | 需要为每个需求显示独立进度 | P0 |
| 已完成需求打勾 (✓) | ❌ 未实现 | 需要添加完成状态标识 | P1 |
| 进度数字 (10/90) | ✅ 有进度显示 | 需要支持多条进度 | P1 |
| "Completed" 标签 | ❌ 未实现 | 需要在完成时显示完成标签 | P2 |

**设计图 Requirements 布局：**
```
Requirements                      Completed
─────────────────────────────────────────────
✓ Read 3 History Genre Books      ✓ Done
  You've explored the chronicles...

○ Highlight 50 Passages            10/90
  ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

### 2.4 LORE 传说部分

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| LORE 标题区域 | ❌ 完全未实现 | 需要添加传说/故事部分 | P1 |
| 引号包裹的文字样式 | ❌ 未实现 | 需要添加引用样式 | P2 |
| 传说/背景故事内容 | ❌ 未实现 | 需要后端支持 lore 字段 | P1 |

**设计图 LORE 布局：**
```
◇ LORE
─────────────────────────────────────────────
"Knowledge of the past is the key to the
future. By uncovering the secrets of old, you
carry the torch of civilization forward."
```

### 2.5 底部操作按钮

| 设计要求 | 当前实现 | 差距 | 优先级 |
|---------|---------|------|-------|
| "Show off Badge" 按钮 | ✅ 有分享按钮 | 文案和样式不同 | P2 |
| 底部固定位置 | ❌ 在滚动区域内 | 可考虑固定在底部 | P3 |
| 按钮样式 (圆角矩形+图标) | ✅ 基本匹配 | - | - |

---

## 三、数据模型改进需求

### 3.1 Badge 模型扩展

需要添加以下字段支持设计图功能：

```swift
struct Badge {
    // 现有字段...

    // 新增字段
    let tier: BadgeTier           // Gold/Silver/Bronze/Iron
    let rarity: BadgeRarity       // Legendary/Epic/Rare/Common
    let lore: String?             // 传说/背景故事
    let requirements: [BadgeRequirement]  // 多条需求列表
    let startDate: Date?          // 开始日期
    let xpValue: Int?             // XP值
}

enum BadgeTier: String, Codable {
    case gold, silver, bronze, iron
}

enum BadgeRarity: String, Codable {
    case legendary, epic, rare, common
}

struct BadgeRequirement: Codable {
    let id: Int
    let description: String
    let current: Int
    let target: Int
    let isCompleted: Bool
}
```

### 3.2 用户统计数据

需要获取以下数据用于顶部统计卡片：

```swift
struct UserBadgeStats {
    let totalRead: Int            // 总阅读量
    let userLevel: Int            // 用户等级
    let nextMilestone: String     // 下一里程碑名称
    let milestoneProgress: Double // 里程碑进度百分比
}
```

---

## 四、优先级汇总

### P0 (必须实现 - 核心功能差距)
1. ❌ **多条需求列表** - Requirements 部分支持显示多个进度条
2. ❌ **三个信息标签** - Start Date / Category / Tier 标签展示

### P1 (重要 - 主要视觉差距)
3. ❌ 勋章卡片3D材质背景 (金/银/铜)
4. ❌ 按稀有度分组 (Legendary/Epic/Common)
5. ❌ 按稀有度筛选 (Gold/Silver)
6. ❌ "✓ EARNED" 已获得标签
7. ❌ LORE 传说部分
8. ❌ 顶部统计卡片 - 阅读量和用户等级

### P2 (中等 - 体验优化)
9. ❌ 分组标题星标样式 (★ Legendary)
10. ❌ 勋章悬浮于卡片上方效果
11. ❌ 顶部装饰元素 (DragonBadge)
12. ❌ 下一里程碑进度

### P3 (低优先级 - 细节打磨)
13. ⚠️ 进度环优化
14. ⚠️ 发光效果增强
15. ⚠️ 底部按钮固定

---

## 五、实现建议

### 5.1 卡片材质效果实现

```swift
struct BadgeMetallicCard: View {
    let tier: BadgeTier

    var metallicGradient: LinearGradient {
        switch tier {
        case .gold:
            return LinearGradient(
                colors: [
                    Color(hex: "FFD700"),
                    Color(hex: "FFA500"),
                    Color(hex: "B8860B")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .silver:
            return LinearGradient(
                colors: [
                    Color(hex: "C0C0C0"),
                    Color(hex: "A8A8A8"),
                    Color(hex: "808080")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        // ... bronze, iron
        }
    }
}
```

### 5.2 信息标签组件

```swift
struct BadgeInfoTag: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
```

### 5.3 需求列表组件

```swift
struct RequirementRow: View {
    let requirement: BadgeRequirement

    var body: some View {
        HStack {
            // 完成状态图标
            Image(systemName: requirement.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(requirement.isCompleted ? .green : .gray)

            VStack(alignment: .leading, spacing: 4) {
                Text(requirement.description)
                    .font(.subheadline)

                if !requirement.isCompleted {
                    ProgressView(value: Double(requirement.current), total: Double(requirement.target))
                        .tint(.orange)
                }
            }

            Spacer()

            // 进度/完成标签
            if requirement.isCompleted {
                Text("Done")
                    .font(.caption)
                    .foregroundColor(.green)
            } else {
                Text("\(requirement.current)/\(requirement.target)")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
    }
}
```

---

## 六、后端 API 改进需求

为了支持上述 UI 改进，后端 API 需要返回以下额外字段：

1. **Badge 响应** 添加：
   - `tier`: string (gold/silver/bronze/iron)
   - `rarity`: string (legendary/epic/rare/common)
   - `lore`: string (传说文字)
   - `requirements`: array (多条需求)
   - `xp_value`: number

2. **用户统计 API** 添加：
   - 总阅读量
   - 用户等级
   - 下一里程碑信息

---

*文档生成日期: 2025-12-14*
*基于设计图: stitch_badge_detail_screen/screen.png, screen copy.png*
