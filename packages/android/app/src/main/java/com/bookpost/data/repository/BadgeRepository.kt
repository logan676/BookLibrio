package com.bookpost.data.repository

import com.bookpost.data.remote.api.BadgesApi
import com.bookpost.domain.model.Badge
import com.bookpost.domain.model.NewBadgesResponse
import com.bookpost.domain.model.UserBadgesResponse
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class BadgeRepository @Inject constructor(
    private val badgesApi: BadgesApi
) {
    /**
     * Get all available badges grouped by category
     */
    suspend fun getAllBadges(): NetworkResult<Map<String, List<Badge>>> {
        return try {
            val response = badgesApi.getAllBadges()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Get user's earned and in-progress badges
     */
    suspend fun getUserBadges(): NetworkResult<UserBadgesResponse> {
        return try {
            val response = badgesApi.getUserBadges()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Check for newly earned badges
     */
    suspend fun checkNewBadges(): NetworkResult<NewBadgesResponse> {
        return try {
            val response = badgesApi.checkNewBadges()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
