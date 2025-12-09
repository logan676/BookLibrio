package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.ReadingHistoryResponse
import com.bookpost.data.remote.dto.UpdateReadingHistoryRequest
import com.bookpost.data.remote.dto.UpdateReadingHistoryResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ReadingHistoryApi {

    @GET("/api/reading-history")
    suspend fun getReadingHistory(
        @Query("limit") limit: Int? = null
    ): Response<ReadingHistoryResponse>

    @POST("/api/reading-history")
    suspend fun updateReadingHistory(
        @Body request: UpdateReadingHistoryRequest
    ): Response<UpdateReadingHistoryResponse>
}
