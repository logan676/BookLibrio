/**
 * Payment Service
 * Handles payment processing, subscription management, and transaction recording
 *
 * Supports:
 * - Stripe (web/card payments)
 * - Apple In-App Purchase (iOS)
 * - Google Play Billing (Android)
 */

import { db } from '../db/client'
import {
  subscriptionPlans,
  userMemberships,
  userCredits,
  transactions,
  redemptionCodes,
  redemptionCodeUsages,
  giftPurchases,
  ebookPurchases,
  users,
} from '../db/schema'
import { eq, and, sql, gte, lte } from 'drizzle-orm'
import { log } from '../utils/logger'

const logger = { debug: log.d, info: log.i, warn: log.w, error: log.e }

// Types
export type PaymentPlatform = 'stripe' | 'apple' | 'google' | 'wechat' | 'alipay'
export type TransactionType = 'purchase' | 'subscription' | 'credit_topup' | 'credit_spend' | 'refund' | 'gift_sent' | 'gift_received'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'paused'

interface CreateTransactionParams {
  userId: number
  type: TransactionType
  amountInCents: number
  currency?: string
  paymentMethod?: PaymentPlatform
  relatedType?: string
  relatedId?: number
  externalTransactionId?: string
  description?: string
  metadata?: Record<string, any>
}

interface StripeWebhookEvent {
  type: string
  data: {
    object: {
      id: string
      customer?: string
      subscription?: string
      amount?: number
      currency?: string
      metadata?: Record<string, string>
      status?: string
    }
  }
}

interface AppleReceiptValidationResult {
  isValid: boolean
  productId?: string
  transactionId?: string
  expiresDate?: Date
  originalTransactionId?: string
}

class PaymentService {
  // ============================================
  // Subscription Plans
  // ============================================

