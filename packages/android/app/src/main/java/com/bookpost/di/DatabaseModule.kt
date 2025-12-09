package com.bookpost.di

import android.content.Context
import androidx.room.Room
import com.bookpost.data.local.db.BookPostDatabase
import com.bookpost.data.local.db.dao.EbookDao
import com.bookpost.data.local.db.dao.MagazineDao
import com.bookpost.data.local.db.dao.ReadingHistoryDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): BookPostDatabase {
        return Room.databaseBuilder(
            context,
            BookPostDatabase::class.java,
            "bookpost_database"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideEbookDao(database: BookPostDatabase): EbookDao {
        return database.ebookDao()
    }

    @Provides
    @Singleton
    fun provideMagazineDao(database: BookPostDatabase): MagazineDao {
        return database.magazineDao()
    }

    @Provides
    @Singleton
    fun provideReadingHistoryDao(database: BookPostDatabase): ReadingHistoryDao {
        return database.readingHistoryDao()
    }
}
