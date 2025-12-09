package com.bookpost.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bookpost.data.local.db.entity.EbookEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EbookDao {

    @Query("SELECT * FROM ebooks ORDER BY title ASC")
    fun getAllEbooks(): Flow<List<EbookEntity>>

    @Query("SELECT * FROM ebooks WHERE categoryId = :categoryId ORDER BY title ASC")
    fun getEbooksByCategory(categoryId: Int): Flow<List<EbookEntity>>

    @Query("SELECT * FROM ebooks WHERE title LIKE '%' || :query || '%' ORDER BY title ASC")
    fun searchEbooks(query: String): Flow<List<EbookEntity>>

    @Query("SELECT * FROM ebooks WHERE id = :id")
    suspend fun getEbookById(id: Int): EbookEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEbooks(ebooks: List<EbookEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEbook(ebook: EbookEntity)

    @Query("DELETE FROM ebooks")
    suspend fun deleteAllEbooks()

    @Query("DELETE FROM ebooks WHERE cachedAt < :timestamp")
    suspend fun deleteOldEbooks(timestamp: Long)
}
