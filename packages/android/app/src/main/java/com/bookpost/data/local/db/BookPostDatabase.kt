package com.bookpost.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.bookpost.data.local.db.dao.EbookDao
import com.bookpost.data.local.db.dao.MagazineDao
import com.bookpost.data.local.db.dao.ReadingHistoryDao
import com.bookpost.data.local.db.entity.EbookEntity
import com.bookpost.data.local.db.entity.MagazineEntity
import com.bookpost.data.local.db.entity.ReadingHistoryEntity

@Database(
    entities = [
        EbookEntity::class,
        MagazineEntity::class,
        ReadingHistoryEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class BookPostDatabase : RoomDatabase() {
    abstract fun ebookDao(): EbookDao
    abstract fun magazineDao(): MagazineDao
    abstract fun readingHistoryDao(): ReadingHistoryDao
}
