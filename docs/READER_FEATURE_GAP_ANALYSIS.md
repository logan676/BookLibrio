# 阅读器功能差异分析：Web App vs iOS Native App

## 概述

本文档对比分析 BookPost 阅读器在 Web App 和 iOS Native App 之间的功能差异，重点关注划线 (Underline)、笔记 (Notes/Ideas) 和 AI 释义 (AI Meaning) 功能。

---

## 1. 文本选中气泡菜单 (Bubble Menu)

### 1.1 功能对比表

| 功能 | Web App | iOS Native | 状态 |
|-----|---------|------------|------|
| 划线 (Underline) | ✅ | ✅ | 对齐 |
| 复制 (Copy) | ❌ | ✅ | iOS 多此功能 |
| 笔记/想法 (Ideas) | ✅ | ✅ | 实现方式不同 |
| 分享 (Share) | ❌ | ✅ | iOS 多此功能 |
| **AI 释义 (Meaning)** | ✅ | ❌ | **iOS 缺失** |
| 颜色选择 | ❌ (单色) | ✅ (6种颜色) | iOS 更丰富 |

### 1.2 Web App 气泡菜单实现

**文件**: `packages/web/src/components/EpubReader.tsx`

气泡菜单有三种状态：
1. **确认气泡 (confirm)** - 新选中文本时显示
   - "Underline" 按钮 - 创建划线
   - "Meaning" 按钮 - 获取 AI 释义

2. **已有划线气泡 (existing)** - 点击已有划线时显示
   - "Ideas (N)" 按钮 - 查看想法数量和内容
   - "Add Idea" 按钮 - 添加新想法
   - "Meaning" 按钮 - 获取 AI 释义
   - "Delete" 按钮 - 删除划线

3. **想法输入气泡 (idea)** - 创建划线后或点击添加想法时显示
   - 文本输入框
   - "Save" / "Skip" 按钮

```tsx
// Web App 气泡 UI 结构 (EpubReader.tsx:1438-1491)
{bubble.type === 'confirm' ? (
  <div className="bubble-confirm">
    <button onClick={handleConfirmUnderline}>Underline</button>
    <button onClick={handleGetMeaning}>Meaning</button>  // ⬅️ AI 释义按钮
  </div>
) : bubble.type === 'existing' ? (
  <div className="bubble-confirm">
    <button onClick={handleViewIdeas}>Ideas ({ideaCount})</button>
    <button onClick={handleShowIdeaInput}>Add Idea</button>
    <button onClick={handleGetMeaning}>Meaning</button>  // ⬅️ AI 释义按钮
    <button onClick={handleDeleteUnderline}>Delete</button>
  </div>
) : (
  // idea input bubble
)}
```

### 1.3 iOS Native App 气泡菜单实现

**文件**: `packages/ios/BookPost/Views/Reader/TextSelectionMenu.swift`

当前 iOS 气泡菜单只有一种状态，包含固定的四个按钮：

```swift
// iOS 气泡 UI 结构 (TextSelectionMenu.swift:19-44)
HStack(spacing: 0) {
    menuButton(icon: "highlighter", label: "换色") { showColorPicker.toggle() }
    Divider()
    menuButton(icon: "doc.on.doc", label: "复制") { onCopy(); onDismiss() }
    Divider()
    menuButton(icon: "square.and.pencil", label: "笔记") { onAddNote() }
    Divider()
    menuButton(icon: "square.and.arrow.up", label: "分享") { onShare() }
}
// ❌ 缺少 AI 释义按钮
```

---

## 2. AI 释义功能 (AI Meaning)

### 2.1 功能描述

AI 释义功能允许用户选中文本后，调用 AI 接口获取文本的解释、翻译或上下文分析。

### 2.2 Web App 实现详情

**API 端点**: `POST /api/ai/meaning`

**请求参数**:
```typescript
interface MeaningRequest {
  text: string        // 选中的文本
  paragraph: string   // 包含选中文本的完整段落（上下文）
  targetLanguage: 'en' | 'zh'  // 目标语言（双语切换）
}
```

**响应格式**:
```typescript
interface MeaningResponse {
  meaning: string  // Markdown 格式的释义内容
}
```

