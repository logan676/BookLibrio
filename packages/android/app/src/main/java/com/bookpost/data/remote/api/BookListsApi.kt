package com.bookpost.data.remote.api

import com.bookpost.domain.model.AddBookToListRequest
import com.bookpost.domain.model.AddToListResponse
import com.bookpost.domain.model.BookListActionResponse
import com.bookpost.domain.model.BookListFollowResponse
import com.bookpost.domain.model.BookListItemsResponse
import com.bookpost.domain.model.BookListResponse
import com.bookpost.domain.model.BookListsResponse
import com.bookpost.domain.model.CreateBookListRequest
import com.bookpost.domain.model.UpdateBookListRequest
import com.bookpost.domain.model.UpdateListItemRequest
import com.bookpost.domain.model.UserBookListsResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface BookListsApi {

    // MARK: - Browse Lists

    @GET("/api/book-lists")
    suspend fun getBookLists(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("sort") sort: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<BookListsResponse>

    @GET("/api/book-lists/{id}")
    suspend fun getBookList(
        @Path("id") id: Int
    ): Response<BookListResponse>

    @GET("/api/book-lists/{id}/items")
    suspend fun getBookListItems(
        @Path("id") listId: Int,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Response<BookListItemsResponse>

    // MARK: - My Lists

    @GET("/api/book-lists/my")
    suspend fun getMyBookLists(): Response<UserBookListsResponse>

    // MARK: - Create & Edit

    @POST("/api/book-lists")
    suspend fun createBookList(
        @Body request: CreateBookListRequest
    ): Response<BookListResponse>

    @PUT("/api/book-lists/{id}")
    suspend fun updateBookList(
        @Path("id") id: Int,
        @Body request: UpdateBookListRequest
    ): Response<BookListResponse>

    @DELETE("/api/book-lists/{id}")
    suspend fun deleteBookList(
        @Path("id") id: Int
    ): Response<BookListActionResponse>

    // MARK: - List Items

    @POST("/api/book-lists/{id}/items")
    suspend fun addBookToList(
        @Path("id") listId: Int,
        @Body request: AddBookToListRequest
    ): Response<AddToListResponse>

    @DELETE("/api/book-lists/{listId}/items/{itemId}")
    suspend fun removeBookFromList(
        @Path("listId") listId: Int,
        @Path("itemId") itemId: Int
    ): Response<BookListActionResponse>

    @PUT("/api/book-lists/{listId}/items/{itemId}")
    suspend fun updateListItem(
        @Path("listId") listId: Int,
        @Path("itemId") itemId: Int,
        @Body request: UpdateListItemRequest
    ): Response<AddToListResponse>

    // MARK: - Follow

    @POST("/api/book-lists/{id}/follow")
    suspend fun toggleFollow(
        @Path("id") listId: Int
    ): Response<BookListFollowResponse>
}
