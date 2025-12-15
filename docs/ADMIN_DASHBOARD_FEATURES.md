# BookPost 管理后台功能文档

## 概述

管理后台提供了内容管理、用户管理、系统监控等核心功能，访问路径为 `/admin`，需要管理员权限（`is_admin = true`）。

**相关文件：**
- 前端组件：`packages/web/src/components/AdminDashboard.tsx`
- API 路由：`packages/api/src/routes/admin.ts`
- 认证中间件：`packages/api/src/middleware/auth.ts`

---

## 一、功能模块总览

| 模块 | 功能描述 | 状态 |
|------|----------|------|
| 统计面板 | 内容统计和用户统计 | ✅ 已实现 |
| 内容导入 | 批量导入杂志和电子书 | ✅ 已实现 |
| 用户管理 | 查看用户列表和权限 | ✅ 已实现 |
| 任务管理 | 后台任务触发和监控 | ✅ 已实现 |
| 系统监控 | 服务器健康状态 | ✅ 已实现 |
| 榜单管理 | 外部排行榜和内部排行榜管理 | 📋 计划中 |
| 分类管理 | 书籍分类 CRUD | 📋 计划中 |

---

## 二、详细功能说明

### 1. 统计数据面板

**位置：** Admin Dashboard 首页

**展示内容：**
- **杂志统计：** 总数量 + 已预处理数量
- **电子书统计：** 总数量
- **用户统计：** 注册用户数（可点击展开用户列表）

**API 端点：**
```
GET /api/admin/stats
```

**响应示例：**
```json
{
  "magazines": {
    "total": 250,
    "preprocessed": 180
  },
  "ebooks": 1500,
  "users": 850
}
```

---

### 2. 内容导入功能

**功能描述：** 从服务器本地文件系统批量导入书籍内容

**支持类型：**

| 类型 | 支持格式 |
|------|----------|
| 杂志 (Magazine) | PDF |
| 电子书 (Ebook) | PDF, EPUB |

**操作流程：**
1. 选择导入类型（杂志/电子书）
2. 浏览服务器文件夹，选择目标目录
3. 启动导入任务
4. 实时查看导入进度和错误信息

**API 端点：**

#### 浏览文件系统
```
GET /api/admin/browse?path=/path/to/folder
```

**响应示例：**
```json
{
  "currentPath": "/path",
  "parentPath": "/",
  "folders": [
    { "name": "folder1", "path": "/path/folder1" }
  ]
}
```

#### 启动导入任务
```
POST /api/admin/import
Content-Type: application/json

{
  "type": "magazine|ebook",
  "folderPath": "/path/to/folder"
}
```

#### 获取导入进度
```
GET /api/admin/import/progress
```

**响应示例：**
```json
{
  "running": true,
  "type": "magazine",
  "current": 45,
  "total": 100,
  "currentItem": "filename.pdf",
  "errors": []
}
```

---

### 3. 用户管理

**功能描述：** 查看和管理系统用户

**展示信息：**
- 用户邮箱
- 管理员标识
- 注册时间

**API 端点：**
```
GET /api/admin/users
```

**响应示例：**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "is_admin": 0,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### 4. 后台任务管理

**功能描述：** 监控和手动触发后台定时任务

**支持的任务：**

| 任务名称 | 功能说明 |
|----------|----------|
| `refresh_popular_highlights` | 刷新热门摘录 |
| `aggregate_book_stats` | 聚合书籍统计数据 |
| `enrich_book_metadata` | 丰富书籍元数据 |
| `compute_related_books` | 计算相关书籍推荐 |
| `cleanup_expired_ai_cache` | 清理过期的 AI 缓存 |

**API 端点：**

#### 获取所有任务状态
```
GET /api/admin/jobs
Authorization: Bearer {ADMIN_API_KEY}
```

**响应示例：**
```json
{
  "refresh_popular_highlights": {
    "running": false,
    "lastRun": "2024-01-15T10:30:00Z"
  }
}
```

#### 手动触发指定任务
```
POST /api/admin/jobs/{jobName}/trigger
Authorization: Bearer {ADMIN_API_KEY}
```

---

### 5. 系统监控

**功能描述：** 获取服务器运行状态信息

**监控指标：**
- Node.js 版本
- 运行平台
- 服务器运行时长
- 内存使用情况（堆内存、外部内存）
- 运行环境

**API 端点：**
```
GET /api/admin/system
Authorization: Bearer {ADMIN_API_KEY}
```

