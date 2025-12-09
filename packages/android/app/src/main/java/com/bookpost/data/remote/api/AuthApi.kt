package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.AuthResponse
import com.bookpost.data.remote.dto.LoginRequest
import com.bookpost.data.remote.dto.RefreshTokenRequest
import com.bookpost.data.remote.dto.RefreshTokenResponse
import com.bookpost.data.remote.dto.RegisterRequest
import com.bookpost.data.remote.dto.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {

    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("/api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @GET("/api/auth/me")
    suspend fun getMe(): Response<UserResponse>
}
