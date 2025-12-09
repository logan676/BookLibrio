package com.bookpost.data.remote.dto

import com.bookpost.domain.model.AuthToken
import com.bookpost.domain.model.User
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    val isAdmin: Boolean? = null,
    val createdAt: String? = null
) {
    fun toDomain(): User = User(
        id = id,
        username = username,
        email = email,
        isAdmin = isAdmin ?: false,
        createdAt = createdAt
    )
}

@Serializable
data class AuthResponseData(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String
)

@Serializable
data class AuthResponse(
    val data: AuthResponseData
) {
    fun toUserAndToken(): Pair<User, AuthToken> {
        return Pair(
            data.user.toDomain(),
            AuthToken(
                accessToken = data.accessToken,
                refreshToken = data.refreshToken
            )
        )
    }
}

@Serializable
data class RefreshTokenResponseData(
    val accessToken: String,
    val refreshToken: String
)

@Serializable
data class RefreshTokenResponse(
    val data: RefreshTokenResponseData
) {
    fun toAuthToken(): AuthToken = AuthToken(
        accessToken = data.accessToken,
        refreshToken = data.refreshToken
    )
}

@Serializable
data class UserResponse(
    val data: UserDto
)

@Serializable
data class ApiErrorResponse(
    val error: ApiErrorDetail? = null
)

@Serializable
data class ApiErrorDetail(
    val code: String? = null,
    val message: String? = null
)