**实现逻辑** (EpubReader.tsx:887-958):
```typescript
const handleGetMeaning = async () => {
  // 1. 获取选中文本的完整段落作为上下文
  let paragraph = bubble.selectedText
  // ... 从 DOM 中查找父级 P 或 DIV 元素获取完整段落

  // 2. 显示 loading 状态的弹窗
  setMeaningPopup({
    visible: true,
    x: bubble.x,
    y: bubble.y + 60,
    text: bubble.selectedText,
    meaning: '',
    loading: true
  })

  // 3. 调用 AI API
  const res = await fetch('/api/ai/meaning', {
    method: 'POST',
    body: JSON.stringify({
      text: bubble.selectedText,
      paragraph: paragraph,
      targetLanguage: locale === 'zh' ? 'en' : 'zh'  // 智能双语切换
    })
  })

  // 4. 显示结果（支持 Markdown 渲染）
  const data = await res.json()
  setMeaningPopup(prev => ({ ...prev, meaning: data.meaning, loading: false }))
}
```

**UI 展示** (EpubReader.tsx:1510-1560):
- 弹窗显示在气泡下方
- 显示选中的原文
- Markdown 格式渲染释义结果
- 支持加载状态显示

### 2.3 iOS 需要实现的内容

1. **新增 API 调用方法** (APIClient.swift)
   ```swift
   func getMeaning(text: String, paragraph: String, targetLanguage: String) async throws -> MeaningResponse
   ```

2. **新增气泡菜单按钮** (TextSelectionMenu.swift)
   - 添加 "释义" 按钮
   - 图标建议: `"text.magnifyingglass"` 或 `"sparkles"`

3. **新增释义弹窗视图** (MeaningPopupView.swift)
   - 显示选中文本
   - Loading 状态
   - Markdown 渲染结果

4. **数据模型** (ReaderModels.swift)
   ```swift
   struct MeaningRequest: Codable {
       let text: String
       let paragraph: String
       let targetLanguage: String
   }

   struct MeaningResponse: Codable {
       let meaning: String
   }
   ```

---

## 3. 笔记/想法功能 (Notes/Ideas)

### 3.1 功能对比

| 功能 | Web App | iOS Native | 说明 |
|-----|---------|------------|------|
| 创建划线后立即添加想法 | ✅ | ❌ | Web 自动弹出输入框 |
| 查看想法列表 | ✅ (弹窗) | ❌ | iOS 只能在 Sheet 中添加 |
| 编辑已有想法 | ✅ | ❌ | Web 支持内联编辑 |
| 删除想法 | ✅ | ❌ | Web 支持 |
| 想法数量徽章 | ✅ | ✅ (部分) | Web 在划线末尾显示 |
| 语音输入 | ✅ (EbookReader) | ❌ | Web Speech API |

### 3.2 Web App Ideas 流程

```
选中文本 → 点击 Underline → 自动显示 Idea 输入框 → 输入想法 → Save/Skip
                                    ↓
                              创建划线成功
                                    ↓
                        划线末尾显示想法数量徽章
                                    ↓
                点击已有划线 → 显示 Ideas(N) 按钮 → 查看/编辑/删除想法
```

### 3.3 iOS Native App 当前流程

```
选中文本 → 点击 笔记 → 弹出 AddNoteSheet → 输入笔记 → Save
                              ↓
                    (Sheet 显示选中文本预览)
                              ↓
                    (没有与划线关联的逻辑)
```

### 3.4 iOS 需要改进的内容

1. **创建划线后自动弹出想法输入框**
2. **支持查看划线关联的所有想法**
3. **想法的编辑和删除功能**
4. **划线末尾显示想法数量徽章**

---

## 4. 图片 AI 解析功能

### 4.1 Web App 实现

**API 端点**: `POST /api/ai/explain-image`

当用户点击书中的图片时：
1. 图片转换为 base64
2. 调用 AI API 分析图片
3. 显示居中的 Toast 弹窗展示分析结果

```typescript
// EpubReader.tsx:266-332
contents.document.addEventListener('click', (e: MouseEvent) => {
  if (target.tagName === 'IMG') {
    // 转换为 base64 并调用 AI
    getBase64FromImage(img).then(base64 => {
      fetch('/api/ai/explain-image', {
        body: JSON.stringify({ imageUrl: base64, targetLanguage })
      })
    })
  }
})
```

### 4.2 iOS 实现状态

❌ **iOS 尚未实现图片 AI 解析功能**

---

## 5. 其他差异点

### 5.1 划线颜色

| 平台 | 支持的颜色 |
|-----|-----------|
| Web App | 单一黄色 (`rgba(251, 191, 36, 0.35)`) |
| iOS | 6种颜色 (黄、绿、蓝、粉、紫、橙) |

### 5.2 阅读设置

