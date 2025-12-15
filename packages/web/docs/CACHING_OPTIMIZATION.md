# 缓存机制优化方案

## 一、现状问题分析

### 1.1 当前架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Ebooks   │  │Magazines │  │ Books    │  │Bookshelf │    │
│  │Dashboard │  │Dashboard │  │Dashboard │  │Dashboard │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       ▼             ▼             ▼             ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              手动 fetch() 调用                        │   │
│  │              ❌ 无缓存机制                            │   │
│  │              ❌ 每次组件挂载都重新请求                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 问题清单

| 组件 | 文件位置 | 问题描述 | 用户影响 |
|------|----------|----------|----------|
| BookshelfDashboard | `src/components/BookshelfDashboard.tsx` | 每次切换 tab 重新请求阅读历史 | 频繁看到 loading 状态 |
| EbookReader | `src/components/EbookReader.tsx` | 每次打开电子书重新下载全文 (5-50MB) | 等待时间长，浪费流量 |
| MagazineReader | `src/components/MagazineReader.tsx` | 每次打开杂志重新获取页面信息 | 重复等待 |
| FlipbookMagazineReader | `src/components/FlipbookMagazineReader.tsx` | 每次预加载页面图片 | 重复下载图片 |

### 1.3 代码示例 - 当前实现

```typescript
// BookshelfDashboard.tsx - 无缓存的手动 fetch
export default function BookshelfDashboard() {
  const [readingHistory, setReadingHistory] = useState({ ebooks: [], magazines: [], books: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchReadingHistory()  // ❌ 每次组件挂载都执行
    }
  }, [token])

  const fetchReadingHistory = async () => {
    const response = await fetch('/api/reading-history', { headers })
    // ...
  }
}
```

```typescript
// EbookReader.tsx - 无缓存的手动 fetch
export default function EbookReader({ ebook }) {
  const [ebookText, setEbookText] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEbookText()  // ❌ 每次打开都重新下载整本书
  }, [ebook.id])

  const fetchEbookText = async () => {
    const response = await fetch(`/api/ebooks/${ebook.id}/text`)
    // 下载 5-50MB 的电子书内容
  }
}
```

---

## 二、技术方案

### 2.1 方案选型

使用项目已有的 **TanStack React Query v5** 实现客户端缓存：

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| React Query | 项目已引入，功能完善，自动管理 | - | ✅ 采用 |
| localStorage | 简单，持久化 | 需手动管理，5MB 限制 | ❌ |
| IndexedDB | 大容量，持久化 | 复杂，需额外库 | 可选扩展 |
| Service Worker | 离线支持 | 复杂，维护成本高 | 可选扩展 |

### 2.2 React Query 核心概念

```typescript
// queryKey: 缓存的唯一标识
// staleTime: 数据被认为是"新鲜"的时间，期间不会重新请求
// gcTime: 缓存在内存中保留的时间（即使没有组件使用）

useQuery({
  queryKey: ['ebook-text', ebookId],  // 缓存 key
  queryFn: () => fetchEbookText(ebookId),
  staleTime: 60 * 60 * 1000,  // 1小时内认为是新鲜的
  gcTime: 24 * 60 * 60 * 1000, // 24小时后才从内存清除
})
```

### 2.3 缓存策略设计

| 数据类型 | queryKey | staleTime | gcTime | 理由 |
|----------|----------|-----------|--------|------|
| 阅读历史 | `['reading-history']` | 30秒 | 10分钟 | 可能被其他设备更新 |
| 电子书列表 | `['ebooks', params]` | 2分钟 | 10分钟 | 可能有新书添加 |
| 电子书详情 | `['ebook', id]` | 5分钟 | 30分钟 | 元数据较少变化 |
| 电子书内容 | `['ebook-text', id]` | 1小时 | 24小时 | 大文件，内容不变 |
| 电子书划线 | `['ebook-underlines', id]` | 30秒 | 5分钟 | 用户可能频繁添加 |
| 杂志列表 | `['magazines', params]` | 2分钟 | 10分钟 | 可能有新杂志 |
| 杂志详情 | `['magazine', id]` | 5分钟 | 30分钟 | 元数据较少变化 |
| 杂志页面图片 | `['magazine-page', id, page]` | 1小时 | 24小时 | 图片不变 |

---

## 三、实现细节

### 3.1 新增 React Query Hooks

**文件**: `src/hooks/useApi.ts`

