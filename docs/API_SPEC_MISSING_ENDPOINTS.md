# BookPost API Specification - Missing Endpoints

**Version**: 1.0.0
**Date**: 2025-12-12
**Base URL**: `/api`

This document specifies the API endpoints that need to be implemented to support the full iOS app functionality as defined in the WeRead-style PRD.

---

## Table of Contents

1. [Store & Discovery](#1-store--discovery)
2. [Membership System](#2-membership-system)
3. [AI Features](#3-ai-features)
4. [Social & Thoughts](#4-social--thoughts)
5. [Media Upload](#5-media-upload)
6. [Database Schema Changes](#6-database-schema-changes)

---

## 1. Store & Discovery

### 1.1 GET /store/categories

Get hierarchical book categories (28 categories with sub-categories).

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "categories": [
    {
      "id": "fiction",
      "name": "小说",
      "icon": "book.fill",
      "color": "#FF6B6B",
      "bookCount": 12580,
      "subcategories": [
        {
          "id": "fiction-romance",
          "name": "言情",
          "bookCount": 3420
        },
        {
          "id": "fiction-fantasy",
          "name": "玄幻",
          "bookCount": 2890
        },
        {
          "id": "fiction-scifi",
          "name": "科幻",
          "bookCount": 1560
        },
        {
          "id": "fiction-mystery",
          "name": "悬疑推理",
          "bookCount": 2100
        },
        {
          "id": "fiction-history",
          "name": "历史",
          "bookCount": 1420
        },
        {
          "id": "fiction-military",
          "name": "军事",
          "bookCount": 890
        }
      ]
    },
    {
      "id": "literature",
      "name": "文学",
      "icon": "text.book.closed.fill",
      "color": "#4ECDC4",
      "bookCount": 8920,
      "subcategories": [
        {
          "id": "literature-classic",
          "name": "经典文学",
          "bookCount": 2340
        },
        {
          "id": "literature-modern",
          "name": "现当代文学",
          "bookCount": 3210
        },
        {
          "id": "literature-foreign",
          "name": "外国文学",
          "bookCount": 2180
        },
        {
          "id": "literature-poetry",
          "name": "诗歌散文",
          "bookCount": 1190
        }
      ]
    },
    {
      "id": "business",
      "name": "经管",
      "icon": "chart.line.uptrend.xyaxis",
      "color": "#45B7D1",
      "bookCount": 6540,
      "subcategories": [
        {
          "id": "business-management",
          "name": "管理",
          "bookCount": 2100
        },
        {
          "id": "business-investment",
          "name": "投资理财",
          "bookCount": 1890
        },
        {
          "id": "business-marketing",
          "name": "市场营销",
          "bookCount": 1240
        },
        {
          "id": "business-career",
          "name": "职场",
          "bookCount": 1310
        }
      ]
    },
    {
      "id": "self-help",
      "name": "成长",
      "icon": "figure.walk",
      "color": "#96CEB4",
      "bookCount": 5230,
      "subcategories": [
        {
          "id": "self-help-psychology",
          "name": "心理学",
          "bookCount": 1560
        },
        {
          "id": "self-help-emotion",
          "name": "情绪管理",
          "bookCount": 980
        },
        {
          "id": "self-help-interpersonal",
          "name": "人际沟通",
          "bookCount": 1120
        },
        {
          "id": "self-help-thinking",
          "name": "思维方法",
          "bookCount": 1570
        }
      ]
    },
    {
      "id": "social-science",
      "name": "社科",
      "icon": "globe.asia.australia.fill",
      "color": "#DDA0DD",
      "bookCount": 4890,
      "subcategories": [
        {
          "id": "social-science-history",
          "name": "历史",
          "bookCount": 1780
        },
        {
          "id": "social-science-philosophy",
          "name": "哲学",
          "bookCount": 890
        },
        {
          "id": "social-science-politics",
          "name": "政治军事",
          "bookCount": 1120
        },
        {
          "id": "social-science-culture",
          "name": "文化",
          "bookCount": 1100
        }
      ]
    },
    {
      "id": "science",
      "name": "科技",
      "icon": "atom",
      "color": "#F7DC6F",
      "bookCount": 3650,
      "subcategories": [
        {
          "id": "science-popular",
          "name": "科普",
          "bookCount": 1230
        },
        {
          "id": "science-computer",
          "name": "计算机",
          "bookCount": 1420
        },
        {
          "id": "science-internet",
          "name": "互联网",
          "bookCount": 1000
        }
      ]
    },
    {
      "id": "lifestyle",
      "name": "生活",
      "icon": "heart.fill",
      "color": "#FF8C94",
      "bookCount": 4120,
      "subcategories": [
        {
          "id": "lifestyle-health",
          "name": "健康养生",
          "bookCount": 1450
        },
        {
          "id": "lifestyle-travel",
          "name": "旅行",
          "bookCount": 890
        },
        {
          "id": "lifestyle-cooking",
          "name": "美食烹饪",
          "bookCount": 780
        },
        {
          "id": "lifestyle-parenting",
          "name": "亲子育儿",
          "bookCount": 1000
        }
      ]
    },
    {
      "id": "education",
      "name": "教育",
      "icon": "graduationcap.fill",
      "color": "#87CEEB",
      "bookCount": 2890,
      "subcategories": [
        {
          "id": "education-exam",
          "name": "考试",
          "bookCount": 1200
        },
        {
          "id": "education-language",
          "name": "外语学习",
          "bookCount": 980
        },
        {
          "id": "education-children",
          "name": "少儿读物",
          "bookCount": 710
        }
      ]
    }
  ]
}
```

---

### 1.2 GET /store/rankings

Get available ranking types and their metadata.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "rankings": [
    {
      "id": "hot",
      "name": "热搜榜",
      "description": "24小时搜索最热书籍",
      "icon": "flame.fill",
      "updateFrequency": "hourly"
    },
    {
      "id": "trending",
      "name": "飙升榜",
      "description": "阅读量增长最快",
      "icon": "chart.line.uptrend.xyaxis",
      "updateFrequency": "daily"
    },
    {
      "id": "new",
      "name": "新书榜",
      "description": "最新上架好书",
      "icon": "sparkles",
      "updateFrequency": "daily"
    },
    {
      "id": "rating",
      "name": "好评榜",
      "description": "读者评分最高",
      "icon": "star.fill",
      "updateFrequency": "weekly"
    },
    {
      "id": "finished",
      "name": "完结榜",
      "description": "已完结精品",
      "icon": "checkmark.circle.fill",
      "updateFrequency": "weekly"
    },
    {
      "id": "free",
      "name": "免费榜",
      "description": "免费书籍排行",
      "icon": "gift.fill",
      "updateFrequency": "daily"
    },
    {
      "id": "member",
      "name": "会员榜",
      "description": "会员专享精选",
      "icon": "crown.fill",
      "updateFrequency": "weekly"
    },
    {
      "id": "audiobook",
      "name": "听书榜",
      "description": "有声书热门排行",
      "icon": "headphones",
      "updateFrequency": "weekly"
    },
    {
      "id": "male",
      "name": "男生榜",
      "description": "男性读者最爱",
      "icon": "person.fill",
      "updateFrequency": "weekly"
    },
    {
      "id": "female",
      "name": "女生榜",
      "description": "女性读者最爱",
      "icon": "person.fill",
      "updateFrequency": "weekly"
    },
    {
      "id": "classic",
      "name": "经典榜",
      "description": "经久不衰的经典",
      "icon": "book.closed.fill",
      "updateFrequency": "monthly"
    }
  ]
}
```

---

### 1.3 GET /store/rankings/{type}

Get books for a specific ranking.

**Authentication**: Optional

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Ranking type ID (hot, trending, new, etc.) |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 50) |
| category | string | null | Filter by category ID |

**Response** `200 OK`:
```json
{
  "ranking": {
    "id": "hot",
    "name": "热搜榜",
    "updatedAt": "2025-12-12T10:00:00Z"
  },
  "books": [
    {
      "rank": 1,
      "rankChange": 2,
      "book": {
        "id": "book-123",
        "type": "ebook",
        "title": "人世间",
        "author": "梁晓声",
        "coverUrl": "/api/covers/ebook/book-123.jpg",
        "rating": 9.2,
        "ratingCount": 45678,
        "readerCount": 128900,
        "wordCount": 1150000,
        "category": {
          "id": "literature",
          "name": "文学"
        },
        "tags": ["茅盾文学奖", "年代小说", "家族史诗"],
        "isFree": false,
        "isMemberFree": true,
        "price": 45.00
      },
      "stats": {
        "searchCount24h": 12580,
        "readCount24h": 8920,
        "finishRate": 0.68
      }
    },
    {
      "rank": 2,
      "rankChange": -1,
      "book": {
        "id": "book-456",
        "type": "ebook",
        "title": "三体",
        "author": "刘慈欣",
        "coverUrl": "/api/covers/ebook/book-456.jpg",
        "rating": 9.4,
        "ratingCount": 89012,
        "readerCount": 256000,
        "wordCount": 880000,
        "category": {
          "id": "fiction-scifi",
          "name": "科幻"
        },
        "tags": ["雨果奖", "硬科幻", "宇宙"],
        "isFree": false,
        "isMemberFree": false,
        "price": 68.00
      },
      "stats": {
        "searchCount24h": 11200,
        "readCount24h": 9100,
        "finishRate": 0.72
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

**Response** `404 Not Found`:
```json
{
  "error": "ranking_not_found",
  "message": "Ranking type 'invalid' does not exist"
}
```

---

### 1.4 GET /store/recommendations

Get personalized book recommendations for the user.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Number of recommendations |
| type | string | "mixed" | Recommendation type: mixed, similar, author, category |

**Response** `200 OK`:
```json
{
  "sections": [
    {
      "id": "for-you",
      "title": "猜你喜欢",
      "subtitle": "根据你的阅读偏好推荐",
      "type": "personalized",
      "books": [
        {
          "id": "book-789",
          "type": "ebook",
          "title": "活着",
          "author": "余华",
          "coverUrl": "/api/covers/ebook/book-789.jpg",
          "rating": 9.4,
          "matchScore": 95,
          "matchReason": "你喜欢的作者余华的作品"
        }
      ]
    },
    {
      "id": "because-read",
      "title": "读过《平凡的世界》的人也在读",
      "subtitle": null,
      "type": "collaborative",
      "sourceBook": {
        "id": "book-001",
        "title": "平凡的世界"
      },
      "books": [
        {
          "id": "book-790",
          "type": "ebook",
          "title": "白鹿原",
          "author": "陈忠实",
          "coverUrl": "/api/covers/ebook/book-790.jpg",
          "rating": 9.0,
          "matchScore": 88,
          "matchReason": "87%的读者也读过"
        }
      ]
    },
    {
      "id": "trending-category",
      "title": "文学类热门",
      "subtitle": "你常读的分类",
      "type": "category_trending",
      "category": "literature",
      "books": []
    }
  ],
  "generatedAt": "2025-12-12T10:30:00Z"
}
```

---

### 1.5 GET /store/daily-picks

Get curated daily book selections.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "date": "2025-12-12",
  "theme": {
    "title": "冬日暖心读物",
    "subtitle": "用文字温暖这个冬天",
    "backgroundImage": "/api/assets/themes/winter-warm.jpg"
  },
  "picks": [
    {
      "id": "pick-1",
      "book": {
        "id": "book-101",
        "type": "ebook",
        "title": "边城",
        "author": "沈从文",
        "coverUrl": "/api/covers/ebook/book-101.jpg",
        "rating": 8.9,
        "description": "湘西边境的牧歌式故事"
      },
      "editorNote": "编辑推荐：沈从文笔下的湘西世界，纯净而温暖，是冬日最好的心灵慰藉。",
      "editorName": "小书虫",
      "editorAvatar": "/api/avatars/editor-1.jpg"
    },
    {
      "id": "pick-2",
      "book": {
        "id": "book-102",
        "type": "ebook",
        "title": "围炉夜话",
        "author": "王永彬",
        "coverUrl": "/api/covers/ebook/book-102.jpg",
        "rating": 8.5,
        "description": "处世哲学经典"
      },
      "editorNote": "编辑推荐：冬夜围炉而坐，品读古人智慧，暖身更暖心。",
      "editorName": "书香",
      "editorAvatar": "/api/avatars/editor-2.jpg"
    }
  ],
  "previousDates": [
    "2025-12-11",
    "2025-12-10",
    "2025-12-09"
  ]
}
```

---

### 1.6 GET /store/books

Enhanced book search with advanced filters.

**Authentication**: Optional

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | null | Search query |
| category | string | null | Category ID |
| subcategory | string | null | Subcategory ID |
| wordCountMin | integer | null | Minimum word count |
| wordCountMax | integer | null | Maximum word count |
| priceType | string | null | "free", "member", "paid" |
| status | string | null | "ongoing", "finished" |
| sortBy | string | "relevance" | "relevance", "rating", "readers", "newest", "wordCount" |
| sortOrder | string | "desc" | "asc", "desc" |
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |

**Response** `200 OK`:
```json
{
  "query": {
    "q": "科幻",
    "category": "fiction",
    "filters": {
      "wordCountMin": 100000,
      "priceType": "member"
    },
    "sortBy": "rating",
    "sortOrder": "desc"
  },
  "results": [
    {
      "id": "book-456",
      "type": "ebook",
      "title": "三体",
      "author": "刘慈欣",
      "coverUrl": "/api/covers/ebook/book-456.jpg",
      "rating": 9.4,
      "ratingCount": 89012,
      "readerCount": 256000,
      "wordCount": 880000,
      "status": "finished",
      "category": {
        "id": "fiction-scifi",
        "name": "科幻"
      },
      "isFree": false,
      "isMemberFree": true,
      "price": 68.00,
      "highlightedTitle": "<em>科幻</em>巨作三体",
      "highlightedDescription": "地球文明向宇宙发出的第一声啼鸣..."
    }
  ],
  "facets": {
    "categories": [
      { "id": "fiction-scifi", "name": "科幻", "count": 1560 },
      { "id": "fiction-fantasy", "name": "玄幻", "count": 890 }
    ],
    "wordCountRanges": [
      { "range": "0-100000", "label": "10万字以下", "count": 234 },
      { "range": "100000-500000", "label": "10-50万字", "count": 567 },
      { "range": "500000+", "label": "50万字以上", "count": 189 }
    ],
    "priceTypes": [
      { "type": "free", "label": "免费", "count": 123 },
      { "type": "member", "label": "会员免费", "count": 456 },
      { "type": "paid", "label": "付费", "count": 789 }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1560,
    "hasMore": true
  }
}
```

---

## 2. Membership System

### 2.1 GET /membership/plans

Get available membership subscription plans.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "plans": [
    {
      "id": "monthly_auto",
      "name": "连续包月",
      "description": "自动续费，随时取消",
      "price": 19.00,
      "originalPrice": 25.00,
      "currency": "CNY",
      "duration": {
        "value": 1,
        "unit": "month"
      },
      "isAutoRenew": true,
      "discount": 0.24,
      "badge": "推荐",
      "appleProductId": "com.bookpost.membership.monthly.auto",
      "features": [
        "全场会员书籍免费读",
        "AI有声书功能",
        "无广告体验",
        "专属会员标识"
      ]
    },
    {
      "id": "monthly",
      "name": "月卡",
      "description": "单次购买，有效期30天",
      "price": 25.00,
      "originalPrice": 25.00,
      "currency": "CNY",
      "duration": {
        "value": 1,
        "unit": "month"
      },
      "isAutoRenew": false,
      "discount": 0,
      "badge": null,
      "appleProductId": "com.bookpost.membership.monthly",
      "features": [
        "全场会员书籍免费读",
        "AI有声书功能",
        "无广告体验",
        "专属会员标识"
      ]
    },
    {
      "id": "quarterly",
      "name": "季卡",
      "description": "有效期90天",
      "price": 68.00,
      "originalPrice": 75.00,
      "currency": "CNY",
      "duration": {
        "value": 3,
        "unit": "month"
      },
      "isAutoRenew": false,
      "discount": 0.09,
      "badge": null,
      "appleProductId": "com.bookpost.membership.quarterly",
      "features": [
        "全场会员书籍免费读",
        "AI有声书功能",
        "无广告体验",
        "专属会员标识"
      ]
    },
    {
      "id": "yearly",
      "name": "年卡",
      "description": "有效期365天，最划算",
      "price": 228.00,
      "originalPrice": 300.00,
      "currency": "CNY",
      "duration": {
        "value": 12,
        "unit": "month"
      },
      "isAutoRenew": false,
      "discount": 0.24,
      "badge": "最划算",
      "appleProductId": "com.bookpost.membership.yearly",
      "features": [
        "全场会员书籍免费读",
        "AI有声书功能",
        "无广告体验",
        "专属会员标识",
        "年度阅读报告",
        "专属客服通道"
      ]
    }
  ],
  "benefits": [
    {
      "id": "free-books",
      "icon": "book.fill",
      "title": "海量会员书籍",
      "description": "超过10万本会员书籍免费阅读"
    },
    {
      "id": "ai-audio",
      "icon": "headphones",
      "title": "AI有声书",
      "description": "任意书籍一键转为有声书"
    },
    {
      "id": "no-ads",
      "icon": "xmark.circle.fill",
      "title": "无广告",
      "description": "纯净阅读体验"
    },
    {
      "id": "badge",
      "icon": "crown.fill",
      "title": "会员标识",
      "description": "专属会员身份标识"
    },
    {
      "id": "cloud-sync",
      "icon": "icloud.fill",
      "title": "云端同步",
      "description": "阅读进度多端同步"
    },
    {
      "id": "priority-support",
      "icon": "message.fill",
      "title": "专属客服",
      "description": "优先响应您的问题"
    }
  ],
  "promotion": {
    "active": true,
    "title": "限时特惠",
    "description": "新用户首月仅需9.9元",
    "endTime": "2025-12-31T23:59:59Z",
    "plans": ["monthly_auto"],
    "discountPrice": 9.90
  }
}
```

---

### 2.2 GET /membership/status

Get current user's membership status.

**Authentication**: Required

**Response** `200 OK` (Active Member):
```json
{
  "isMember": true,
  "membership": {
    "planId": "monthly_auto",
    "planName": "连续包月",
    "startDate": "2025-11-12T00:00:00Z",
    "expiryDate": "2025-12-12T23:59:59Z",
    "isAutoRenew": true,
    "nextBillingDate": "2025-12-12T00:00:00Z",
    "daysRemaining": 0,
    "status": "active"
  },
  "stats": {
    "memberSince": "2024-06-15T00:00:00Z",
    "totalDays": 545,
    "savedAmount": 1280.00,
    "booksRead": 89
  },
  "benefits": {
    "memberBooksAccess": true,
    "aiAudioAccess": true,
    "noAds": true,
    "cloudSync": true
  }
}
```

**Response** `200 OK` (Non-Member):
```json
{
  "isMember": false,
  "membership": null,
  "trial": {
    "eligible": true,
    "daysAvailable": 7,
    "hasUsed": false
  },
  "benefits": {
    "memberBooksAccess": false,
    "aiAudioAccess": false,
    "noAds": false,
    "cloudSync": true
  }
}
```

---

### 2.3 POST /membership/subscribe

Create a new subscription (verify Apple IAP receipt).

**Authentication**: Required

**Request Body**:
```json
{
  "planId": "monthly_auto",
  "receiptData": "base64_encoded_apple_receipt...",
  "transactionId": "1000000123456789",
  "platform": "ios"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "subscription": {
    "id": "sub_abc123",
    "planId": "monthly_auto",
    "planName": "连续包月",
    "startDate": "2025-12-12T10:30:00Z",
    "expiryDate": "2026-01-12T10:30:00Z",
    "isAutoRenew": true,
    "transactionId": "1000000123456789"
  },
  "message": "订阅成功！您现在是会员了"
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "invalid_receipt",
  "message": "收据验证失败，请重试"
}
```

**Response** `409 Conflict`:
```json
{
  "error": "already_subscribed",
  "message": "您已经是会员，无需重复订阅"
}
```

---

### 2.4 POST /membership/redeem

Redeem a gift code or promo code.

**Authentication**: Required

**Request Body**:
```json
{
  "code": "ABCD-EFGH-1234"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "redemption": {
    "code": "ABCD-EFGH-1234",
    "type": "gift_card",
    "membershipDays": 30,
    "bonusPoints": 100,
    "newExpiryDate": "2026-01-12T23:59:59Z"
  },
  "message": "兑换成功！获得30天会员"
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "invalid_code",
  "message": "兑换码无效或已被使用"
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "code_expired",
  "message": "兑换码已过期"
}
```

---

### 2.5 GET /membership/history

Get user's membership purchase history.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |

**Response** `200 OK`:
```json
{
  "history": [
    {
      "id": "txn_001",
      "type": "subscription",
      "planId": "monthly_auto",
      "planName": "连续包月",
      "amount": 19.00,
      "currency": "CNY",
      "status": "completed",
      "transactionId": "1000000123456789",
      "platform": "ios",
      "createdAt": "2025-11-12T10:30:00Z"
    },
    {
      "id": "txn_002",
      "type": "redemption",
      "code": "WXYZ-5678-MNOP",
      "membershipDays": 7,
      "status": "completed",
      "createdAt": "2025-10-05T15:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasMore": false
  }
}
```

---

### 2.6 POST /membership/cancel

Cancel auto-renewal subscription.

**Authentication**: Required

**Request Body**:
```json
{
  "reason": "too_expensive",
  "feedback": "希望价格更优惠一些"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "已取消自动续费，会员有效期至 2025-12-12",
  "expiryDate": "2025-12-12T23:59:59Z"
}
```

---

## 3. AI Features

### 3.1 POST /ai/ask-book

Ask AI questions about a specific book (conversational).

**Authentication**: Required

**Request Body**:
```json
{
  "bookId": "book-123",
  "bookType": "ebook",
  "question": "这本书的主要主题是什么？",
  "conversationId": "conv_abc123",
  "context": {
    "currentChapter": "第三章",
    "selectedText": null
  }
}
```

**Response** `200 OK`:
```json
{
  "conversationId": "conv_abc123",
  "messageId": "msg_xyz789",
  "answer": "《平凡的世界》的主要主题包括：\n\n1. **奋斗与成长** - 通过孙少安、孙少平兄弟的经历，展现了普通人通过努力改变命运的可能。\n\n2. **时代变迁** - 小说跨越1975-1985年，记录了中国农村从人民公社到改革开放的巨大变革。\n\n3. **爱情与亲情** - 探讨了不同阶层、不同背景的人之间的情感纠葛。\n\n4. **理想与现实** - 人物们在追求理想和面对现实之间的挣扎和选择。",
  "suggestions": [
    "孙少平和田晓霞的爱情是怎样发展的？",
    "书中如何描写农村改革？",
    "这本书获得了什么奖项？"
  ],
  "relatedHighlights": [
    {
      "id": "hl_001",
      "text": "生活不能等待别人来安排，要自己去争取和奋斗",
      "chapter": "第一部 第三章",
      "highlightCount": 12580
    }
  ],
  "tokensUsed": 450,
  "model": "claude-3-sonnet"
}
```

**Response** `429 Too Many Requests`:
```json
{
  "error": "rate_limit",
  "message": "您今日的AI问答次数已用完，升级会员可获得无限次数",
  "dailyLimit": 10,
  "used": 10,
  "resetsAt": "2025-12-13T00:00:00Z"
}
```

---

### 3.2 GET /ai/conversations

Get user's AI conversation history.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| bookId | string | null | Filter by book |
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |

**Response** `200 OK`:
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "bookId": "book-123",
      "bookTitle": "平凡的世界",
      "messageCount": 5,
      "lastMessage": {
        "role": "assistant",
        "preview": "《平凡的世界》的主要主题包括..."
      },
      "createdAt": "2025-12-12T10:00:00Z",
      "updatedAt": "2025-12-12T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "hasMore": false
  }
}
```

---

### 3.3 GET /ai/outline/{bookId}

Get AI-generated book outline with summaries.

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| bookId | string | Book ID |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| bookType | string | "ebook" | Book type |
| regenerate | boolean | false | Force regeneration |

**Response** `200 OK`:
```json
{
  "bookId": "book-123",
  "bookTitle": "平凡的世界",
  "generatedAt": "2025-12-10T08:00:00Z",
  "outline": [
    {
      "id": "part-1",
      "level": 0,
      "title": "第一部",
      "pageRange": "1-320",
      "summary": "1975年至1978年，以孙少安、孙少平兄弟为中心，描写了黄土高原上双水村的生活和变迁。",
      "keywords": ["知青", "农村", "贫困", "初恋"],
      "isKeySection": true,
      "readingProgress": 1.0,
      "children": [
        {
          "id": "ch-1",
          "level": 1,
          "title": "第一章",
          "pageRange": "1-25",
          "summary": "1975年二三月间，孙少平在县立高中读书，因家境贫困只能吃最差的伙食。",
          "keywords": ["孙少平", "高中", "贫困"],
          "isKeySection": false,
          "readingProgress": 1.0,
          "children": []
        },
        {
          "id": "ch-2",
          "level": 1,
          "title": "第二章",
          "pageRange": "26-52",
          "summary": "介绍孙少平的家庭背景和双水村的基本情况。",
          "keywords": ["双水村", "家庭", "背景"],
          "isKeySection": false,
          "readingProgress": 1.0,
          "children": []
        }
      ]
    },
    {
      "id": "part-2",
      "level": 0,
      "title": "第二部",
      "pageRange": "321-680",
      "summary": "1979年至1982年，改革开放初期，孙少安开办砖窑，孙少平外出打工。",
      "keywords": ["改革", "砖窑", "打工", "爱情"],
      "isKeySection": true,
      "readingProgress": 0.6,
      "children": []
    },
    {
      "id": "part-3",
      "level": 0,
      "title": "第三部",
      "pageRange": "681-1000",
      "summary": "1983年至1985年，人物命运走向高潮与结局。",
      "keywords": ["煤矿", "悲剧", "成长", "结局"],
      "isKeySection": true,
      "readingProgress": 0,
      "children": []
    }
  ],
  "totalChapters": 54,
  "estimatedReadTime": "约40小时"
}
```

**Response** `202 Accepted` (Generating):
```json
{
  "status": "generating",
  "message": "AI正在生成大纲，请稍候...",
  "estimatedTime": 30,
  "jobId": "job_outline_123"
}
```

---

### 3.4 GET /ai/guide/{bookId}

Get AI-generated reading guide with topic cards.

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| bookId | string | Book ID |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| bookType | string | "ebook" | Book type |

**Response** `200 OK`:
```json
{
  "bookId": "book-123",
  "bookTitle": "平凡的世界",
  "topics": [
    {
      "id": "topic-1",
      "title": "书籍亮点",
      "icon": "sparkles",
      "color": "#FF6B6B",
      "summary": "荣获茅盾文学奖，被誉为\"中国版《约翰·克利斯朵夫》\"",
      "details": [
        "1991年获第三届茅盾文学奖",
        "全景式展现中国当代城乡社会生活",
        "累计发行超过1700万册",
        "被改编为电视剧、话剧等多种形式"
      ],
      "expandable": true
    },
    {
      "id": "topic-2",
      "title": "时代背景",
      "icon": "clock.arrow.circlepath",
      "color": "#4ECDC4",
      "summary": "1975-1985年，中国从文革末期到改革开放初期的历史巨变",
      "details": [
        "文化大革命末期的社会状态",
        "1978年十一届三中全会后的改革",
        "农村联产承包责任制的实施",
        "城市经济体制改革的开始"
      ],
      "expandable": true
    },
    {
      "id": "topic-3",
      "title": "人物关系",
      "icon": "person.3.fill",
      "color": "#45B7D1",
      "summary": "以孙、田、金三家为核心的复杂人物网络",
      "details": [
        "孙家：孙玉厚一家，代表贫困农民",
        "田家：田福堂一家，代表农村干部",
        "金家：金俊武一家，代表普通村民",
        "主要人物超过50个"
      ],
      "expandable": true
    },
    {
      "id": "topic-4",
      "title": "核心概念",
      "icon": "lightbulb.fill",
      "color": "#96CEB4",
      "summary": "理解这些概念有助于更好地阅读",
      "details": [
        "生产队与人民公社制度",
        "工农差别与城乡二元结构",
        "高考恢复与知识分子命运",
        "乡镇企业的兴起"
      ],
      "expandable": true
    },
    {
      "id": "topic-5",
      "title": "名人推荐",
      "icon": "star.fill",
      "color": "#DDA0DD",
      "summary": "潘石屹、马云等企业家推荐",
      "details": [
        "潘石屹：\"这本书改变了我的人生\"",
        "马云：\"对我影响最大的一本书\"",
        "俞敏洪：\"每个奋斗者都应该读\"",
        "央视《读书》栏目多次推荐"
      ],
      "expandable": true
    }
  ],
  "quickActions": [
    {
      "id": "action-1",
      "title": "开始阅读",
      "icon": "book.fill",
      "action": "start_reading"
    },
    {
      "id": "action-2",
      "title": "AI问答",
      "icon": "bubble.left.and.bubble.right.fill",
      "action": "open_chat"
    },
    {
      "id": "action-3",
      "title": "查看大纲",
      "icon": "list.bullet.indent",
      "action": "view_outline"
    }
  ]
}
```

---

### 3.5 GET /ai/voices

Get available TTS voices for AI audio.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "voices": [
    {
      "id": "voice-xiaoxiao",
      "name": "晓晓",
      "gender": "female",
      "language": "zh-CN",
      "style": "温柔",
      "description": "温柔知性的女声，适合文学作品",
      "previewUrl": "/api/ai/voices/xiaoxiao/preview.mp3",
      "provider": "azure",
      "isPremium": false
    },
    {
      "id": "voice-yunxi",
      "name": "云希",
      "gender": "male",
      "language": "zh-CN",
      "style": "沉稳",
      "description": "沉稳大气的男声，适合历史传记",
      "previewUrl": "/api/ai/voices/yunxi/preview.mp3",
      "provider": "azure",
      "isPremium": false
    },
    {
      "id": "voice-xiaomo",
      "name": "晓墨",
      "gender": "female",
      "language": "zh-CN",
      "style": "活泼",
      "description": "活泼可爱的女声，适合轻松读物",
      "previewUrl": "/api/ai/voices/xiaomo/preview.mp3",
      "provider": "azure",
      "isPremium": false
    },
    {
      "id": "voice-yunyang",
      "name": "云扬",
      "gender": "male",
      "language": "zh-CN",
      "style": "磁性",
      "description": "磁性低沉的男声，适合悬疑小说",
      "previewUrl": "/api/ai/voices/yunyang/preview.mp3",
      "provider": "azure",
      "isPremium": true
    },
    {
      "id": "voice-xiaoyi",
      "name": "晓伊",
      "gender": "female",
      "language": "zh-CN",
      "style": "甜美",
      "description": "甜美清新的女声，适合青春文学",
      "previewUrl": "/api/ai/voices/xiaoyi/preview.mp3",
      "provider": "azure",
      "isPremium": true
    }
  ],
  "defaultVoiceId": "voice-xiaoxiao"
}
```

---

### 3.6 POST /ai/generate-audio

Request TTS audio generation for a chapter.

**Authentication**: Required (Member only)

**Request Body**:
```json
{
  "bookId": "book-123",
  "bookType": "ebook",
  "chapterId": "ch-1",
  "voiceId": "voice-xiaoxiao",
  "speed": 1.0
}
```

**Response** `202 Accepted`:
```json
{
  "jobId": "job_audio_456",
  "status": "queued",
  "estimatedTime": 120,
  "message": "音频生成中，预计2分钟完成",
  "queuePosition": 3
}
```

**Response** `200 OK` (Already generated):
```json
{
  "status": "ready",
  "audio": {
    "url": "/api/ai/audio/book-123/ch-1/voice-xiaoxiao.mp3",
    "duration": 1823,
    "size": 14582400,
    "generatedAt": "2025-12-11T15:00:00Z",
    "expiresAt": "2025-12-18T15:00:00Z"
  }
}
```

**Response** `403 Forbidden`:
```json
{
  "error": "member_required",
  "message": "AI有声书功能需要会员权限"
}
```

---

### 3.7 GET /ai/audio/{jobId}/status

Check audio generation job status.

**Authentication**: Required

**Response** `200 OK`:
```json
{
  "jobId": "job_audio_456",
  "status": "processing",
  "progress": 65,
  "estimatedTimeRemaining": 45,
  "message": "正在生成第15/23段..."
}
```

**Response** `200 OK` (Completed):
```json
{
  "jobId": "job_audio_456",
  "status": "completed",
  "progress": 100,
  "audio": {
    "url": "/api/ai/audio/book-123/ch-1/voice-xiaoxiao.mp3",
    "duration": 1823,
    "size": 14582400
  }
}
```

---

## 4. Social & Thoughts

### 4.1 GET /social/topics

Get trending topics and topic categories.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "trending": [
    {
      "id": "topic-year-end",
      "name": "年度书单",
      "hashtag": "#年度书单",
      "postCount": 12580,
      "isHot": true
    },
    {
      "id": "topic-winter-read",
      "name": "冬日阅读",
      "hashtag": "#冬日阅读",
      "postCount": 8920,
      "isHot": true
    },
    {
      "id": "topic-nobel",
      "name": "诺贝尔文学奖",
      "hashtag": "#诺贝尔文学奖",
      "postCount": 5670,
      "isHot": false
    }
  ],
  "categories": [
    {
      "id": "cat-reading",
      "name": "阅读分享",
      "icon": "book.fill",
      "topics": [
        { "id": "topic-1", "name": "读书笔记", "hashtag": "#读书笔记" },
        { "id": "topic-2", "name": "书摘", "hashtag": "#书摘" },
        { "id": "topic-3", "name": "读后感", "hashtag": "#读后感" }
      ]
    },
    {
      "id": "cat-recommend",
      "name": "好书推荐",
      "icon": "hand.thumbsup.fill",
      "topics": [
        { "id": "topic-4", "name": "五星推荐", "hashtag": "#五星推荐" },
        { "id": "topic-5", "name": "私藏书单", "hashtag": "#私藏书单" },
        { "id": "topic-6", "name": "冷门佳作", "hashtag": "#冷门佳作" }
      ]
    },
    {
      "id": "cat-genre",
      "name": "类型专区",
      "icon": "square.grid.2x2.fill",
      "topics": [
        { "id": "topic-7", "name": "科幻迷", "hashtag": "#科幻迷" },
        { "id": "topic-8", "name": "推理控", "hashtag": "#推理控" },
        { "id": "topic-9", "name": "历史爱好者", "hashtag": "#历史爱好者" }
      ]
    },
    {
      "id": "cat-challenge",
      "name": "阅读挑战",
      "icon": "flame.fill",
      "topics": [
        { "id": "topic-10", "name": "100本挑战", "hashtag": "#100本挑战" },
        { "id": "topic-11", "name": "每日阅读", "hashtag": "#每日阅读" },
        { "id": "topic-12", "name": "阅读马拉松", "hashtag": "#阅读马拉松" }
      ]
    },
    {
      "id": "cat-lifestyle",
      "name": "阅读生活",
      "icon": "cup.and.saucer.fill",
      "topics": [
        { "id": "topic-13", "name": "书房一角", "hashtag": "#书房一角" },
        { "id": "topic-14", "name": "咖啡与书", "hashtag": "#咖啡与书" },
        { "id": "topic-15", "name": "深夜读书", "hashtag": "#深夜读书" }
      ]
    }
  ]
}
```

---

### 4.2 POST /social/thoughts

Publish a new thought/post.

**Authentication**: Required

**Request Body** (multipart/form-data):
```
content: "刚读完《活着》，余华的文字太有力量了。生活再难，也要活着。 #读后感 #余华"
visibility: "public"
bookId: "book-789"
bookType: "ebook"
topicIds: ["topic-3", "topic-4"]
mentionUserIds: ["user-456", "user-789"]
images: [file1.jpg, file2.jpg]
```

**Request Body** (JSON, without images):
```json
{
  "content": "刚读完《活着》，余华的文字太有力量了。",
  "visibility": "public",
  "bookId": "book-789",
  "bookType": "ebook",
  "topicIds": ["topic-3"],
  "mentionUserIds": [],
  "highlightId": "hl_001"
}
```

**Response** `201 Created`:
```json
{
  "thought": {
    "id": "thought_abc123",
    "content": "刚读完《活着》，余华的文字太有力量了。生活再难，也要活着。 #读后感 #余华",
    "author": {
      "id": "user-123",
      "nickname": "书虫小明",
      "avatarUrl": "/api/avatars/user-123.jpg"
    },
    "book": {
      "id": "book-789",
      "type": "ebook",
      "title": "活着",
      "author": "余华",
      "coverUrl": "/api/covers/ebook/book-789.jpg"
    },
    "images": [
      {
        "id": "img-1",
        "url": "/api/uploads/thoughts/img-1.jpg",
        "thumbnailUrl": "/api/uploads/thoughts/img-1-thumb.jpg",
        "width": 1080,
        "height": 1440
      }
    ],
    "topics": [
      { "id": "topic-3", "name": "读后感", "hashtag": "#读后感" }
    ],
    "mentions": [
      { "id": "user-456", "nickname": "阅读达人" }
    ],
    "highlight": null,
    "visibility": "public",
    "likeCount": 0,
    "commentCount": 0,
    "createdAt": "2025-12-12T11:00:00Z"
  }
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "content_too_long",
  "message": "内容不能超过500字",
  "maxLength": 500
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "too_many_images",
  "message": "最多上传9张图片",
  "maxImages": 9
}
```

---

### 4.3 GET /social/thoughts/{id}

Get a specific thought by ID.

**Authentication**: Optional

**Response** `200 OK`:
```json
{
  "thought": {
    "id": "thought_abc123",
    "content": "刚读完《活着》...",
    "author": {
      "id": "user-123",
      "nickname": "书虫小明",
      "avatarUrl": "/api/avatars/user-123.jpg",
      "isFollowing": true
    },
    "book": {
      "id": "book-789",
      "type": "ebook",
      "title": "活着",
      "author": "余华",
      "coverUrl": "/api/covers/ebook/book-789.jpg"
    },
    "images": [],
    "topics": [],
    "mentions": [],
    "highlight": {
      "id": "hl_001",
      "text": "生活不能等待别人来安排，要自己去争取和奋斗",
      "chapter": "第三章"
    },
    "visibility": "public",
    "likeCount": 128,
    "commentCount": 23,
    "isLiked": false,
    "createdAt": "2025-12-12T11:00:00Z"
  },
  "comments": [
    {
      "id": "comment-1",
      "content": "同感！余华的书每本都很震撼",
      "author": {
        "id": "user-456",
        "nickname": "阅读达人",
        "avatarUrl": "/api/avatars/user-456.jpg"
      },
      "likeCount": 5,
      "createdAt": "2025-12-12T11:30:00Z"
    }
  ]
}
```

---

### 4.4 POST /social/thoughts/{id}/comments

Add a comment to a thought.

**Authentication**: Required

**Request Body**:
```json
{
  "content": "写得真好！",
  "replyToCommentId": null
}
```

**Response** `201 Created`:
```json
{
  "comment": {
    "id": "comment-2",
    "content": "写得真好！",
    "author": {
      "id": "user-789",
      "nickname": "夜读人",
      "avatarUrl": "/api/avatars/user-789.jpg"
    },
    "replyTo": null,
    "likeCount": 0,
    "createdAt": "2025-12-12T12:00:00Z"
  }
}
```

---

### 4.5 DELETE /social/thoughts/{id}

Delete a thought (author only).

**Authentication**: Required

**Response** `204 No Content`

**Response** `403 Forbidden`:
```json
{
  "error": "not_author",
  "message": "只能删除自己的想法"
}
```

---

## 5. Media Upload

### 5.1 POST /upload/images

Upload images for thoughts or other purposes.

**Authentication**: Required

**Request** (multipart/form-data):
```
files: [image1.jpg, image2.jpg]
purpose: "thought"
```

**Response** `200 OK`:
```json
{
  "images": [
    {
      "id": "img-abc123",
      "url": "/api/uploads/images/img-abc123.jpg",
      "thumbnailUrl": "/api/uploads/images/img-abc123-thumb.jpg",
      "width": 1080,
      "height": 1440,
      "size": 245760,
      "mimeType": "image/jpeg"
    },
    {
      "id": "img-def456",
      "url": "/api/uploads/images/img-def456.jpg",
      "thumbnailUrl": "/api/uploads/images/img-def456-thumb.jpg",
      "width": 1920,
      "height": 1080,
      "size": 312400,
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "invalid_file_type",
  "message": "只支持 JPG, PNG, WebP 格式",
  "allowedTypes": ["image/jpeg", "image/png", "image/webp"]
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "file_too_large",
  "message": "单个文件不能超过10MB",
  "maxSize": 10485760
}
```

---

### 5.2 GET /users/search

Search users for @mentions.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | required | Search query (min 1 char) |
| limit | integer | 10 | Max results |

**Response** `200 OK`:
```json
{
  "users": [
    {
      "id": "user-456",
      "nickname": "阅读达人",
      "avatarUrl": "/api/avatars/user-456.jpg",
      "isFollowing": true,
      "isMutual": true
    },
    {
      "id": "user-789",
      "nickname": "读书小王子",
      "avatarUrl": "/api/avatars/user-789.jpg",
      "isFollowing": false,
      "isMutual": false
    }
  ]
}
```

---

## 6. Database Schema Changes

### New Tables Required

```sql
-- Store Categories (hierarchical)
CREATE TABLE store_categories (
    id VARCHAR(50) PRIMARY KEY,
    parent_id VARCHAR(50) REFERENCES store_categories(id),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    book_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rankings
CREATE TABLE rankings (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    update_frequency VARCHAR(20), -- hourly, daily, weekly, monthly
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ranking_entries (
    id SERIAL PRIMARY KEY,
    ranking_id VARCHAR(50) REFERENCES rankings(id),
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    rank INTEGER NOT NULL,
    rank_change INTEGER DEFAULT 0,
    stats JSONB, -- search_count_24h, read_count_24h, etc.
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ranking_id, book_id, book_type, date)
);

-- Membership
CREATE TABLE membership_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'CNY',
    duration_value INTEGER NOT NULL,
    duration_unit VARCHAR(20) NOT NULL, -- day, month, year
    is_auto_renew BOOLEAN DEFAULT FALSE,
    apple_product_id VARCHAR(100),
    features JSONB,
    badge VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_memberships (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    plan_id VARCHAR(50) NOT NULL REFERENCES membership_plans(id),
    start_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    is_auto_renew BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    transaction_id VARCHAR(100),
    platform VARCHAR(20), -- ios, android, web
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE redeem_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- gift_card, promo, corporate
    membership_days INTEGER NOT NULL,
    bonus_points INTEGER DEFAULT 0,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE redeem_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    code_id INTEGER NOT NULL REFERENCES redeem_codes(id),
    redeemed_at TIMESTAMP DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE ai_conversations (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES ai_conversations(id),
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_outlines (
    id SERIAL PRIMARY KEY,
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    outline JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, book_type)
);

CREATE TABLE ai_guides (
    id SERIAL PRIMARY KEY,
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    topics JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, book_type)
);

-- TTS Audio
CREATE TABLE tts_voices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    language VARCHAR(20),
    style VARCHAR(50),
    description TEXT,
    preview_url VARCHAR(500),
    provider VARCHAR(50), -- azure, google, elevenlabs
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tts_audio_cache (
    id SERIAL PRIMARY KEY,
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    chapter_id VARCHAR(50) NOT NULL,
    voice_id VARCHAR(50) NOT NULL REFERENCES tts_voices(id),
    audio_url VARCHAR(500) NOT NULL,
    duration INTEGER, -- seconds
    size INTEGER, -- bytes
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(book_id, book_type, chapter_id, voice_id)
);

CREATE TABLE tts_jobs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    book_id VARCHAR(50) NOT NULL,
    book_type VARCHAR(20) NOT NULL,
    chapter_id VARCHAR(50) NOT NULL,
    voice_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'queued', -- queued, processing, completed, failed
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Topics
CREATE TABLE topics (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    hashtag VARCHAR(100) NOT NULL UNIQUE,
    post_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE topic_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

-- Thoughts (Social Posts)
CREATE TABLE thoughts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    book_id VARCHAR(50),
    book_type VARCHAR(20),
    highlight_id VARCHAR(50),
    visibility VARCHAR(20) DEFAULT 'public', -- public, friends, private
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thought_images (
    id VARCHAR(50) PRIMARY KEY,
    thought_id VARCHAR(50) NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE thought_topics (
    thought_id VARCHAR(50) NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    topic_id VARCHAR(50) NOT NULL REFERENCES topics(id),
    PRIMARY KEY (thought_id, topic_id)
);

CREATE TABLE thought_mentions (
    thought_id VARCHAR(50) NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    PRIMARY KEY (thought_id, user_id)
);

CREATE TABLE thought_likes (
    thought_id VARCHAR(50) NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (thought_id, user_id)
);

CREATE TABLE thought_comments (
    id VARCHAR(50) PRIMARY KEY,
    thought_id VARCHAR(50) NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    reply_to_id VARCHAR(50) REFERENCES thought_comments(id),
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Uploaded Images
CREATE TABLE uploaded_images (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    width INTEGER,
    height INTEGER,
    size INTEGER,
    mime_type VARCHAR(50),
    purpose VARCHAR(50), -- thought, avatar, etc.
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
-- Rankings
CREATE INDEX idx_ranking_entries_ranking_date ON ranking_entries(ranking_id, date DESC);
CREATE INDEX idx_ranking_entries_book ON ranking_entries(book_id, book_type);

-- Membership
CREATE INDEX idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_expiry ON user_memberships(expiry_date);
CREATE INDEX idx_redeem_codes_code ON redeem_codes(code);

-- AI
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_book ON ai_conversations(book_id, book_type);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);

-- TTS
CREATE INDEX idx_tts_audio_cache_book ON tts_audio_cache(book_id, book_type);
CREATE INDEX idx_tts_jobs_user ON tts_jobs(user_id);
CREATE INDEX idx_tts_jobs_status ON tts_jobs(status);

-- Social
CREATE INDEX idx_thoughts_user ON thoughts(user_id);
CREATE INDEX idx_thoughts_book ON thoughts(book_id, book_type);
CREATE INDEX idx_thoughts_created ON thoughts(created_at DESC);
CREATE INDEX idx_thought_comments_thought ON thought_comments(thought_id);
CREATE INDEX idx_topics_trending ON topics(is_trending, post_count DESC);
```

---

## 7. Background Jobs Required

| Job | Schedule | Description |
|-----|----------|-------------|
| `updateRankings` | Hourly | Update hot/trending rankings |
| `updateDailyRankings` | Daily 00:00 | Update daily rankings |
| `updateWeeklyRankings` | Weekly Mon 00:00 | Update weekly rankings |
| `computeRecommendations` | Daily 03:00 | Compute personalized recommendations |
| `generateDailyPicks` | Daily 06:00 | Generate daily book picks |
| `cleanupExpiredTTS` | Daily 04:00 | Remove expired TTS audio |
| `processAIJobs` | Every minute | Process queued AI generation jobs |
| `updateTopicStats` | Hourly | Update topic post counts |
| `checkMembershipExpiry` | Daily 00:00 | Check and update expired memberships |
| `sendExpiryReminders` | Daily 09:00 | Send membership expiry reminders |

---

## 8. Third-Party Integrations Required

| Service | Purpose | Endpoints Using |
|---------|---------|-----------------|
| **Apple App Store Server API** | IAP receipt verification | `/membership/subscribe` |
| **Azure Cognitive Services** | TTS (Text-to-Speech) | `/ai/generate-audio` |
| **Claude/OpenAI API** | AI conversations | `/ai/ask-book`, `/ai/outline`, `/ai/guide` |
| **Cloudflare R2** | Image/audio storage | `/upload/images`, TTS audio |
| **Redis** | Job queue, caching | All background jobs |

---

## 9. Rate Limits

| Endpoint | Auth | Limit |
|----------|------|-------|
| `/ai/ask-book` | Free user | 10/day |
| `/ai/ask-book` | Member | Unlimited |
| `/ai/generate-audio` | Member only | 50 chapters/day |
| `/upload/images` | All users | 50 images/day |
| `/social/thoughts` | All users | 20 posts/day |

---

*Document Version: 1.0.0*
*Last Updated: 2025-12-12*
