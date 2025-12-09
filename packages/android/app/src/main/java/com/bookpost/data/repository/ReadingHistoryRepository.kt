package com.bookpost.data.repository

import com.bookpost.data.local.db.dao.ReadingHistoryDao
import com.bookpost.data.local.db.entity.ReadingHistoryEntity
import com.bookpost.data.remote.api.ReadingHistoryApi
import com.bookpost.data.remote.dto.UpdateReadingHistoryRequest
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingHistoryEntry
import com.bookpost.util.NetworkResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ReadingHistoryRepository @Inject constructor(
    private val readingHistoryApi: ReadingHistoryApi,
    private val readingHistoryDao: ReadingHistoryDao
) {
    fun getCachedReadingHistory(): Flow<List<ReadingHistoryEntry>> {
        return readingHistoryDao.getAllReadingHistory().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getCachedReadingHistoryByType(itemType: ItemType): Flow<List<ReadingHistoryEntry>> {
        return readingHistoryDao.getReadingHistoryByType(itemType.value).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun getReadingHistory(limit: Int? = null): NetworkResult<List<ReadingHistoryEntry>> {
        return try {
            val response = readingHistoryApi.getReadingHistory(limit)
            if (response.isSuccessful) {
                response.body()?.let { historyResponse ->
                    val entries = historyResponse.data.map { it.toDomain() }
                    // Cache reading history
                    readingHistoryDao.insertReadingHistory(entries.map { ReadingHistoryEntity.fromDomain(it) })
                    NetworkResult.Success(entries)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun updateReadingHistory(
        itemType: ItemType,
        itemId: Int,
        title: String? = null,
        coverUrl: String? = null,
        lastPage: Int? = null
    ): NetworkResult<ReadingHistoryEntry> {
        return try {
            val request = UpdateReadingHistoryRequest(
                itemType = itemType.value,
                itemId = itemId,
                title = title,
                coverUrl = coverUrl,
                lastPage = lastPage
            )
            val response = readingHistoryApi.updateReadingHistory(request)
            if (response.isSuccessful) {
                response.body()?.let { updateResponse ->
                    val entry = updateResponse.data.toDomain()
                    readingHistoryDao.insertReadingHistoryEntry(ReadingHistoryEntity.fromDomain(entry))
                    NetworkResult.Success(entry)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getCachedReadingHistoryEntry(itemType: ItemType, itemId: Int): ReadingHistoryEntry? {
        return readingHistoryDao.getReadingHistoryEntry(itemType.value, itemId)?.toDomain()
    }
}