```typescript
// ============================================
// 电子书相关 Hooks
// ============================================

/**
 * 获取单个电子书详情（带缓存）
 */
export function useEbook(id: number | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['ebook', id],
    queryFn: () => fetchWithAuth(`/ebooks/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,      // 5分钟
    gcTime: 30 * 60 * 1000,        // 30分钟
  })
}

/**
 * 获取电子书全文内容（长时间缓存）
 * 用于阅读器，避免重复下载大文件
 */
export function useEbookText(id: number | undefined) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['ebook-text', id],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const response = await fetch(`/api/ebooks/${id}/text`, { headers })
      if (!response.ok) {
        throw new Error('Failed to load ebook')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000,     // 1小时
    gcTime: 24 * 60 * 60 * 1000,   // 24小时
  })
}

/**
 * 获取电子书划线数据
 */
export function useEbookUnderlines(ebookId: number | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['ebook-underlines', ebookId],
    queryFn: () => fetchWithAuth(`/ebooks/${ebookId}/underlines`),
    enabled: !!ebookId,
    staleTime: 30 * 1000,          // 30秒
    gcTime: 5 * 60 * 1000,         // 5分钟
  })
}

// ============================================
// 杂志相关 Hooks
// ============================================

/**
 * 获取单个杂志详情
 */
