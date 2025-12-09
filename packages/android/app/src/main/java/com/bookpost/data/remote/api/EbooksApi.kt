package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.CreateUnderlineRequest
import com.bookpost.data.remote.dto.EbookCategoriesResponse
import com.bookpost.data.remote.dto.EbookResponse
import com.bookpost.data.remote.dto.EbookUnderlinesResponse
import com.bookpost.data.remote.dto.EbooksResponse
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface EbooksApi {

    @GET("/api/ebooks")
    suspend fun getEbooks(
        @Query("category") category: Int? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<EbooksResponse>

    @GET("/api/ebooks/{id}")
    suspend fun getEbook(@Path("id") id: Int): Response<EbookResponse>

    @GET("/api/ebook-categories")
    suspend fun getCategories(): Response<EbookCategoriesResponse>

    @Streaming
    @GET("/api/ebooks/{id}/file")
    suspend fun getEbookFile(@Path("id") id: Int): Response<ResponseBody>

    @GET("/api/ebooks/{id}/underlines")
    suspend fun getUnderlines(@Path("id") ebookId: Int): Response<EbookUnderlinesResponse>

    @POST("/api/ebooks/{id}/underlines")
    suspend fun createUnderline(
        @Path("id") ebookId: Int,
        @Body request: CreateUnderlineRequest
    ): Response<Unit>

    @DELETE("/api/ebooks/{id}/underlines/{underlineId}")
    suspend fun deleteUnderline(
        @Path("id") ebookId: Int,
        @Path("underlineId") underlineId: Int
    ): Response<Unit>
}
