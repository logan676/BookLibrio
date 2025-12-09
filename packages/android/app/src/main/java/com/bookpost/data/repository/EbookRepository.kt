package com.bookpost.data.repository

import com.bookpost.data.local.db.dao.EbookDao
import com.bookpost.data.local.db.entity.EbookEntity
import com.bookpost.data.remote.api.EbooksApi
import com.bookpost.data.remote.dto.CreateUnderlineRequest
import com.bookpost.domain.model.Ebook
import com.bookpost.domain.model.EbookCategory
import com.bookpost.domain.model.EbookUnderline
import com.bookpost.util.NetworkResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import okhttp3.ResponseBody
import javax.inject.Inject

class EbookRepository @Inject constructor(
    private val ebooksApi: EbooksApi,
    private val ebookDao: EbookDao
) {
    fun getCachedEbooks(): Flow<List<Ebook>> {
        return ebookDao.getAllEbooks().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getCachedEbooksByCategory(categoryId: Int): Flow<List<Ebook>> {
        return ebookDao.getEbooksByCategory(categoryId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun searchCachedEbooks(query: String): Flow<List<Ebook>> {
        return ebookDao.searchEbooks(query).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun getEbooks(
        category: Int? = null,
        search: String? = null,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<Pair<List<Ebook>, Int>> {
        return try {
            val response = ebooksApi.getEbooks(category, search, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let { ebooksResponse ->
                    val ebooks = ebooksResponse.data.map { it.toDomain() }
                    // Cache ebooks
                    ebookDao.insertEbooks(ebooks.map { EbookEntity.fromDomain(it) })
                    NetworkResult.Success(Pair(ebooks, ebooksResponse.total))
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getEbook(id: Int): NetworkResult<Ebook> {
        return try {
            val response = ebooksApi.getEbook(id)
            if (response.isSuccessful) {
                response.body()?.let { ebookResponse ->
                    val ebook = ebookResponse.data.toDomain()
                    ebookDao.insertEbook(EbookEntity.fromDomain(ebook))
                    NetworkResult.Success(ebook)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getCachedEbook(id: Int): Ebook? {
        return ebookDao.getEbookById(id)?.toDomain()
    }

    suspend fun getCategories(): NetworkResult<List<EbookCategory>> {
        return try {
            val response = ebooksApi.getCategories()
            if (response.isSuccessful) {
                response.body()?.let { categoriesResponse ->
                    NetworkResult.Success(categoriesResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getEbookFile(id: Int): NetworkResult<ResponseBody> {
        return try {
            val response = ebooksApi.getEbookFile(id)
            if (response.isSuccessful) {
                response.body()?.let { body ->
                    NetworkResult.Success(body)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getUnderlines(ebookId: Int): NetworkResult<List<EbookUnderline>> {
        return try {
            val response = ebooksApi.getUnderlines(ebookId)
            if (response.isSuccessful) {
                response.body()?.let { underlinesResponse ->
                    NetworkResult.Success(underlinesResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun createUnderline(
        ebookId: Int,
        text: String,
        cfiRange: String? = null,
        chapterIndex: Int? = null,
        paragraphIndex: Int? = null,
        startOffset: Int? = null,
        endOffset: Int? = null
    ): NetworkResult<Unit> {
        return try {
            val request = CreateUnderlineRequest(
                text = text,
                cfiRange = cfiRange,
                chapterIndex = chapterIndex,
                paragraphIndex = paragraphIndex,
                startOffset = startOffset,
                endOffset = endOffset
            )
            val response = ebooksApi.createUnderline(ebookId, request)
            if (response.isSuccessful) {
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun deleteUnderline(ebookId: Int, underlineId: Int): NetworkResult<Unit> {
        return try {
            val response = ebooksApi.deleteUnderline(ebookId, underlineId)
            if (response.isSuccessful) {
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