export function useMagazine(id: number | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['magazine', id],
    queryFn: () => fetchWithAuth(`/magazines/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * 获取杂志页面信息
 */
export function useMagazineInfo(id: number | undefined) {
  const fetchWithAuth = useFetchWithAuth()
  return useQuery({
    queryKey: ['magazine-info', id],
    queryFn: () => fetchWithAuth(`/magazines/${id}/info`),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
```

### 3.2 BookshelfDashboard 改造

**文件**: `src/components/BookshelfDashboard.tsx`

```typescript
// Before: 手动状态管理
export default function BookshelfDashboard() {
  const [readingHistory, setReadingHistory] = useState({ ebooks: [], magazines: [], books: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReadingHistory()
  }, [token])

  const fetchReadingHistory = async () => { /* ... */ }
}

// After: 使用 React Query
import { useReadingHistory } from '../hooks/useApi'

export default function BookshelfDashboard() {
  const {
    data: rawHistory,
    isLoading: loading,
    refetch: refreshHistory
  } = useReadingHistory()

  // 转换数据格式
  const readingHistory = useMemo(() => {
    if (!rawHistory) return { ebooks: [], magazines: [], books: [] }
    // ... 数据转换逻辑
  }, [rawHistory])

  // 阅读后刷新
  const handleBackFromReader = () => {
    refreshHistory()
  }
}
```

### 3.3 EbookReader 改造

**文件**: `src/components/EbookReader.tsx`

```typescript
// Before: 手动 fetch
export default function EbookReader({ ebook, onBack }) {
  const [ebookText, setEbookText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [underlines, setUnderlines] = useState([])

  useEffect(() => {
    fetchEbookText()
    fetchUnderlines()
  }, [ebook.id])
}

// After: 使用 React Query
import { useEbookText, useEbookUnderlines } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'

export default function EbookReader({ ebook, onBack }) {
  const queryClient = useQueryClient()

  // 电子书内容 - 24小时缓存
  const {
    data: ebookText,
    isLoading: loading,
    error
  } = useEbookText(ebook.id)

  // 划线数据
  const {
    data: underlines = [],
    refetch: refetchUnderlines
  } = useEbookUnderlines(ebook.id)

  // 创建划线后刷新
  const handleConfirmUnderline = async () => {
    await createUnderline(/* ... */)
    refetchUnderlines()  // 或使用 invalidateQueries
  }

  // 返回时更新阅读历史
  const handleBack = async () => {
    await saveReadingHistory()
    queryClient.invalidateQueries({ queryKey: ['reading-history'] })
    onBack()
  }
}
```

### 3.4 缓存失效策略

```typescript
import { useQueryClient } from '@tanstack/react-query'

// 在需要刷新缓存的地方
const queryClient = useQueryClient()

// 1. 使特定缓存失效
queryClient.invalidateQueries({ queryKey: ['reading-history'] })

// 2. 使匹配的缓存失效
queryClient.invalidateQueries({ queryKey: ['ebook-underlines', ebookId] })

// 3. 直接更新缓存（乐观更新）
queryClient.setQueryData(['ebook-underlines', ebookId], (old) => {
  return [...old, newUnderline]
})

// 4. 预取数据（用户可能访问的内容）
queryClient.prefetchQuery({
  queryKey: ['ebook-text', nextEbookId],
  queryFn: () => fetchEbookText(nextEbookId),
})
```

---

## 四、文件修改清单

### 4.1 需要修改的文件

| 文件 | 修改类型 | 修改内容 |
|------|----------|----------|
| `src/hooks/useApi.ts` | 新增代码 | 添加 `useEbook`, `useEbookText`, `useEbookUnderlines`, `useMagazine`, `useMagazineInfo` |
| `src/components/BookshelfDashboard.tsx` | 重构 | 使用 `useReadingHistory()` 替代手动 fetch |
| `src/components/EbookReader.tsx` | 重构 | 使用 `useEbookText()`, `useEbookUnderlines()` |
| `src/components/MagazineReader.tsx` | 重构 | 使用 `useMagazine()`, `useMagazineInfo()` |
| `src/components/FlipbookMagazineReader.tsx` | 重构 | 使用缓存 hooks |

### 4.2 不需要修改的文件

- `src/App.tsx` - QueryClientProvider 已配置
- `package.json` - @tanstack/react-query 已安装

---

## 五、预期效果

### 5.1 性能对比

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 切换书架 tab 后返回 | 1-2秒 loading | < 50ms 瞬间显示 | **95%+** |
| 再次打开同一电子书 (10MB) | 重新下载 5-10秒 | < 100ms 显示缓存 | **98%+** |
| 返回书架再进入详情 | 500ms-1秒 | < 50ms | **90%+** |
| 添加划线后列表更新 | 手动刷新 | 自动更新 | 体验提升 |

### 5.2 流量节省

| 内容类型 | 单次大小 | 日均访问 | 月节省流量 |
|----------|----------|----------|------------|
| 电子书全文 | 5-50 MB | 3次重复 | 300-1500 MB |
| 阅读历史 | 10-50 KB | 20次重复 | 6-30 MB |
| 杂志页面 | 200KB/页 | 10次重复 | 60 MB |

### 5.3 用户体验提升

```
优化前:
┌──────────────────────────────────────┐
│  书架 Tab                            │
│  ┌────────────────────────────────┐ │
│  │     ⏳ Loading...              │ │  ← 每次都要等待
│  │                                │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘

优化后:
┌──────────────────────────────────────┐
│  书架 Tab                            │
│  ┌────────────────────────────────┐ │
│  │  📚 最近阅读                    │ │  ← 瞬间显示缓存
│  │  ├─ 《深入理解计算机系统》      │ │
│  │  ├─ 《代码整洁之道》           │ │
│  │  └─ 《设计模式》               │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 六、后续扩展

### 6.1 可选优化 - IndexedDB 持久化

对于超大文件（电子书全文），可考虑使用 IndexedDB 持久化：

```typescript
// 使用 idb-keyval 或 localforage
import { get, set } from 'idb-keyval'

export function useEbookTextPersisted(id: number) {
  return useQuery({
    queryKey: ['ebook-text', id],
    queryFn: async () => {
      // 先检查 IndexedDB
      const cached = await get(`ebook-text-${id}`)
      if (cached) return cached

      // 没有缓存则请求
      const data = await fetchEbookText(id)
      await set(`ebook-text-${id}`, data)
      return data
    },
    staleTime: Infinity,  // 永不过期
    gcTime: Infinity,
  })
}
```

### 6.2 可选优化 - 预加载

```typescript
// 在书架页面预加载用户可能阅读的电子书
function BookshelfDashboard() {
  const queryClient = useQueryClient()

  // 预加载最近阅读的第一本书
  useEffect(() => {
    if (readingHistory.ebooks[0]) {
      queryClient.prefetchQuery({
        queryKey: ['ebook-text', readingHistory.ebooks[0].item_id],
        queryFn: () => fetchEbookText(readingHistory.ebooks[0].item_id),
      })
    }
  }, [readingHistory])
}
```

---

## 七、实施计划

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| 阶段1 | useApi.ts 添加新 hooks | 30分钟 |
| 阶段2 | BookshelfDashboard 改造 | 30分钟 |
| 阶段3 | EbookReader 改造 | 45分钟 |
| 阶段4 | MagazineReader 改造 | 30分钟 |
| 阶段5 | 测试验证 | 30分钟 |

**总计**: 约 2.5 小时

---

## 八、风险与注意事项

1. **内存占用**: 大文件缓存会占用较多内存，需监控
2. **数据一致性**: 缓存数据可能与服务器不同步，需合理设置 staleTime
3. **缓存失效**: 关键操作后需手动 invalidate 缓存
4. **错误处理**: React Query 有内置重试机制，需合理配置

---

*文档版本: 1.0*
*创建日期: 2024-12-15*
*适用项目: BookLibrio Web*