**响应示例：**
```json
{
  "nodeVersion": "v18.0.0",
  "platform": "darwin",
  "uptime": 86400,
  "memory": {
    "heapUsed": 128,
    "heapTotal": 512,
    "external": 32
  },
  "environment": "production"
}
```

---

## 三、认证与安全

### 认证方式

管理后台采用**双重认证机制**：

| 认证类型 | 适用场景 | 认证方式 |
|----------|----------|----------|
| 用户权限认证 | 内容导入、用户管理、统计 | JWT Token + `is_admin` 检查 |
| API Key 认证 | 任务管理、系统监控 | `ADMIN_API_KEY` Bearer Token |

### 权限检查流程

```
前端：AdminPage 组件检查 user.is_admin
       ↓
后端：requireAdmin 中间件验证
       ↓
数据库：users.is_admin 字段
```

### 中间件说明

| 中间件 | 功能 |
|--------|------|
| `requireAuth` | 检查有效的用户 JWT Token |
| `requireAdmin` | 检查 Token + admin 权限（is_admin = true） |
| `optionalAuth` | 可选认证，未登录用户也可访问 |

### 环境变量配置

```env
ADMIN_API_KEY=your_admin_api_key  # 系统级 API 认证密钥
```

---

## 四、技术架构

```
┌─────────────────────────────────────────────────┐
│                    Web 前端                      │
│  packages/web/src/components/AdminDashboard.tsx │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                    API 后端                      │
│      packages/api/src/routes/admin.ts           │
│      packages/api/src/middleware/auth.ts        │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                    数据库                        │
│         users.is_admin (权限字段)               │
└─────────────────────────────────────────────────┘
```

---

## 五、计划中的功能

### 榜单管理 (Ranking Management)

书城中显示的榜单分为两类：**外部排行榜** 和 **内部排行榜**。

#### 5.1 外部排行榜 (Curated Lists)

来自外部权威来源的精选书单，存储于 `curatedLists` 和 `curatedListItems` 表。

**支持的榜单来源：**

| 来源标识 | 名称 | 描述 |
|----------|------|------|
| `nyt_bestseller` | 纽约时报畅销榜 | The New York Times Best Sellers |
| `amazon_best` | 亚马逊精选 | Amazon Best Books |
| `bill_gates` | 比尔·盖茨推荐 | Bill Gates' Reading List |
| `goodreads_choice` | Goodreads 年度选择 | Goodreads Choice Awards |
| `pulitzer` | 普利策奖 | Pulitzer Prize Winners |
| `booker` | 布克奖 | Man Booker Prize |
| `obama_reading` | 奥巴马推荐 | Barack Obama's Reading List |
| `national_book` | 美国国家图书奖 | National Book Award |

**数据结构：**

```typescript
// curatedLists 表
{
  id: number;
  listType: string;           // 榜单类型（如 nyt_bestseller）
  title: string;              // 榜单标题
  subtitle?: string;          // 副标题
  description?: string;       // 描述
  sourceName: string;         // 来源名称
  sourceUrl?: string;         // 来源链接
  sourceLogoUrl?: string;     // 来源 Logo
  year?: number;              // 年份
  month?: number;             // 月份
  isFeatured: boolean;        // 是否精选
  bookCount: number;          // 书籍数量
  viewCount: number;          // 浏览次数
  saveCount: number;          // 收藏次数
  isActive: boolean;          // 是否激活
  createdAt: Date;
  updatedAt: Date;
}

// curatedListItems 表
{
  id: number;
  listId: number;             // 关联的榜单 ID
  bookId?: number;            // 关联的本地书籍 ID（可选）
  externalTitle: string;      // 外部书名
  externalAuthor: string;     // 外部作者名
  externalCoverUrl?: string;  // 外部封面 URL
  isbn?: string;              // ISBN
  amazonUrl?: string;         // 亚马逊链接
  goodreadsUrl?: string;      // Goodreads 链接
  position: number;           // 排名位置
  editorNote?: string;        // 编辑备注
  createdAt: Date;
}
```

**管理功能：**

| 功能 | 描述 |
|------|------|
| 榜单列表 | 查看所有外部榜单，支持按来源/年份筛选 |
| 创建榜单 | 手动创建新的外部榜单 |
| 编辑榜单 | 修改榜单基本信息（标题、描述、Logo等） |
| 删除榜单 | 删除榜单及其关联的书籍项 |
| 书籍管理 | 添加、编辑、删除榜单中的书籍 |
| 书籍关联 | 将外部书籍关联到本地电子书库 |
| 封面管理 | 上传/更新书籍封面图片 |
| 批量导入 | 从 CSV 文件批量导入榜单数据 |
| AI 获取 | 使用 AI 自动获取最新榜单数据 |

