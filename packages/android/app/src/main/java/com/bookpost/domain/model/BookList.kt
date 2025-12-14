package com.bookpost.domain.model

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Spa
import androidx.compose.ui.graphics.vector.ImageVector
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Book List (豆列) Models
 * Data models for user-curated book lists and related operations
 */

// MARK: - Book List
@Serializable
data class BookList(
    val id: Int,
    val title: String,
    val description: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("creator_id") val creatorId: Int,
    val creator: BookListCreator? = null,
    @SerialName("is_public") val isPublic: Boolean,
    @SerialName("item_count") val itemCount: Int,
    @SerialName("follower_count") val followerCount: Int,
    @SerialName("is_following") val isFollowing: Boolean? = null,
    val category: String? = null,
    val tags: List<String>? = null,
    val items: List<BookListItem>? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val previewBooks: List<BookListItem>
        get() = items?.take(4) ?: emptyList()

    val formattedFollowerCount: String
        get() = when {
            followerCount >= 10000 -> String.format("%.1fw", followerCount / 10000.0)
            followerCount >= 1000 -> String.format("%.1fk", followerCount / 1000.0)
            else -> "$followerCount"
        }
}

// MARK: - Book List Creator
@Serializable
data class BookListCreator(
    val id: Int,
    val username: String,
    val avatar: String? = null
)

// MARK: - Book List Item
@Serializable
data class BookListItem(
    val id: Int,
    @SerialName("list_id") val listId: Int,
    @SerialName("book_id") val bookId: Int,
    @SerialName("book_type") val bookType: String,
    val position: Int,
    val note: String? = null,
    val book: BookListBook? = null,
    @SerialName("added_at") val addedAt: String? = null
)

// MARK: - Book Info in List
@Serializable
data class BookListBook(
    val id: Int,
    val title: String,
    val author: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    val rating: Double? = null,
    @SerialName("rating_count") val ratingCount: Int? = null,
    val description: String? = null
) {
    val formattedRating: String?
        get() = rating?.let { String.format("%.1f", it) }
}

// MARK: - List Categories
enum class BookListCategory(val value: String) {
    ALL("all"),
    LITERATURE("literature"),
    HISTORY("history"),
    SCIENCE("science"),
    PHILOSOPHY("philosophy"),
    ART("art"),
    BUSINESS("business"),
    TECHNOLOGY("technology"),
    LIFESTYLE("lifestyle"),
    OTHER("other");

    val displayName: String
        get() = when (this) {
            ALL -> "全部"
            LITERATURE -> "文学"
            HISTORY -> "历史"
            SCIENCE -> "科学"
            PHILOSOPHY -> "哲学"
            ART -> "艺术"
            BUSINESS -> "商业"
            TECHNOLOGY -> "技术"
            LIFESTYLE -> "生活"
            OTHER -> "其他"
        }

    val icon: ImageVector
        get() = when (this) {
            ALL -> Icons.Default.Apps
            LITERATURE -> Icons.Default.AutoStories
            HISTORY -> Icons.Default.History
            SCIENCE -> Icons.Default.Science
            PHILOSOPHY -> Icons.Default.Lightbulb
            ART -> Icons.Default.Brush
            BUSINESS -> Icons.Default.Business
            TECHNOLOGY -> Icons.Default.Code
            LIFESTYLE -> Icons.Default.Spa
            OTHER -> Icons.Default.MoreHoriz
        }
}

// MARK: - Sort Options
enum class BookListSortOption(val value: String) {
    POPULAR("popular"),
    RECENT("recent"),
    MOST_BOOKS("most_books"),
    MOST_FOLLOWERS("most_followers");

    val displayName: String
        get() = when (this) {
            POPULAR -> "热门"
            RECENT -> "最新"
            MOST_BOOKS -> "书籍最多"
            MOST_FOLLOWERS -> "关注最多"
        }
}

// MARK: - API Responses
@Serializable
data class BookListsResponse(
    val data: List<BookList>,
    val total: Int? = null,
    @SerialName("has_more") val hasMore: Boolean? = null
)

@Serializable
data class BookListResponse(
    val data: BookList
)

@Serializable
data class BookListItemsResponse(
    val data: List<BookListItem>,
    val total: Int? = null,
    @SerialName("has_more") val hasMore: Boolean? = null
)

// MARK: - API Requests
@Serializable
data class CreateBookListRequest(
    val title: String,
    val description: String? = null,
    @SerialName("is_public") val isPublic: Boolean,
    val category: String? = null,
    val tags: List<String>? = null
)

@Serializable
data class UpdateBookListRequest(
    val title: String? = null,
    val description: String? = null,
    @SerialName("is_public") val isPublic: Boolean? = null,
    val category: String? = null,
    val tags: List<String>? = null
)

@Serializable
data class AddBookToListRequest(
    @SerialName("book_id") val bookId: Int,
    @SerialName("book_type") val bookType: String,
    val note: String? = null,
    val position: Int? = null
)

@Serializable
data class UpdateListItemRequest(
    val note: String? = null,
    val position: Int? = null
)

// MARK: - Action Responses
@Serializable
data class BookListFollowResponse(
    val data: BookListFollowResult
)

@Serializable
data class BookListFollowResult(
    val success: Boolean,
    @SerialName("is_following") val isFollowing: Boolean,
    @SerialName("follower_count") val followerCount: Int
)

@Serializable
data class AddToListResponse(
    val data: BookListItem
)

@Serializable
data class BookListActionResponse(
    val success: Boolean
)

// MARK: - User's Lists Summary
@Serializable
data class UserBookListsSummary(
    val created: List<BookList>,
    val following: List<BookList>,
    @SerialName("created_count") val createdCount: Int,
    @SerialName("following_count") val followingCount: Int
)

@Serializable
data class UserBookListsResponse(
    val data: UserBookListsSummary
)
