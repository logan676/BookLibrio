package com.bookpost.data.repository

import com.bookpost.data.remote.api.BookListsApi
import com.bookpost.domain.model.AddBookToListRequest
import com.bookpost.domain.model.BookList
import com.bookpost.domain.model.BookListItem
import com.bookpost.domain.model.BookListsResponse
import com.bookpost.domain.model.CreateBookListRequest
import com.bookpost.domain.model.UpdateBookListRequest
import com.bookpost.domain.model.UpdateListItemRequest
import com.bookpost.domain.model.UserBookListsSummary
import com.bookpost.util.NetworkResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookListRepository @Inject constructor(
    private val api: BookListsApi
) {

    // MARK: - Browse Lists

    suspend fun getBookLists(
        category: String? = null,
        search: String? = null,
        sort: String? = null,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<BookListsResponse> {
        return try {
            val response = api.getBookLists(category, search, sort, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getBookList(id: Int): NetworkResult<BookList> {
        return try {
            val response = api.getBookList(id)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getBookListItems(
        listId: Int,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<List<BookListItem>> {
        return try {
            val response = api.getBookListItems(listId, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    // MARK: - My Lists

    suspend fun getMyBookLists(): NetworkResult<UserBookListsSummary> {
        return try {
            val response = api.getMyBookLists()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    // MARK: - Create & Edit

    suspend fun createBookList(
        title: String,
        description: String?,
        isPublic: Boolean,
        category: String?,
        tags: List<String>?
    ): NetworkResult<BookList> {
        return try {
            val request = CreateBookListRequest(
                title = title,
                description = description,
                isPublic = isPublic,
                category = category,
                tags = tags
            )
            val response = api.createBookList(request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateBookList(
        id: Int,
        title: String?,
        description: String?,
        isPublic: Boolean?,
        category: String?,
        tags: List<String>?
    ): NetworkResult<BookList> {
        return try {
            val request = UpdateBookListRequest(
                title = title,
                description = description,
                isPublic = isPublic,
                category = category,
                tags = tags
            )
            val response = api.updateBookList(id, request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteBookList(id: Int): NetworkResult<Boolean> {
        return try {
            val response = api.deleteBookList(id)
            if (response.isSuccessful) {
                NetworkResult.Success(true)
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    // MARK: - List Items

    suspend fun addBookToList(
        listId: Int,
        bookId: Int,
        bookType: String,
        note: String? = null
    ): NetworkResult<BookListItem> {
        return try {
            val request = AddBookToListRequest(
                bookId = bookId,
                bookType = bookType,
                note = note
            )
            val response = api.addBookToList(listId, request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun removeBookFromList(listId: Int, itemId: Int): NetworkResult<Boolean> {
        return try {
            val response = api.removeBookFromList(listId, itemId)
            if (response.isSuccessful) {
                NetworkResult.Success(true)
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateListItem(
        listId: Int,
        itemId: Int,
        note: String?,
        position: Int?
    ): NetworkResult<BookListItem> {
        return try {
            val request = UpdateListItemRequest(note = note, position = position)
            val response = api.updateListItem(listId, itemId, request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    // MARK: - Follow

    suspend fun toggleFollow(listId: Int): NetworkResult<Boolean> {
        return try {
            val response = api.toggleFollow(listId)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it.data.isFollowing)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