  /**
   * Get all active subscription plans
   */
  async getPlans() {
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder)
  }

  /**
   * Get a specific plan by ID
   */
  async getPlan(planId: number) {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
    return plan || null
  }

  /**
   * Get plan by Apple product ID
   */
  async getPlanByAppleProductId(productId: string) {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.appleProductId, productId))
    return plan || null
  }

  /**
   * Get plan by Google product ID
   */
  async getPlanByGoogleProductId(productId: string) {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.googleProductId, productId))
    return plan || null
  }

  // ============================================
  // User Membership
  // ============================================

  /**
   * Get user's current membership status
   */
  async getUserMembership(userId: number) {
    const [membership] = await db
      .select()
      .from(userMemberships)
      .where(eq(userMemberships.userId, userId))

    if (!membership) {
      return {
        status: 'inactive' as MembershipStatus,
        isPremium: false,
        plan: null,
        endDate: null,
        isAutoRenewal: false,
      }
    }

    // Check if membership is still valid
    const now = new Date()
    const isExpired = membership.endDate && membership.endDate < now
    const isPremium = membership.status === 'active' && !isExpired

    // Get plan details
    let plan = null
    if (membership.planId) {
      plan = await this.getPlan(membership.planId)
    }

    return {
      status: isExpired ? 'expired' as MembershipStatus : membership.status as MembershipStatus,
      isPremium,
      plan,
      endDate: membership.endDate,
      isAutoRenewal: membership.isAutoRenewal,
      platform: membership.platform,
      daysRemaining: membership.endDate
        ? Math.max(0, Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    }
  }

  /**
   * Activate or extend user membership
   */
  async activateMembership(
    userId: number,
    planId: number,
    platform: PaymentPlatform,
    externalSubscriptionId?: string,
    isAutoRenewal = false
  ) {
    const plan = await this.getPlan(planId)
    if (!plan) throw new Error('Plan not found')

    const now = new Date()

    // Check for existing membership
    const existing = await this.getUserMembership(userId)

    // Calculate new end date (extend if already active)
    let startDate = now
    let endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

    if (existing.isPremium && existing.endDate) {
      // Extend from current end date
      endDate = new Date(existing.endDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
    }

    // Upsert membership
    const [membership] = await db
      .select()
      .from(userMemberships)
      .where(eq(userMemberships.userId, userId))

    if (membership) {
      await db
        .update(userMemberships)
        .set({
          planId,
          status: 'active',
          startDate: existing.isPremium ? membership.startDate : startDate,
          endDate,
          platform,
          externalSubscriptionId,
          isAutoRenewal,
          nextBillingDate: isAutoRenewal ? endDate : null,
          updatedAt: now,
        })
        .where(eq(userMemberships.userId, userId))
    } else {
      await db.insert(userMemberships).values({
        userId,
        planId,
        status: 'active',
        startDate,
        endDate,
        platform,
        externalSubscriptionId,
        isAutoRenewal,
        nextBillingDate: isAutoRenewal ? endDate : null,
      })
    }

    logger.info(`Membership activated for user ${userId}, plan ${plan.name}, expires ${endDate}`)

    return {
      success: true,
      endDate,
      daysAdded: plan.durationDays,
    }
  }

  /**
   * Cancel membership auto-renewal
   */
  async cancelMembershipAutoRenewal(userId: number) {
    await db
      .update(userMemberships)
      .set({
        isAutoRenewal: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userMemberships.userId, userId))

    logger.info(`Membership auto-renewal cancelled for user ${userId}`)
    return { success: true }
  }

  // ============================================
  // Transactions
  // ============================================

  /**
   * Create a transaction record
   */
  async createTransaction(params: CreateTransactionParams) {
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: params.userId,
        type: params.type,
        amountInCents: params.amountInCents,
        currency: params.currency || 'CNY',
        status: 'pending',
        paymentMethod: params.paymentMethod,
        relatedType: params.relatedType,
        relatedId: params.relatedId,
        externalTransactionId: params.externalTransactionId,
        description: params.description,
        metadata: params.metadata || {},
      })
      .returning()

    return transaction
  }

  /**
   * Complete a transaction
   */
  async completeTransaction(transactionId: number) {
    await db
      .update(transactions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(userId: number, limit = 50, offset = 0) {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.createdAt} DESC`)
      .limit(limit)
      .offset(offset)
  }

  // ============================================
  // Stripe Integration
  // ============================================

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: StripeWebhookEvent) {
    const { type, data } = event

    switch (type) {
      case 'checkout.session.completed': {
        // Payment successful - activate subscription or add credits
        const session = data.object
        const userId = parseInt(session.metadata?.userId || '0')
        const planId = parseInt(session.metadata?.planId || '0')

        if (userId && planId) {
          // Create transaction
          const transaction = await this.createTransaction({
            userId,
            type: 'subscription',
            amountInCents: session.amount || 0,
            currency: session.currency,
            paymentMethod: 'stripe',
            relatedType: 'subscription',
            relatedId: planId,
            externalTransactionId: session.id,
          })

          // Activate membership
          await this.activateMembership(userId, planId, 'stripe', session.subscription)
          await this.completeTransaction(transaction.id)
        }
        break
      }

      case 'invoice.paid': {
        // Subscription renewal
        const invoice = data.object
        const subscriptionId = invoice.subscription as string

        // Find membership by subscription ID
        const [membership] = await db
          .select()
          .from(userMemberships)
          .where(eq(userMemberships.externalSubscriptionId, subscriptionId))

        if (membership && membership.planId) {
          const transaction = await this.createTransaction({
            userId: membership.userId,
            type: 'subscription',
            amountInCents: invoice.amount || 0,
            paymentMethod: 'stripe',
            relatedType: 'subscription',
            relatedId: membership.planId,
            externalTransactionId: invoice.id,
            description: 'Subscription renewal',
          })

          await this.activateMembership(
            membership.userId,
            membership.planId,
            'stripe',
            subscriptionId,
            true
          )
          await this.completeTransaction(transaction.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled
        const subscription = data.object
        const [membership] = await db
          .select()
          .from(userMemberships)
          .where(eq(userMemberships.externalSubscriptionId, subscription.id))

        if (membership) {
          await db
            .update(userMemberships)
            .set({
              status: 'cancelled',
              isAutoRenewal: false,
              cancelledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(userMemberships.id, membership.id))

          logger.info(`Subscription cancelled for user ${membership.userId}`)
        }
        break
      }

      case 'charge.refunded': {
        // Handle refund
        const charge = data.object
        const userId = parseInt(charge.metadata?.userId || '0')

        if (userId) {
          await this.createTransaction({
            userId,
            type: 'refund',
            amountInCents: -(charge.amount || 0),
            paymentMethod: 'stripe',
            externalTransactionId: charge.id,
            description: 'Refund processed',
          })
        }
        break
      }
    }

    return { received: true }
  }

  // ============================================
  // Apple In-App Purchase
  // ============================================

  /**
   * Verify Apple receipt and process purchase
   */
  async verifyAppleReceipt(userId: number, receiptData: string): Promise<AppleReceiptValidationResult> {
    const APPLE_VERIFY_URL = process.env.NODE_ENV === 'production'
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt'

    const sharedSecret = process.env.APPLE_SHARED_SECRET
    if (!sharedSecret) {
      logger.error('APPLE_SHARED_SECRET not configured')
      return { isValid: false }
    }

    try {
      const response = await fetch(APPLE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          password: sharedSecret,
          'exclude-old-transactions': true,
        }),
      })

      const result = await response.json()

      if (result.status !== 0) {
        logger.warn(`Apple receipt verification failed: status ${result.status}`)
        return { isValid: false }
      }

      // Get latest receipt info
      const latestReceipt = result.latest_receipt_info?.[0]
      if (!latestReceipt) {
        return { isValid: false }
      }

      const productId = latestReceipt.product_id
      const transactionId = latestReceipt.transaction_id
      const originalTransactionId = latestReceipt.original_transaction_id
      const expiresDateMs = parseInt(latestReceipt.expires_date_ms || '0')
      const expiresDate = expiresDateMs ? new Date(expiresDateMs) : undefined

      // Process the purchase
      const plan = await this.getPlanByAppleProductId(productId)
      if (plan) {
        const transaction = await this.createTransaction({
          userId,
          type: 'subscription',
          amountInCents: plan.priceInCents,
          paymentMethod: 'apple',
          relatedType: 'subscription',
          relatedId: plan.id,
          externalTransactionId: transactionId,
        })

        await this.activateMembership(userId, plan.id, 'apple', originalTransactionId, true)
        await this.completeTransaction(transaction.id)
      }

      return {
        isValid: true,
        productId,
        transactionId,
        expiresDate,
        originalTransactionId,
      }
    } catch (error) {
      logger.error('Apple receipt verification error:', error)
      return { isValid: false }
    }
  }

  /**
   * Handle Apple server-to-server notification
   */
  async handleAppleNotification(notification: any) {
    const notificationType = notification.notification_type
    const unifiedReceipt = notification.unified_receipt
    const latestReceipt = unifiedReceipt?.latest_receipt_info?.[0]

    if (!latestReceipt) return { received: true }

    const originalTransactionId = latestReceipt.original_transaction_id
    const [membership] = await db
      .select()
      .from(userMemberships)
      .where(eq(userMemberships.externalSubscriptionId, originalTransactionId))

    if (!membership) {
      logger.warn(`No membership found for Apple transaction: ${originalTransactionId}`)
      return { received: true }
    }

    switch (notificationType) {
      case 'DID_RENEW':
        // Subscription renewed
        if (membership.planId) {
          await this.activateMembership(
            membership.userId,
            membership.planId,
            'apple',
            originalTransactionId,
            true
          )
        }
        break

      case 'CANCEL':
      case 'DID_FAIL_TO_RENEW':
        // Subscription cancelled or failed to renew
        await db
          .update(userMemberships)
          .set({
            isAutoRenewal: false,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userMemberships.id, membership.id))
        break

      case 'REFUND':
        // Refund processed
        await db
          .update(userMemberships)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(userMemberships.id, membership.id))
        break
    }

    return { received: true }
  }

  // ============================================
  // Credits System
  // ============================================

  /**
   * Get user's credit balance
   */
  async getUserCredits(userId: number) {
    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))

    if (!credits) {
      return {
        balanceInCents: 0,
        bonusCreditsInCents: 0,
        totalAvailable: 0,
      }
    }

    return {
      balanceInCents: credits.balanceInCents || 0,
      bonusCreditsInCents: credits.bonusCreditsInCents || 0,
      totalAvailable: (credits.balanceInCents || 0) + (credits.bonusCreditsInCents || 0),
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId: number, amountInCents: number, isBonus = false) {
    const [existing] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))

    if (existing) {
      if (isBonus) {
        await db
          .update(userCredits)
          .set({
            bonusCreditsInCents: sql`${userCredits.bonusCreditsInCents} + ${amountInCents}`,
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, userId))
      } else {
        await db
          .update(userCredits)
          .set({
            balanceInCents: sql`${userCredits.balanceInCents} + ${amountInCents}`,
            totalPurchasedInCents: sql`${userCredits.totalPurchasedInCents} + ${amountInCents}`,
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, userId))
      }
    } else {
      await db.insert(userCredits).values({
        userId,
        balanceInCents: isBonus ? 0 : amountInCents,
        bonusCreditsInCents: isBonus ? amountInCents : 0,
        totalPurchasedInCents: isBonus ? 0 : amountInCents,
      })
    }

    return this.getUserCredits(userId)
  }

  /**
   * Spend credits (bonus credits first, then regular)
   */
  async spendCredits(userId: number, amountInCents: number): Promise<boolean> {
    const credits = await this.getUserCredits(userId)

    if (credits.totalAvailable < amountInCents) {
      return false // Insufficient credits
    }

    // Spend bonus credits first
    let remainingToSpend = amountInCents
    let bonusToSpend = Math.min(credits.bonusCreditsInCents, remainingToSpend)
    remainingToSpend -= bonusToSpend
    let regularToSpend = remainingToSpend

    await db
      .update(userCredits)
      .set({
        balanceInCents: sql`${userCredits.balanceInCents} - ${regularToSpend}`,
        bonusCreditsInCents: sql`${userCredits.bonusCreditsInCents} - ${bonusToSpend}`,
        totalSpentInCents: sql`${userCredits.totalSpentInCents} + ${amountInCents}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))

    return true
  }

  // ============================================
  // Redemption Codes
  // ============================================

  /**
   * Redeem a code
   */
  async redeemCode(userId: number, code: string) {
    // Find the code
    const [redemptionCode] = await db
      .select()
      .from(redemptionCodes)
      .where(and(
        eq(redemptionCodes.code, code.toUpperCase()),
        eq(redemptionCodes.isActive, true)
      ))

    if (!redemptionCode) {
      return { success: false, error: 'Invalid code' }
    }

    // Check validity period
    const now = new Date()
    if (redemptionCode.validFrom && redemptionCode.validFrom > now) {
      return { success: false, error: 'Code not yet valid' }
    }
    if (redemptionCode.validUntil && redemptionCode.validUntil < now) {
      return { success: false, error: 'Code has expired' }
    }

    // Check usage limits
    if (redemptionCode.maxUses && (redemptionCode.currentUses || 0) >= redemptionCode.maxUses) {
      return { success: false, error: 'Code has reached maximum uses' }
    }

    // Check if user already used this code
    const [existingUsage] = await db
      .select()
      .from(redemptionCodeUsages)
      .where(and(
        eq(redemptionCodeUsages.codeId, redemptionCode.id),
        eq(redemptionCodeUsages.userId, userId)
      ))

    if (existingUsage) {
      return { success: false, error: 'You have already used this code' }
    }

    // Process based on code type
    let resultType = ''
    let resultValue = ''

    switch (redemptionCode.codeType) {
      case 'membership':
        if (redemptionCode.planId) {
          await this.activateMembership(userId, redemptionCode.planId, 'stripe')
          resultType = 'membership_extended'
          resultValue = `${redemptionCode.membershipDays} days added`
        }
        break

      case 'credits':
        if (redemptionCode.creditAmountInCents) {
          await this.addCredits(userId, redemptionCode.creditAmountInCents, true)
          resultType = 'credits_added'
          resultValue = `${redemptionCode.creditAmountInCents / 100} credits added`
        }
        break

      case 'ebook':
        if (redemptionCode.ebookId) {
          await db.insert(ebookPurchases).values({
            userId,
            ebookId: redemptionCode.ebookId,
            priceInCents: 0,
            accessType: 'permanent',
          })
          resultType = 'ebook_unlocked'
          resultValue = `Ebook #${redemptionCode.ebookId} unlocked`
        }
        break
    }

    // Record usage
    await db.insert(redemptionCodeUsages).values({
      codeId: redemptionCode.id,
      userId,
      resultType,
      resultValue,
    })

    // Update usage count
    await db
      .update(redemptionCodes)
      .set({ currentUses: sql`${redemptionCodes.currentUses} + 1` })
      .where(eq(redemptionCodes.id, redemptionCode.id))

    logger.info(`Code ${code} redeemed by user ${userId}: ${resultType}`)

    return {
      success: true,
      resultType,
      resultValue,
    }
  }

  // ============================================
  // Ebook Purchases
  // ============================================

  /**
   * Check if user has access to an ebook
   */
  async hasEbookAccess(userId: number, ebookId: number): Promise<boolean> {
    // Check membership first
    const membership = await this.getUserMembership(userId)
    if (membership.isPremium) {
      return true
    }

    // Check individual purchase
    const [purchase] = await db
      .select()
      .from(ebookPurchases)
      .where(and(
        eq(ebookPurchases.userId, userId),
        eq(ebookPurchases.ebookId, ebookId)
      ))

    if (!purchase) {
      return false
    }

    // Check if rental has expired
    if (purchase.accessType === 'rental' && purchase.expiresAt) {
      return purchase.expiresAt > new Date()
    }

    return true
  }

  /**
   * Purchase an individual ebook
   */
  async purchaseEbook(userId: number, ebookId: number, priceInCents: number) {
    // Try to spend credits
    const success = await this.spendCredits(userId, priceInCents)
    if (!success) {
      return { success: false, error: 'Insufficient credits' }
    }

    // Record purchase
    await db.insert(ebookPurchases).values({
      userId,
      ebookId,
      priceInCents,
      accessType: 'permanent',
    })

    // Record transaction
    await this.createTransaction({
      userId,
      type: 'credit_spend',
      amountInCents: priceInCents,
      relatedType: 'ebook',
      relatedId: ebookId,
      description: `Purchased ebook #${ebookId}`,
    })

    logger.info(`User ${userId} purchased ebook ${ebookId} for ${priceInCents} cents`)

    return { success: true }
  }

  // ============================================
  // Initialize Default Plans
  // ============================================

  /**
   * Initialize default subscription plans
   */
  async initializeDefaultPlans() {
    const existingPlans = await db.select().from(subscriptionPlans)
    if (existingPlans.length > 0) {
      logger.info('Subscription plans already initialized')
      return
    }

    const defaultPlans = [
      {
        name: 'monthly_auto',
        displayName: '连续包月',
        description: '自动续费，随时取消',
        priceInCents: 1900,
        originalPriceInCents: 3000,
        durationDays: 30,
        features: ['unlimited_ebooks', 'unlimited_audiobooks', 'offline_download', 'ai_features'],
        isAutoRenewal: true,
        badge: 'first_month_discount',
        sortOrder: 1,
      },
      {
        name: 'monthly',
        displayName: '月卡',
        description: '单月购买',
        priceInCents: 3000,
        durationDays: 30,
        features: ['unlimited_ebooks', 'unlimited_audiobooks', 'offline_download', 'ai_features'],
        isAutoRenewal: false,
        sortOrder: 2,
      },
      {
        name: 'quarterly',
        displayName: '季卡',
        description: '三个月会员',
        priceInCents: 6800,
        originalPriceInCents: 9000,
        durationDays: 90,
        features: ['unlimited_ebooks', 'unlimited_audiobooks', 'offline_download', 'ai_features'],
        isAutoRenewal: false,
        sortOrder: 3,
      },
      {
        name: 'annual',
        displayName: '年卡',
        description: '最划算，约¥19/月',
        priceInCents: 22800,
        originalPriceInCents: 36000,
        durationDays: 365,
        features: ['unlimited_ebooks', 'unlimited_audiobooks', 'offline_download', 'ai_features', 'priority_support'],
        isAutoRenewal: false,
        badge: 'best_value',
        sortOrder: 4,
      },
    ]

    for (const plan of defaultPlans) {
      await db.insert(subscriptionPlans).values(plan)
    }

    logger.info(`Initialized ${defaultPlans.length} subscription plans`)
  }
}

export const paymentService = new PaymentService()