**API 端点设计：**

```
# 榜单 CRUD
GET    /api/admin/curated-lists                    # 获取所有外部榜单
POST   /api/admin/curated-lists                    # 创建新榜单
GET    /api/admin/curated-lists/:id                # 获取榜单详情
PUT    /api/admin/curated-lists/:id                # 更新榜单信息
DELETE /api/admin/curated-lists/:id                # 删除榜单

# 榜单书籍管理
GET    /api/admin/curated-lists/:id/items          # 获取榜单书籍列表
POST   /api/admin/curated-lists/:id/items          # 添加书籍到榜单
PUT    /api/admin/curated-lists/:id/items/:itemId  # 更新书籍信息
DELETE /api/admin/curated-lists/:id/items/:itemId  # 从榜单移除书籍
PUT    /api/admin/curated-lists/:id/items/:itemId/link  # 关联本地书籍

# 批量操作
POST   /api/admin/curated-lists/import             # CSV 批量导入
POST   /api/admin/curated-lists/fetch-ai           # AI 获取榜单数据
```

**现有导入脚本：**

| 脚本 | 位置 | 功能 |
|------|------|------|
| `import-rankings-csv.ts` | `packages/api/src/scripts/` | 从 CSV 导入榜单数据 |
| `populate-external-rankings.ts` | `packages/api/src/scripts/` | 使用 AI 获取最新榜单 |
| `fix-ranking-covers.ts` | `packages/api/src/scripts/` | 修复封面图片 |
| `populate-rankings-with-r2.ts` | `packages/api/src/scripts/` | 上传封面到 R2 存储 |

---

#### 5.2 内部排行榜 (Rankings)

基于用户阅读行为自动计算的排行榜，存储于 `rankings` 和 `rankingItems` 表。

**支持的排行榜类型：**

| 类型标识 | 名称 | 计算逻辑 |
|----------|------|----------|
| `trending` | 飙升榜 | 基于阅读会话数和用户数的增长速度 |
| `hot_search` | 热搜榜 | 基于搜索次数统计 |
| `new_books` | 新书榜 | 新发布书籍，按浏览量+读者数排序 |
| `fiction` | 虚构类榜 | 虚构类书籍，按流行度+评分排序 |
| `non_fiction` | 非虚构类榜 | 非虚构类书籍，按流行度+评分排序 |
| `film_tv` | 影视改编榜 | 有影视改编的书籍 |
| `audiobook` | 有声书榜 | 有有声书版本的书籍 |
| `top_200` | Top 200 | 综合榜单，流行度 × 评分权重 |
| `masterpiece` | 经典榜 | 评分 ≥ 9.5 的高分书籍 |
| `potential_masterpiece` | 潜力经典榜 | 评分 ≥ 9.0 但读者 < 1000 |

**时间周期：**

| 周期 | 描述 |
|------|------|
| `daily` | 每日榜单 |
| `weekly` | 每周榜单 |
| `monthly` | 每月榜单 |
| `all_time` | 总榜 |

**数据结构：**

```typescript
// rankings 表
{
  id: number;
  rankingType: string;        // 排行榜类型
  periodType: string;         // 时间周期
  periodStart?: Date;         // 周期开始时间
  periodEnd?: Date;           // 周期结束时间
  displayName: string;        // 显示名称
  themeColor?: string;        // 主题颜色
  isActive: boolean;          // 是否激活
  computedAt: Date;           // 计算时间
}

// rankingItems 表
{
  id: number;
  rankingId: number;          // 关联排行榜 ID
  ebookId?: number;           // 关联电子书 ID
  rank: number;               // 当前排名
  previousRank?: number;      // 上次排名
  rankChange?: number;        // 排名变化
  score: number;              // 排名分数
  bookTitle: string;          // 书名快照
  bookAuthor: string;         // 作者快照
  bookCoverUrl?: string;      // 封面快照
  readerCount?: number;       // 读者数
  rating?: number;            // 评分
  evaluationTag?: string;     // 评价标签
}
```

**管理功能：**

| 功能 | 描述 |
|------|------|
| 排行榜列表 | 查看所有内部排行榜状态 |
| 手动刷新 | 手动触发排行榜重新计算 |
| 参数配置 | 调整排行榜计算参数（权重、阈值等） |
| 激活/停用 | 控制排行榜是否在书城显示 |
| 编辑书籍 | 手动调整排行榜中的书籍（特殊情况） |

