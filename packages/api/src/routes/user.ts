/**
 * User Profile Routes (requires authentication)
 * Handles user profile management including avatar upload
 */

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import { uploadToR2, isR2Configured } from '../services/storage'
import { randomBytes } from 'crypto'

const app = new OpenAPIHono()

// Apply auth middleware to all routes
app.use('*', requireAuth)

// Schemas
const AvatarUploadResponseSchema = z.object({
  avatarUrl: z.string(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

const UserProfileSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  avatar: z.string().nullable(),
})

// POST /api/user/profile/avatar - Upload user avatar
const uploadAvatarRoute = createRoute({
  method: 'post',
  path: '/profile/avatar',
  tags: ['User Profile'],
  summary: 'Upload user avatar image',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.any().openapi({ type: 'string', format: 'binary' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Avatar uploaded successfully',
      content: {
        'application/json': {
          schema: z.object({ data: AvatarUploadResponseSchema }),
        },
      },
    },
    400: {
      description: 'Invalid image',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Upload failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(uploadAvatarRoute, async (c) => {
  const userId = c.get('userId')

  if (!isR2Configured()) {
    return c.json({
      error: { code: 'STORAGE_ERROR', message: 'Storage service not configured' },
    }, 500)
  }

  try {
    // Parse multipart form data
    const formData = await c.req.formData()
    const imageFile = formData.get('image')

    if (!imageFile || !(imageFile instanceof File)) {
      return c.json({
        error: { code: 'INVALID_IMAGE', message: 'No image file provided' },
      }, 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(imageFile.type)) {
      return c.json({
        error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WebP and GIF images are allowed' },
      }, 400)
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (imageFile.size > maxSize) {
      return c.json({
        error: { code: 'FILE_TOO_LARGE', message: 'Image size must be less than 5MB' },
      }, 400)
    }

    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop() || 'jpg'
    const uniqueId = randomBytes(8).toString('hex')
    const filename = `${userId}_${uniqueId}.${fileExt}`
    const key = `avatars/${filename}`

    // Convert file to buffer
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    await uploadToR2(key, buffer, imageFile.type)

    // Generate avatar URL (using the API endpoint to serve from R2)
    const avatarUrl = `https://bookpost-api-hono.fly.dev/api/avatars/${filename}`

    // Update user's avatar in database
    await db.update(users)
      .set({ avatar: avatarUrl })
      .where(eq(users.id, userId))

    return c.json({
      data: {
        avatarUrl,
      },
    })
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    return c.json({
      error: { code: 'UPLOAD_FAILED', message: 'Failed to upload avatar' },
    }, 500)
  }
})

// GET /api/user/profile - Get current user's profile
const getProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  tags: ['User Profile'],
  summary: 'Get current user profile',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'User profile',
      content: {
        'application/json': {
          schema: z.object({ data: UserProfileSchema }),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(getProfileRoute, async (c) => {
  const userId = c.get('userId')

  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  return c.json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
  })
})

export { app as userRoutes }
