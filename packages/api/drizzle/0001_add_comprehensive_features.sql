-- Migration: Add comprehensive features for BookPost
-- This migration adds tables and fields for:
-- 1. Membership & Payment System
-- 2. TTS / AI Narration
-- 3. AI Chat & Dictionary
-- 4. Social Features (Thoughts, Topics)
-- 5. Store & Discovery (Rankings, Recommendations, Curated Lists)
-- 6. Celebrity Recommendations
-- 7. Popular Highlights
-- 8. User Settings & Notifications
-- 9. Updates to existing tables

-- ============================================
-- Updates to Existing Tables
-- ============================================

-- Update users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notes_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "following_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "follower_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "likes_received_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "thoughts_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "book_lists_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reviews_count" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "featured_badge_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Update ebook_categories table
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "parent_id" integer;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "icon_url" text;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "cover_url" text;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "theme_color" text;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "ebook_count" integer DEFAULT 0;
ALTER TABLE "ebook_categories" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS "idx_ebook_categories_parent" ON "ebook_categories" ("parent_id");

-- Update ebooks table
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "payment_type" text DEFAULT 'free';
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "price_in_cents" integer;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "is_web_novel" boolean DEFAULT false;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "is_film_adaptation" boolean DEFAULT false;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "has_audiobook" boolean DEFAULT false;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "search_count" integer DEFAULT 0;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "trending_score" decimal(10, 4) DEFAULT 0;
ALTER TABLE "ebooks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
CREATE INDEX IF NOT EXISTS "idx_ebooks_payment_type" ON "ebooks" ("payment_type");
CREATE INDEX IF NOT EXISTS "idx_ebooks_trending" ON "ebooks" ("trending_score");

-- Update ebook_underlines table
ALTER TABLE "ebook_underlines" ADD COLUMN IF NOT EXISTS "highlight_style" text DEFAULT 'solid';
ALTER TABLE "ebook_underlines" ADD COLUMN IF NOT EXISTS "highlight_color" text DEFAULT 'yellow';
ALTER TABLE "ebook_underlines" ADD COLUMN IF NOT EXISTS "text_hash" text;
CREATE INDEX IF NOT EXISTS "idx_ebook_underlines_user_ebook" ON "ebook_underlines" ("user_id", "ebook_id");
CREATE INDEX IF NOT EXISTS "idx_ebook_underlines_text_hash" ON "ebook_underlines" ("text_hash");

-- Update ebook_ideas table
ALTER TABLE "ebook_ideas" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public';
ALTER TABLE "ebook_ideas" ADD COLUMN IF NOT EXISTS "likes_count" integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS "idx_ebook_ideas_user" ON "ebook_ideas" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ebook_ideas_underline" ON "ebook_ideas" ("underline_id");

-- ============================================
-- Membership & Payment System Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text,
  "price_in_cents" integer NOT NULL,
  "currency" text DEFAULT 'CNY',
  "original_price_in_cents" integer,
  "duration_days" integer NOT NULL,
  "features" jsonb DEFAULT '[]',
  "is_auto_renewal" boolean DEFAULT false,
  "apple_product_id" text,
  "google_product_id" text,
  "stripe_product_id" text,
  "stripe_price_id" text,
  "badge" text,
  "sort_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_memberships" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" integer REFERENCES "subscription_plans"("id"),
  "status" text NOT NULL DEFAULT 'inactive',
  "start_date" timestamp,
  "end_date" timestamp,
  "cancelled_at" timestamp,
  "is_auto_renewal" boolean DEFAULT false,
  "next_billing_date" timestamp,
  "platform" text,
  "external_subscription_id" text,
  "is_trial_used" boolean DEFAULT false,
  "trial_end_date" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_user_memberships_user" ON "user_memberships" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_memberships_status" ON "user_memberships" ("status");

