package com.bookpost.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bookpost.domain.model.Magazine

@Entity(tableName = "magazines")
data class MagazineEntity(
    @PrimaryKey
    val id: Int,
    val publisherId: Int?,
    val title: String,
    val filePath: String?,
    val fileSize: Long?,
    val year: Int?,
    val pageCount: Int?,
    val coverUrl: String?,
    val preprocessed: Boolean,
    val s3Key: String?,
    val createdAt: String?,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toDomain(): Magazine = Magazine(
        id = id,
        publisherId = publisherId,
        title = title,
        filePath = filePath,
        fileSize = fileSize,
        year = year,
        pageCount = pageCount,
        coverUrl = coverUrl,
        preprocessed = preprocessed,
        s3Key = s3Key,
        createdAt = createdAt
    )

    companion object {
        fun fromDomain(magazine: Magazine): MagazineEntity = MagazineEntity(
            id = magazine.id,
            publisherId = magazine.publisherId,
            title = magazine.title,
            filePath = magazine.filePath,
            fileSize = magazine.fileSize,
            year = magazine.year,
            pageCount = magazine.pageCount,
            coverUrl = magazine.coverUrl,
            preprocessed = magazine.preprocessed,
            s3Key = magazine.s3Key,
            createdAt = magazine.createdAt
        )
    }
}
