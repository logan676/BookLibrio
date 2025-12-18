package com.bookpost.data.remote.dto

import com.bookpost.domain.model.PopularUnderline
import com.bookpost.domain.model.QuoteCardStyle
import com.bookpost.domain.model.ShareImageResult
import com.bookpost.domain.model.ShareableQuote
import kotlinx.serialization.Serializable

@Serializable
data class PopularUnderlinesResponse(
    val data: List<PopularUnderlineDto>,
    val total: Int = 0
)

@Serializable
data class PopularUnderlineDto(
    val id: Int,
    val text: String,
    val userId: Int,
    val userName: String? = null,
    val userAvatarUrl: String? = null,
    val ebookId: Int? = null,
    val magazineId: Int? = null,
    val chapterTitle: String? = null,
    val likeCount: Int = 0,
    val isLiked: Boolean = false,
    val createdAt: String? = null
) {
    fun toDomain(): PopularUnderline = PopularUnderline(
        id = id,
        text = text,
        userId = userId,
        userName = userName,
        userAvatarUrl = userAvatarUrl,
        ebookId = ebookId,
        magazineId = magazineId,
        chapterTitle = chapterTitle,
        likeCount = likeCount,
        isLiked = isLiked,
        createdAt = createdAt
    )
}

@Serializable
data class ShareQuoteRequest(
    val underlineId: Int,
    val style: String = "CLASSIC",
    val backgroundColor: String? = null,
    val textColor: String? = null
)

@Serializable
data class ShareImageResponse(
    val data: ShareImageDto
)

@Serializable
data class ShareImageDto(
    val imageUrl: String,
    val expiresAt: String? = null
) {
    fun toDomain(): ShareImageResult = ShareImageResult(
        imageUrl = imageUrl,
        expiresAt = expiresAt
    )
}

@Serializable
data class LikeUnderlineResponse(
    val success: Boolean,
    val likeCount: Int = 0
)

// ============== Activity Feed ==============

@Serializable
data class ActivityFeedResponse(
    val data: List<ActivityItemDto>,
    val total: Int = 0
)

@Serializable
data class ActivityItemDto(
    val id: Int,
    val userId: Int,
    val activityType: String,
    val bookId: Int? = null,
    val bookType: String? = null,
    val bookTitle: String? = null,
    val bookCoverUrl: String? = null,
    val badgeId: Int? = null,
    val badgeName: String? = null,
    val badgeIcon: String? = null,
    val content: String? = null,
    val pagesRead: Int? = null,
    val likesCount: Int = 0,
    val isLiked: Boolean = false,
    val createdAt: String? = null,
    val user: ActivityUserDto
)

@Serializable
data class ActivityUserDto(
    val id: Int,
    val username: String,
    val avatarUrl: String? = null
)

@Serializable
data class ActivityLikeResponse(
    val success: Boolean,
    val likesCount: Int = 0
)

// ============== User Profile ==============

@Serializable
data class UserProfileResponse(
    val data: UserProfileDto
)

@Serializable
data class UserProfileDto(
    val id: Int,
    val username: String,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val booksRead: Int = 0,
    val pagesRead: Int = 0,
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val isFollowing: Boolean = false,
    val createdAt: String? = null
)

// ============== Follow ==============

@Serializable
data class FollowActionResponse(
    val success: Boolean,
    val isFollowing: Boolean = false,
    val followersCount: Int = 0
)

@Serializable
data class FollowListResponse(
    val data: List<FollowUserDto>,
    val total: Int = 0
)

@Serializable
data class FollowUserDto(
    val id: Int,
    val username: String,
    val avatarUrl: String? = null,
    val booksRead: Int = 0,
    val currentStreak: Int = 0,
    val isFollowing: Boolean = false
)

// ============== Posts/Thoughts ==============

@Serializable
data class CreatePostRequest(
    val content: String,
    val bookId: Int? = null,
    val bookType: String? = null,
    val visibility: String = "public"
)

@Serializable
data class PostResponse(
    val data: PostDto
)

@Serializable
data class PostDto(
    val id: Int,
    val userId: Int,
    val content: String,
    val bookId: Int? = null,
    val bookType: String? = null,
    val bookTitle: String? = null,
    val visibility: String = "public",
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val isLiked: Boolean = false,
    val createdAt: String? = null,
    val user: ActivityUserDto
)

@Serializable
data class PostsResponse(
    val data: List<PostDto>,
    val total: Int = 0
)

// ============== Trending ==============

@Serializable
data class TrendingTopicsResponse(
    val data: List<TrendingTopicDto>
)

@Serializable
data class TrendingTopicDto(
    val id: Int,
    val title: String,
    val discussionCount: Int = 0,
    val coverUrl: String? = null
)