CREATE TABLE IF NOT EXISTS "user_credits" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "balance_in_cents" integer DEFAULT 0,
  "bonus_credits_in_cents" integer DEFAULT 0,
  "total_purchased_in_cents" integer DEFAULT 0,
  "total_spent_in_cents" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "amount_in_cents" integer NOT NULL,
  "currency" text DEFAULT 'CNY',
  "status" text NOT NULL DEFAULT 'pending',
  "related_type" text,
  "related_id" integer,
  "payment_method" text,
  "external_transaction_id" text,
  "external_receipt_data" text,
  "description" text,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_transactions_user" ON "transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON "transactions" ("type");
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON "transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_transactions_created" ON "transactions" ("created_at");

CREATE TABLE IF NOT EXISTS "redemption_codes" (
  "id" serial PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "code_type" text NOT NULL,
  "plan_id" integer REFERENCES "subscription_plans"("id"),
  "membership_days" integer,
  "credit_amount_in_cents" integer,
  "ebook_id" integer REFERENCES "ebooks"("id"),
  "max_uses" integer DEFAULT 1,
  "current_uses" integer DEFAULT 0,
  "valid_from" timestamp DEFAULT now(),
  "valid_until" timestamp,
  "is_active" boolean DEFAULT true,
  "source" text,
  "campaign_id" text,
  "created_at" timestamp DEFAULT now(),
  "created_by" integer REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "idx_redemption_codes_code" ON "redemption_codes" ("code");

CREATE TABLE IF NOT EXISTS "redemption_code_usages" (
  "id" serial PRIMARY KEY,
  "code_id" integer NOT NULL REFERENCES "redemption_codes"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "used_at" timestamp DEFAULT now(),
  "result_type" text,
  "result_value" text,
  UNIQUE ("code_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "gift_purchases" (
  "id" serial PRIMARY KEY,
  "sender_id" integer NOT NULL REFERENCES "users"("id"),
  "recipient_id" integer REFERENCES "users"("id"),
  "recipient_email" text,
  "gift_type" text NOT NULL,
  "plan_id" integer REFERENCES "subscription_plans"("id"),
  "ebook_id" integer REFERENCES "ebooks"("id"),
  "credit_amount_in_cents" integer,
  "gift_code" text UNIQUE,
  "message" text,
  "status" text NOT NULL DEFAULT 'pending',
  "transaction_id" integer REFERENCES "transactions"("id"),
  "created_at" timestamp DEFAULT now(),
  "claimed_at" timestamp,
  "expires_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_gift_purchases_sender" ON "gift_purchases" ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_gift_purchases_recipient" ON "gift_purchases" ("recipient_id");
CREATE INDEX IF NOT EXISTS "idx_gift_purchases_code" ON "gift_purchases" ("gift_code");

CREATE TABLE IF NOT EXISTS "ebook_purchases" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ebook_id" integer NOT NULL REFERENCES "ebooks"("id"),
  "price_in_cents" integer NOT NULL,
  "currency" text DEFAULT 'CNY',
  "transaction_id" integer REFERENCES "transactions"("id"),
  "access_type" text DEFAULT 'permanent',
  "expires_at" timestamp,
  "purchased_at" timestamp DEFAULT now(),
  UNIQUE ("user_id", "ebook_id")
);
CREATE INDEX IF NOT EXISTS "idx_ebook_purchases_user" ON "ebook_purchases" ("user_id");

-- ============================================
-- TTS / AI Narration Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "tts_voices" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "provider" text NOT NULL,
  "provider_voice_id" text NOT NULL,
  "language" text NOT NULL DEFAULT 'zh-CN',
  "gender" text,
  "age" text,
  "style" text,
  "sample_audio_url" text,
  "is_premium" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_voice_preferences" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "default_voice_id" integer REFERENCES "tts_voices"("id"),
  "default_speed" decimal(3, 2) DEFAULT 1.00,
  "default_pitch" decimal(3, 2) DEFAULT 1.00,
  "default_sleep_timer" integer,
  "book_voice_preferences" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tts_audio_cache" (
  "id" serial PRIMARY KEY,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "chapter_index" integer NOT NULL,
  "voice_id" integer NOT NULL REFERENCES "tts_voices"("id"),
  "s3_key" text NOT NULL,
  "duration_seconds" integer,
  "file_size_bytes" integer,
  "text_length" integer,
  "generation_cost_usd" decimal(10, 6),
  "generated_at" timestamp DEFAULT now(),
  "last_accessed_at" timestamp,
  "expires_at" timestamp,
  UNIQUE ("book_type", "book_id", "chapter_index", "voice_id")
);
CREATE INDEX IF NOT EXISTS "idx_tts_cache_book" ON "tts_audio_cache" ("book_type", "book_id");

-- ============================================
-- AI Chat & Dictionary Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "book_type" text,
  "book_id" integer,
  "book_title" text,
  "title" text,
  "message_count" integer DEFAULT 0,
  "total_input_tokens" integer DEFAULT 0,
  "total_output_tokens" integer DEFAULT 0,
  "total_cost_usd" decimal(10, 6) DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "last_message_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_ai_chat_sessions_user" ON "ai_chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_chat_sessions_book" ON "ai_chat_sessions" ("book_type", "book_id");

CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
  "id" serial PRIMARY KEY,
  "session_id" integer NOT NULL REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "model_used" text,
  "input_tokens" integer,
  "output_tokens" integer,
  "quick_tag" text,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_ai_chat_messages_session" ON "ai_chat_messages" ("session_id");

CREATE TABLE IF NOT EXISTS "dictionary_lookups" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "word" text NOT NULL,
  "language" text DEFAULT 'zh',
  "book_type" text,
  "book_id" integer,
  "context_sentence" text,
  "dictionary_result" jsonb,
  "dictionary_source" text,
  "ai_interpretation" text,
  "ai_keywords" jsonb DEFAULT '[]',
  "related_book_ids" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_dictionary_lookups_word" ON "dictionary_lookups" ("word");
CREATE INDEX IF NOT EXISTS "idx_dictionary_lookups_user" ON "dictionary_lookups" ("user_id");

-- ============================================
-- Social Features - Thoughts/Posts Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "topics" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "description" text,
  "category" text,
  "post_count" integer DEFAULT 0,
  "follower_count" integer DEFAULT 0,
  "cover_url" text,
  "is_hot" boolean DEFAULT false,
  "is_new" boolean DEFAULT false,
  "sort_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "thoughts" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "images" jsonb DEFAULT '[]',
  "book_type" text,
  "book_id" integer,
  "book_title" text,
  "underline_id" integer,
  "underline_text" text,
  "visibility" text NOT NULL DEFAULT 'public',
  "likes_count" integer DEFAULT 0,
  "comments_count" integer DEFAULT 0,
  "shares_count" integer DEFAULT 0,
  "is_hidden" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_thoughts_user" ON "thoughts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_thoughts_created" ON "thoughts" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_thoughts_book" ON "thoughts" ("book_type", "book_id");
CREATE INDEX IF NOT EXISTS "idx_thoughts_visibility" ON "thoughts" ("visibility");

CREATE TABLE IF NOT EXISTS "thought_topics" (
  "id" serial PRIMARY KEY,
  "thought_id" integer NOT NULL REFERENCES "thoughts"("id") ON DELETE CASCADE,
  "topic_id" integer NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  UNIQUE ("thought_id", "topic_id")
);
CREATE INDEX IF NOT EXISTS "idx_thought_topics_topic" ON "thought_topics" ("topic_id");

CREATE TABLE IF NOT EXISTS "thought_likes" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "thought_id" integer NOT NULL REFERENCES "thoughts"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  UNIQUE ("user_id", "thought_id")
);
CREATE INDEX IF NOT EXISTS "idx_thought_likes_thought" ON "thought_likes" ("thought_id");

