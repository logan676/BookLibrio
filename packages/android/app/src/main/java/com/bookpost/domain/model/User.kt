package com.bookpost.domain.model

data class User(
    val id: Int,
    val username: String,
    val email: String,
    val isAdmin: Boolean = false,
    val createdAt: String? = null
)

data class AuthToken(
    val accessToken: String,
    val refreshToken: String
)

data class AuthState(
    val user: User? = null,
    val token: AuthToken? = null,
    val isLoggedIn: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null
)
