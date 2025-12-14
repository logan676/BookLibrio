package com.bookpost.data.remote.api

import com.bookpost.domain.model.Badge
import com.bookpost.domain.model.NewBadgesResponse
import com.bookpost.domain.model.UserBadgesResponse
import retrofit2.Response
import retrofit2.http.GET

interface BadgesApi {

    /**
     * Get all available badges grouped by category
     */
    @GET("/api/badges")
    suspend fun getAllBadges(): Response<Map<String, List<Badge>>>

    /**
     * Get user's earned and in-progress badges
     */
    @GET("/api/badges/user")
    suspend fun getUserBadges(): Response<UserBadgesResponse>

    /**
     * Check for newly earned badges
     */
    @GET("/api/badges/check-new")
    suspend fun checkNewBadges(): Response<NewBadgesResponse>
}