CREATE TABLE IF NOT EXISTS "thought_comments" (
  "id" serial PRIMARY KEY,
  "thought_id" integer NOT NULL REFERENCES "thoughts"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "parent_comment_id" integer,
  "reply_to_user_id" integer REFERENCES "users"("id"),
  "likes_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_thought_comments_thought" ON "thought_comments" ("thought_id");
CREATE INDEX IF NOT EXISTS "idx_thought_comments_user" ON "thought_comments" ("user_id");

CREATE TABLE IF NOT EXISTS "user_mentions" (
  "id" serial PRIMARY KEY,
  "content_type" text NOT NULL,
  "content_id" integer NOT NULL,
  "mentioned_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mentioner_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_user_mentions_mentioned" ON "user_mentions" ("mentioned_user_id");
CREATE INDEX IF NOT EXISTS "idx_user_mentions_content" ON "user_mentions" ("content_type", "content_id");

CREATE TABLE IF NOT EXISTS "topic_followers" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "topic_id" integer NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  UNIQUE ("user_id", "topic_id")
);
CREATE INDEX IF NOT EXISTS "idx_topic_followers_topic" ON "topic_followers" ("topic_id");

-- ============================================
-- Store & Discovery - Rankings Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "rankings" (
  "id" serial PRIMARY KEY,
  "ranking_type" text NOT NULL,
  "period_type" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "display_name" text NOT NULL,
  "theme_color" text,
  "description" text,
  "is_active" boolean DEFAULT true,
  "computed_at" timestamp DEFAULT now(),
  "expires_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_rankings_type" ON "rankings" ("ranking_type");
CREATE INDEX IF NOT EXISTS "idx_rankings_period" ON "rankings" ("period_start", "period_end");

CREATE TABLE IF NOT EXISTS "ranking_items" (
  "id" serial PRIMARY KEY,
  "ranking_id" integer NOT NULL REFERENCES "rankings"("id") ON DELETE CASCADE,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "rank" integer NOT NULL,
  "previous_rank" integer,
  "rank_change" integer DEFAULT 0,
  "score" decimal(15, 4),
  "book_title" text,
  "book_author" text,
  "book_cover_url" text,
  "reader_count" integer,
  "rating" decimal(3, 2),
  "evaluation_tag" text
);
CREATE INDEX IF NOT EXISTS "idx_ranking_items_ranking" ON "ranking_items" ("ranking_id");
CREATE INDEX IF NOT EXISTS "idx_ranking_items_rank" ON "ranking_items" ("ranking_id", "rank");
CREATE INDEX IF NOT EXISTS "idx_ranking_items_book" ON "ranking_items" ("book_type", "book_id");

-- ============================================
-- Store & Discovery - Recommendations Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "user_recommendations" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "recommendation_type" text NOT NULL,
  "reason" text,
  "reason_type" text,
  "source_book_type" text,
  "source_book_id" integer,
  "relevance_score" decimal(5, 4),
  "position" integer DEFAULT 0,
  "is_viewed" boolean DEFAULT false,
  "is_clicked" boolean DEFAULT false,
  "is_dismissed" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp
);
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_user" ON "user_recommendations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_user_type" ON "user_recommendations" ("user_id", "recommendation_type");
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_book" ON "user_recommendations" ("book_type", "book_id");

-- ============================================
-- Store & Discovery - Curated Lists Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "curated_lists" (
  "id" serial PRIMARY KEY,
  "list_type" text NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "description" text,
  "cover_url" text,
  "theme_color" text,
  "source_name" text,
  "source_url" text,
  "curator_id" integer REFERENCES "users"("id"),
  "publish_date" date,
  "book_count" integer DEFAULT 0,
  "view_count" integer DEFAULT 0,
  "save_count" integer DEFAULT 0,
  "sort_order" integer DEFAULT 0,
  "is_featured" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_curated_lists_type" ON "curated_lists" ("list_type");
CREATE INDEX IF NOT EXISTS "idx_curated_lists_publish_date" ON "curated_lists" ("publish_date");
CREATE INDEX IF NOT EXISTS "idx_curated_lists_featured" ON "curated_lists" ("is_featured", "sort_order");

CREATE TABLE IF NOT EXISTS "curated_list_items" (
  "id" serial PRIMARY KEY,
  "list_id" integer NOT NULL REFERENCES "curated_lists"("id") ON DELETE CASCADE,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "position" integer NOT NULL,
  "editor_note" text,
  "added_at" timestamp DEFAULT now(),
  UNIQUE ("list_id", "book_type", "book_id")
);
CREATE INDEX IF NOT EXISTS "idx_curated_list_items_position" ON "curated_list_items" ("list_id", "position");

-- ============================================
-- Celebrity/Expert Recommendations Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "celebrities" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "title" text,
  "description" text,
  "avatar_url" text,
  "weibo_url" text,
  "wechat_id" text,
  "website_url" text,
  "recommendation_count" integer DEFAULT 0,
  "is_verified" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "celebrity_recommendations" (
  "id" serial PRIMARY KEY,
  "celebrity_id" integer NOT NULL REFERENCES "celebrities"("id") ON DELETE CASCADE,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "quote" text,
  "perspective" text,
  "source" text,
  "source_url" text,
  "source_date" date,
  "is_featured" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  UNIQUE ("celebrity_id", "book_type", "book_id")
);
CREATE INDEX IF NOT EXISTS "idx_celebrity_recs_celebrity" ON "celebrity_recommendations" ("celebrity_id");
CREATE INDEX IF NOT EXISTS "idx_celebrity_recs_book" ON "celebrity_recommendations" ("book_type", "book_id");

-- ============================================
-- Popular Highlights Table
-- ============================================

CREATE TABLE IF NOT EXISTS "popular_highlights" (
  "id" serial PRIMARY KEY,
  "book_type" text NOT NULL,
  "book_id" integer NOT NULL,
  "text" text NOT NULL,
  "text_hash" text NOT NULL,
  "chapter_index" integer,
  "position" text,
  "highlighter_count" integer DEFAULT 1,
  "last_highlighter_id" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE ("book_type", "book_id", "text_hash")
);
CREATE INDEX IF NOT EXISTS "idx_popular_highlights_book" ON "popular_highlights" ("book_type", "book_id");
CREATE INDEX IF NOT EXISTS "idx_popular_highlights_count" ON "popular_highlights" ("highlighter_count");

-- ============================================
-- User Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  -- Reading settings
  "keep_screen_on" boolean DEFAULT true,
  "allow_landscape" boolean DEFAULT false,
  "hide_others_thoughts" boolean DEFAULT false,
  "show_time_battery" boolean DEFAULT true,
  "first_line_indent" boolean DEFAULT true,
  "left_tap_next_page" boolean DEFAULT false,
  "filter_web_novels" boolean DEFAULT false,
  "auto_download_on_add" boolean DEFAULT false,
  "page_turn_style" text DEFAULT 'slide',
  "dark_mode" text DEFAULT 'system',
  -- Privacy settings
  "profile_visibility" text DEFAULT 'everyone',
  "show_bookshelf" boolean DEFAULT true,
  "show_favorite_books" boolean DEFAULT true,
  "show_book_lists" boolean DEFAULT true,
  "show_badges" boolean DEFAULT true,
  "show_thoughts" boolean DEFAULT true,
  -- Notification settings
  "notify_friend_activity" boolean DEFAULT true,
  "notify_likes" boolean DEFAULT true,
  "notify_comments" boolean DEFAULT true,
  "notify_mentions" boolean DEFAULT true,
  "notify_new_followers" boolean DEFAULT true,
  -- Student verification
  "is_student_verified" boolean DEFAULT false,
  "student_verified_at" timestamp,
  "student_verification_expiry" timestamp,
  -- Youth mode
  "youth_mode_enabled" boolean DEFAULT false,
  -- Timestamps
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "actor_id" integer REFERENCES "users"("id"),
  "target_type" text,
  "target_id" integer,
  "metadata" jsonb DEFAULT '{}',
  "action_url" text,
  "is_read" boolean DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("created_at");
