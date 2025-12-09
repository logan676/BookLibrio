package com.bookpost.data.remote.api

import com.bookpost.data.remote.dto.BookResponse
import com.bookpost.data.remote.dto.BooksResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface BooksApi {

    @GET("/api/books")
    suspend fun getBooks(
        @Query("search") search: String? = null,
        @Query("author") author: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<BooksResponse>

    @GET("/api/books/{id}")
    suspend fun getBook(@Path("id") id: Int): Response<BookResponse>
}
