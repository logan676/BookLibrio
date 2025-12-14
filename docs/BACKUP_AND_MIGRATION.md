# BookPost 备份与迁移指南

本文档详细说明如何备份 BookPost 的所有数据，以及如何迁移到其他服务商。

## 目录

1. [当前架构概述](#当前架构概述)
2. [本地备份指南](#本地备份指南)
3. [服务商迁移指南](#服务商迁移指南)
4. [各服务商替代方案](#各服务商替代方案)

---

## 当前架构概述

BookPost 使用以下云服务：

| 组件 | 当前服务商 | 用途 | 数据位置 |
|------|-----------|------|---------|
| **API 运行时** | Fly.dev | 运行 Node.js API | 无状态，代码在 Git |
| **数据库** | Supabase | PostgreSQL 数据库 | 云端 + 本地备份 |
| **文件存储** | Cloudflare R2 | 书籍文件、封面图片 | 云端 |
| **代码仓库** | GitHub | 源代码管理 | 云端 + 本地 |

### 数据依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                        iOS App                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Fly.dev (API 服务)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  packages/api/ - Hono.js + Drizzle ORM              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Supabase (PostgreSQL)   │    │   Cloudflare R2          │
│   - 用户数据               │    │   - 电子书文件 (.epub)   │
│   - 书籍元数据             │    │   - 杂志文件 (.pdf)      │
│   - 阅读记录               │    │   - 封面图片             │
│   - 笔记、书单             │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

---

## 本地备份指南

### 快速备份

```bash
# 1. 进入 API 目录
cd packages/api

# 2. 运行备份脚本
npx tsx src/scripts/backup-database.ts
```

备份将保存到 `packages/api/backups/YYYY-MM-DD_HH-MM-SS/` 目录。

### 备份内容

```
backups/2025-12-14_19-30-00/
├── _metadata.json          # 备份元数据
├── ebooks.json             # 电子书 (871+)
├── magazines.json          # 杂志 (1,400+)
├── book_categories.json    # 分类 (6,000+)
├── curated_lists.json      # 书单 (100+)
├── curated_list_items.json # 书单内容 (900+)
├── users.json              # 用户数据
├── notes.json              # 阅读笔记
├── reading_history.json    # 阅读历史
├── reading_sessions.json   # 阅读会话
├── badges.json             # 徽章定义
└── ...                     # 其他表
```

### 备份存储位置

备份文件存储在本地，**不会**上传到 Git：
- 位置: `packages/api/backups/`
- 已在 `.gitignore` 中排除

### 建议的备份频率

| 数据类型 | 建议频率 | 说明 |
|---------|---------|------|
| 用户数据 | 每周 | 用户、阅读记录、笔记 |
| 内容数据 | 每月 | 书籍元数据、书单 |
| 完整备份 | 每次重大更新前 | 所有数据 |

### 验证备份

```bash
# 查看备份元数据
cat packages/api/backups/最新备份目录/_metadata.json

# 检查关键表的行数
wc -l packages/api/backups/最新备份目录/*.json
```

---

## 服务商迁移指南

### 迁移 Fly.dev → 其他平台

Fly.dev 只运行无状态的 API 代码，迁移最简单：

**迁移到 Railway:**
```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
cd packages/api
railway init

# 4. 设置环境变量
railway variables set DATABASE_URL="your-db-url"
railway variables set R2_ACCOUNT_ID="your-r2-id"
# ... 其他变量

# 5. 部署
railway up
```

**迁移到 Render:**
```bash
# 1. 在 render.com 创建 Web Service
# 2. 连接 GitHub 仓库
# 3. 设置:
#    - Build Command: cd packages/api && npm install
#    - Start Command: cd packages/api && npm start
# 4. 添加环境变量
```

**迁移到 Vercel:**
```bash
# 需要将 API 改为 Serverless 函数格式
# 参考: https://vercel.com/docs/functions
```

### 迁移 Supabase → 其他 PostgreSQL

**步骤 1: 从备份恢复到新数据库**

```bash
# 1. 设置新数据库 URL
export NEW_DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 2. 在新数据库上运行 schema
cd packages/api
npx drizzle-kit push:pg

# 3. 恢复数据
npx tsx src/scripts/restore-database.ts backups/2025-12-14_19-30-00
```

**步骤 2: 更新应用配置**

```bash
# 更新 .env 文件
DATABASE_URL="postgresql://user:pass@new-host:5432/dbname"

# 重新部署 API
fly deploy  # 或其他平台的部署命令
```

**推荐的 PostgreSQL 替代方案:**

| 服务商 | 免费额度 | 特点 |
|-------|---------|------|
| [Neon](https://neon.tech) | 0.5GB | Serverless，自动扩缩 |
| [Railway](https://railway.app) | $5/月额度 | 简单易用 |
| [PlanetScale](https://planetscale.com) | 5GB | MySQL 兼容 (需调整) |
| [CockroachDB](https://cockroachlabs.cloud) | 5GB | 分布式，高可用 |
| 自托管 | - | 完全控制 |

### 迁移 Cloudflare R2 → 其他存储

R2 使用 S3 兼容 API，迁移到其他 S3 兼容存储非常简单：

**步骤 1: 导出文件列表**

```bash
# 使用 rclone 同步文件
rclone sync r2:your-bucket ./local-backup/files

# 或使用 AWS CLI
aws s3 sync s3://your-bucket ./local-backup/files \
  --endpoint-url https://xxx.r2.cloudflarestorage.com
```

**步骤 2: 上传到新存储**

```bash
# 上传到 AWS S3
aws s3 sync ./local-backup/files s3://new-bucket

# 或上传到 MinIO
mc cp --recursive ./local-backup/files minio/new-bucket
```

**步骤 3: 更新应用配置**

```typescript
// 修改 packages/api/src/services/storage.ts
// 更新 S3 客户端配置指向新存储
```

**推荐的存储替代方案:**

| 服务商 | 免费额度 | 特点 |
|-------|---------|------|
| [AWS S3](https://aws.amazon.com/s3) | 5GB/12个月 | 最成熟 |
| [Backblaze B2](https://backblaze.com/b2) | 10GB | 便宜 |
| [Wasabi](https://wasabi.com) | 无 | 无出站费用 |
| [MinIO](https://min.io) | 自托管 | 开源，S3 兼容 |

---

## 各服务商替代方案

### 完整替代方案对比

| 当前 | 替代方案 1 | 替代方案 2 | 替代方案 3 |
|------|-----------|-----------|-----------|
| Fly.dev | Railway | Render | 自托管 VPS |
| Supabase | Neon | Railway PostgreSQL | 自托管 PostgreSQL |
| Cloudflare R2 | AWS S3 | Backblaze B2 | MinIO |

### 最省钱方案 (个人项目)

```
API:     Railway (免费额度)
数据库:  Neon (免费 0.5GB)
存储:    Backblaze B2 (免费 10GB)
```

### 最稳定方案 (生产环境)

```
API:     AWS ECS / Google Cloud Run
数据库:  AWS RDS / Google Cloud SQL
存储:    AWS S3 / Google Cloud Storage
```

### 完全自托管方案

```
服务器:  Hetzner / DigitalOcean VPS
容器:    Docker + Docker Compose
数据库:  PostgreSQL (Docker)
存储:    MinIO (Docker) 或本地文件系统
反向代理: Nginx / Caddy
```

---

## 紧急恢复流程

如果当前服务商完全不可用：

### 1. 准备新环境

```bash
# 选择新服务商并创建账户
# 例如: Railway + Neon + Backblaze B2
```

### 2. 部署数据库

```bash
# 在 Neon 创建数据库后
export DATABASE_URL="postgresql://..."

# 推送 schema
cd packages/api
npx drizzle-kit push:pg

# 恢复数据
npx tsx src/scripts/restore-database.ts backups/最新备份
```

### 3. 部署 API

```bash
# 更新 .env 配置
# 部署到新平台
railway up  # 或其他平台命令
```

### 4. 更新 iOS App

```swift
// 修改 APIClient.swift 中的 baseURL
let baseURL = "https://new-api-url.com"
```

### 5. 验证

```bash
# 测试 API
curl https://new-api-url.com/api/health

# 测试数据
curl https://new-api-url.com/api/ebooks?limit=1
```

---

## 自动化备份 (可选)

### 使用 cron 定期备份

```bash
# 编辑 crontab
crontab -e

# 每周日凌晨 3 点备份
0 3 * * 0 cd /path/to/bookpost/packages/api && npx tsx src/scripts/backup-database.ts >> /var/log/bookpost-backup.log 2>&1
```

### 使用 GitHub Actions 备份到私有仓库

创建 `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 3 * * 0'  # 每周日
  workflow_dispatch:      # 手动触发

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd packages/api && npm install

      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: cd packages/api && npx tsx src/scripts/backup-database.ts

      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_number }}
          path: packages/api/backups/
          retention-days: 90
```

---

## 联系方式

如有问题，请查阅：
- 项目 README
- GitHub Issues
- 相关服务商文档

---

*最后更新: 2025-12-14*
