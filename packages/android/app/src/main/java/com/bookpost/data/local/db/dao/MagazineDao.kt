package com.bookpost.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.bookpost.data.local.db.entity.MagazineEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MagazineDao {

    @Query("SELECT * FROM magazines ORDER BY year DESC, title ASC")
    fun getAllMagazines(): Flow<List<MagazineEntity>>

    @Query("SELECT * FROM magazines WHERE publisherId = :publisherId ORDER BY year DESC, title ASC")
    fun getMagazinesByPublisher(publisherId: Int): Flow<List<MagazineEntity>>

    @Query("SELECT * FROM magazines WHERE year = :year ORDER BY title ASC")
    fun getMagazinesByYear(year: Int): Flow<List<MagazineEntity>>

    @Query("SELECT * FROM magazines WHERE title LIKE '%' || :query || '%' ORDER BY year DESC, title ASC")
    fun searchMagazines(query: String): Flow<List<MagazineEntity>>

    @Query("SELECT * FROM magazines WHERE id = :id")
    suspend fun getMagazineById(id: Int): MagazineEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMagazines(magazines: List<MagazineEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMagazine(magazine: MagazineEntity)

    @Query("DELETE FROM magazines")
    suspend fun deleteAllMagazines()

    @Query("DELETE FROM magazines WHERE cachedAt < :timestamp")
    suspend fun deleteOldMagazines(timestamp: Long)
}