| 功能 | Web App | iOS Native |
|-----|---------|------------|
| 字体大小调节 | ✅ (15-30px) | ✅ |
| 字体选择 | ✅ (7种英文衬线字体) | ✅ (4种中文字体) |
| 主题模式 | ✅ (亮色/复古/暗色) | ✅ (亮色/复古/绿色/暗色) |
| 全屏模式 | ✅ | ✅ |
| 行间距调节 | ❌ | ✅ |

### 5.3 社交功能

| 功能 | Web App | iOS Native |
|-----|---------|------------|
| 好友想法侧边栏 | ❌ | ✅ (FriendThoughtsSidebar) |
| 好友想法气泡 | ❌ | ✅ (FriendThoughtBubble) |

---

## 6. 实现优先级建议

### P0 - 必须实现
1. **AI 释义按钮** - 在气泡菜单中添加释义按钮
2. **AI 释义弹窗** - 显示 AI 分析结果

### P1 - 高优先级
3. **创建划线后自动弹出想法输入** - 优化笔记流程
4. **查看划线关联的想法列表** - 支持在弹窗中查看
5. **想法编辑和删除** - 完善 CRUD 功能

### P2 - 中优先级
6. **图片 AI 解析** - 点击图片获取 AI 分析
7. **想法数量徽章** - 在划线末尾显示数量

### P3 - 低优先级
8. **语音输入** - 使用 iOS Speech 框架

---

## 7. 相关文件清单

### Web App
- `packages/web/src/components/EpubReader.tsx` - EPUB 阅读器主组件
- `packages/web/src/components/EbookReader.tsx` - 通用电子书阅读器
- `packages/web/src/services/annotationService.ts` - 划线/想法服务层

### iOS Native App
- `packages/ios/BookPost/Views/Reader/TextSelectionMenu.swift` - 文本选择菜单
- `packages/ios/BookPost/Views/Reader/ReaderContainerView.swift` - 阅读器容器
- `packages/ios/BookPost/Views/Reader/EPUBReaderView.swift` - EPUB 阅读器
- `packages/ios/BookPost/Views/Reader/EnhancedPDFReaderView.swift` - PDF 阅读器
- `packages/ios/BookPost/Models/ReaderModels.swift` - 阅读器数据模型
- `packages/ios/BookPost/Models/Note.swift` - 笔记数据模型
- `packages/ios/BookPost/Services/APIClient.swift` - API 客户端

### API
- `packages/api/src/routes/` - API 路由定义

---

## 8. 技术实现要点

### 8.1 iOS AI 释义功能实现建议

```swift
// 1. 在 TextSelectionMenu 中添加释义按钮
struct TextSelectionMenu: View {
    let onMeaning: () -> Void  // 新增回调

    var body: some View {
        HStack(spacing: 0) {
            // ... 现有按钮
            Divider()
            menuButton(icon: "sparkles", label: L10n.AI.meaning) {
                onMeaning()
            }
        }
    }
}

// 2. 在 APIClient 中添加 API 方法
func getMeaning(text: String, paragraph: String, targetLanguage: String) async throws -> MeaningResponse {
    let endpoint = "/api/ai/meaning"
    let body = MeaningRequest(text: text, paragraph: paragraph, targetLanguage: targetLanguage)
    return try await post(endpoint, body: body)
}

// 3. 创建释义弹窗视图
struct MeaningPopupView: View {
    let selectedText: String
    @State private var meaning: String = ""
    @State private var isLoading = true

    var body: some View {
        VStack {
            Text(selectedText)
                .padding()
                .background(Color.yellow.opacity(0.2))

            if isLoading {
                ProgressView()
            } else {
                // Markdown 渲染
                Text(LocalizedStringKey(meaning))
            }
        }
    }
}
```

### 8.2 气泡菜单状态机建议

```swift
enum BubbleMenuState {
    case confirm       // 新选中文本
    case existing      // 点击已有划线
    case ideaInput     // 输入想法
}

struct TextSelectionOverlay: View {
    @State private var menuState: BubbleMenuState = .confirm

    var body: some View {
        switch menuState {
        case .confirm:
            ConfirmBubbleMenu(onUnderline: ..., onMeaning: ...)
        case .existing:
            ExistingBubbleMenu(onViewIdeas: ..., onAddIdea: ..., onMeaning: ..., onDelete: ...)
        case .ideaInput:
            IdeaInputBubble(onSave: ..., onSkip: ...)
        }
    }
}
```

---

*文档创建时间: 2024-12-14*
*最后更新: 2024-12-14*
