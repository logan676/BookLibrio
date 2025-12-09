package com.bookpost.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bookpost.data.local.db.entity.ReadingHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ReadingHistoryDao {

    @Query("SELECT * FROM reading_history ORDER BY lastReadAt DESC")
    fun getAllReadingHistory(): Flow<List<ReadingHistoryEntity>>

    @Query("SELECT * FROM reading_history WHERE itemType = :itemType ORDER BY lastReadAt DESC")
    fun getReadingHistoryByType(itemType: String): Flow<List<ReadingHistoryEntity>>

    @Query("SELECT * FROM reading_history WHERE itemType = :itemType AND itemId = :itemId")
    suspend fun getReadingHistoryEntry(itemType: String, itemId: Int): ReadingHistoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReadingHistory(entries: List<ReadingHistoryEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReadingHistoryEntry(entry: ReadingHistoryEntity)

    @Query("DELETE FROM reading_history")
    suspend fun deleteAllReadingHistory()

    @Query("DELETE FROM reading_history WHERE cachedAt < :timestamp")
    suspend fun deleteOldReadingHistory(timestamp: Long)
}