**API 端点设计：**

```
# 排行榜管理
GET    /api/admin/rankings                         # 获取所有内部排行榜
GET    /api/admin/rankings/:type                   # 获取特定类型排行榜
PUT    /api/admin/rankings/:type                   # 更新排行榜配置
POST   /api/admin/rankings/:type/refresh           # 手动刷新排行榜
PUT    /api/admin/rankings/:type/status            # 激活/停用排行榜

# 排行榜书籍管理
GET    /api/admin/rankings/:type/items             # 获取排行榜书籍
PUT    /api/admin/rankings/:type/items/:itemId     # 编辑排名项
DELETE /api/admin/rankings/:type/items/:itemId     # 移除排名项
```

**排行榜计算服务：**

- 位置：`packages/api/src/services/ranking.ts`
- 定时任务：可通过后台任务管理触发
- 计算指标：流行度、评分、阅读时长、用户数等

---

### 分类管理 (Category Management)

根据 [CATEGORY_BROWSING_FEATURE.md](./CATEGORY_BROWSING_FEATURE.md) 规划：

```
POST   /api/admin/categories              # 创建分类
PUT    /api/admin/categories/:id          # 更新分类
DELETE /api/admin/categories/:id          # 删除分类
PUT    /api/admin/ebooks/:id/categories   # 设置电子书分类
PUT    /api/admin/magazines/:id/categories # 设置杂志分类
```

### 书籍元数据管理

- 批量编辑书籍信息
- 封面图管理
- 元数据丰富（自动获取）

---

## 六、API 端点汇总

### 已实现的端点

| 方法 | 端点 | 描述 | 认证方式 |
|------|------|------|----------|
| GET | `/api/admin/stats` | 获取统计数据 | requireAdmin |
| GET | `/api/admin/users` | 获取用户列表 | requireAdmin |
| GET | `/api/admin/browse` | 浏览文件系统 | requireAdmin |
| POST | `/api/admin/import` | 启动导入任务 | requireAdmin |
| GET | `/api/admin/import/progress` | 获取导入进度 | requireAdmin |
| GET | `/api/admin/jobs` | 获取任务状态 | API Key |
| POST | `/api/admin/jobs/:name/trigger` | 触发任务 | API Key |
| GET | `/api/admin/system` | 获取系统信息 | API Key |

### 计划中的端点（榜单管理）

#### 外部排行榜 (Curated Lists)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/admin/curated-lists` | 获取所有外部榜单 |
| POST | `/api/admin/curated-lists` | 创建新榜单 |
| GET | `/api/admin/curated-lists/:id` | 获取榜单详情 |
| PUT | `/api/admin/curated-lists/:id` | 更新榜单信息 |
| DELETE | `/api/admin/curated-lists/:id` | 删除榜单 |
| GET | `/api/admin/curated-lists/:id/items` | 获取榜单书籍 |
| POST | `/api/admin/curated-lists/:id/items` | 添加书籍 |
| PUT | `/api/admin/curated-lists/:id/items/:itemId` | 更新书籍 |
| DELETE | `/api/admin/curated-lists/:id/items/:itemId` | 删除书籍 |
| PUT | `/api/admin/curated-lists/:id/items/:itemId/link` | 关联本地书籍 |
| POST | `/api/admin/curated-lists/import` | CSV 批量导入 |
| POST | `/api/admin/curated-lists/fetch-ai` | AI 获取数据 |

#### 内部排行榜 (Rankings)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/admin/rankings` | 获取所有内部排行榜 |
| GET | `/api/admin/rankings/:type` | 获取特定排行榜 |
| PUT | `/api/admin/rankings/:type` | 更新排行榜配置 |
| POST | `/api/admin/rankings/:type/refresh` | 手动刷新排行榜 |
| PUT | `/api/admin/rankings/:type/status` | 激活/停用排行榜 |
| GET | `/api/admin/rankings/:type/items` | 获取排行榜书籍 |
| PUT | `/api/admin/rankings/:type/items/:itemId` | 编辑排名项 |
| DELETE | `/api/admin/rankings/:type/items/:itemId` | 移除排名项 |

---

## 更新日志

- **2024-12-15**: 添加榜单管理功能规划（外部排行榜 + 内部排行榜）
- **2024-12-15**: 初始版本，梳理现有管理后台功能
