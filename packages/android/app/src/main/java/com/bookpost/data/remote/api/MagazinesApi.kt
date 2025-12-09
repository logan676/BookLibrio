package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.MagazineResponse
import com.bookpost.data.remote.dto.MagazinesResponse
import com.bookpost.data.remote.dto.PublishersResponse
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface MagazinesApi {

    @GET("/api/magazines")
    suspend fun getMagazines(
        @Query("publisher") publisher: Int? = null,
        @Query("year") year: Int? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<MagazinesResponse>

    @GET("/api/magazines/{id}")
    suspend fun getMagazine(@Path("id") id: Int): Response<MagazineResponse>

    @GET("/api/magazines/publishers")
    suspend fun getPublishers(): Response<PublishersResponse>

    @Streaming
    @GET("/api/magazines/{id}/file")
    suspend fun getMagazineFile(@Path("id") id: Int): Response<ResponseBody>

    @Streaming
    @GET("/api/magazines/{id}/page/{page}")
    suspend fun getMagazinePage(
        @Path("id") id: Int,
        @Path("page") page: Int
    ): Response<ResponseBody>
}
