package com.bookpost.data.repository

import com.bookpost.data.local.datastore.UserPreferences
import com.bookpost.data.remote.api.AuthApi
import com.bookpost.data.remote.dto.LoginRequest
import com.bookpost.data.remote.dto.RefreshTokenRequest
import com.bookpost.data.remote.dto.RegisterRequest
import com.bookpost.domain.model.AuthToken
import com.bookpost.domain.model.User
import com.bookpost.util.NetworkResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject

class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val userPreferences: UserPreferences
) {
    val isLoggedIn: Flow<Boolean> = userPreferences.isLoggedIn
    val currentUser: Flow<User?> = userPreferences.user

    suspend fun login(email: String, password: String): NetworkResult<User> {
        return try {
            val response = authApi.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                response.body()?.let { authResponse ->
                    val (user, token) = authResponse.toUserAndToken()
                    userPreferences.saveAuthData(user, token)
                    NetworkResult.Success(user)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun register(username: String, email: String, password: String): NetworkResult<User> {
        return try {
            val response = authApi.register(RegisterRequest(username, email, password))
            if (response.isSuccessful) {
                response.body()?.let { authResponse ->
                    val (user, token) = authResponse.toUserAndToken()
                    userPreferences.saveAuthData(user, token)
                    NetworkResult.Success(user)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun refreshToken(): NetworkResult<AuthToken> {
        return try {
            val refreshToken = userPreferences.refreshToken.first()
            if (refreshToken.isNullOrEmpty()) {
                return NetworkResult.Error("No refresh token available")
            }

            val response = authApi.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful) {
                response.body()?.let { refreshResponse ->
                    val newToken = refreshResponse.toAuthToken()
                    userPreferences.updateTokens(newToken)
                    NetworkResult.Success(newToken)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getCurrentUser(): NetworkResult<User> {
        return try {
            val response = authApi.getMe()
            if (response.isSuccessful) {
                response.body()?.let { userResponse ->
                    NetworkResult.Success(userResponse.data.toDomain())
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun logout() {
        userPreferences.clearAuthData()
    }
}
