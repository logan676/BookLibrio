package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.ActivityFeedResponse
import com.bookpost.data.remote.dto.ActivityLikeResponse
import com.bookpost.data.remote.dto.CreatePostRequest
import com.bookpost.data.remote.dto.FollowActionResponse
import com.bookpost.data.remote.dto.FollowListResponse
import com.bookpost.data.remote.dto.LikeUnderlineResponse
import com.bookpost.data.remote.dto.PopularUnderlinesResponse
import com.bookpost.data.remote.dto.PostResponse
import com.bookpost.data.remote.dto.PostsResponse
import com.bookpost.data.remote.dto.ShareImageResponse
import com.bookpost.data.remote.dto.ShareQuoteRequest
import com.bookpost.data.remote.dto.TrendingTopicsResponse
import com.bookpost.data.remote.dto.UserProfileResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface SocialApi {

    // ============== Popular Underlines ==============

    /**
     * Get popular underlines/highlights for an ebook
     */
    @GET("/api/ebooks/{id}/popular-underlines")
    suspend fun getPopularUnderlines(
        @Path("id") ebookId: Int,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<PopularUnderlinesResponse>

    /**
     * Get popular underlines/highlights for a magazine
     */
    @GET("/api/magazines/{id}/popular-underlines")
    suspend fun getMagazinePopularUnderlines(
        @Path("id") magazineId: Int,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<PopularUnderlinesResponse>

    /**
     * Like an underline/highlight
     */
    @POST("/api/underlines/{id}/like")
    suspend fun likeUnderline(@Path("id") underlineId: Int): Response<LikeUnderlineResponse>

    /**
     * Unlike an underline/highlight
     */
    @DELETE("/api/underlines/{id}/like")
    suspend fun unlikeUnderline(@Path("id") underlineId: Int): Response<LikeUnderlineResponse>

    /**
     * Generate a shareable image for a quote
     */
    @POST("/api/underlines/{id}/share")
    suspend fun generateShareImage(
        @Path("id") underlineId: Int,
        @Body request: ShareQuoteRequest
    ): Response<ShareImageResponse>

    // ============== Activity Feed ==============

    /**
     * Get activity feed
     * @param type "all", "following", "global"
     */
    @GET("/api/social/feed")
    suspend fun getActivityFeed(
        @Query("type") type: String = "all",
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<ActivityFeedResponse>

    /**
     * Get activities for a specific user
     */
    @GET("/api/social/users/{userId}/activities")
    suspend fun getUserActivities(
        @Path("userId") userId: Int,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<ActivityFeedResponse>

    /**
     * Like an activity
     */
    @POST("/api/social/activities/{activityId}/like")
    suspend fun likeActivity(@Path("activityId") activityId: Int): Response<ActivityLikeResponse>

    /**
     * Unlike an activity
     */
    @DELETE("/api/social/activities/{activityId}/like")
    suspend fun unlikeActivity(@Path("activityId") activityId: Int): Response<ActivityLikeResponse>

    // ============== User Profile ==============

    /**
     * Get user profile
     */
    @GET("/api/social/users/{userId}/profile")
    suspend fun getUserProfile(@Path("userId") userId: Int): Response<UserProfileResponse>

    // ============== Follow ==============

    /**
     * Follow a user
     */
    @POST("/api/social/users/{userId}/follow")
    suspend fun followUser(@Path("userId") userId: Int): Response<FollowActionResponse>

    /**
     * Unfollow a user
     */
    @DELETE("/api/social/users/{userId}/follow")
    suspend fun unfollowUser(@Path("userId") userId: Int): Response<FollowActionResponse>

    /**
     * Get user's followers
     */
    @GET("/api/social/users/{userId}/followers")
    suspend fun getFollowers(
        @Path("userId") userId: Int,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<FollowListResponse>

    /**
     * Get users that the user is following
     */
    @GET("/api/social/users/{userId}/following")
    suspend fun getFollowing(
        @Path("userId") userId: Int,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<FollowListResponse>

    // ============== Posts ==============

    /**
     * Create a new post/thought
     */
    @POST("/api/social/posts")
    suspend fun createPost(@Body request: CreatePostRequest): Response<PostResponse>

    /**
     * Get posts/thoughts feed
     */
    @GET("/api/social/posts")
    suspend fun getPosts(
        @Query("type") type: String = "all",
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<PostsResponse>

    /**
     * Get a user's posts
     */
    @GET("/api/social/users/{userId}/posts")
    suspend fun getUserPosts(
        @Path("userId") userId: Int,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<PostsResponse>

    /**
     * Like a post
     */
    @POST("/api/social/posts/{postId}/like")
    suspend fun likePost(@Path("postId") postId: Int): Response<ActivityLikeResponse>

    /**
     * Unlike a post
     */
    @DELETE("/api/social/posts/{postId}/like")
    suspend fun unlikePost(@Path("postId") postId: Int): Response<ActivityLikeResponse>

    /**
     * Delete a post
     */
    @DELETE("/api/social/posts/{postId}")
    suspend fun deletePost(@Path("postId") postId: Int): Response<Unit>

    // ============== Trending ==============

    /**
     * Get trending topics/discussions
     */
    @GET("/api/social/trending")
    suspend fun getTrendingTopics(): Response<TrendingTopicsResponse>
}
