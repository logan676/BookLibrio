package com.bookpost.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bookpost.domain.model.Ebook

@Entity(tableName = "ebooks")
data class EbookEntity(
    @PrimaryKey
    val id: Int,
    val categoryId: Int?,
    val title: String,
    val filePath: String?,
    val fileSize: Long?,
    val fileType: String?,
    val normalizedTitle: String?,
    val coverUrl: String?,
    val s3Key: String?,
    val createdAt: String?,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toDomain(): Ebook = Ebook(
        id = id,
        categoryId = categoryId,
        title = title,
        filePath = filePath,
        fileSize = fileSize,
        fileType = fileType,
        normalizedTitle = normalizedTitle,
        coverUrl = coverUrl,
        s3Key = s3Key,
        createdAt = createdAt
    )

    companion object {
        fun fromDomain(ebook: Ebook): EbookEntity = EbookEntity(
            id = ebook.id,
            categoryId = ebook.categoryId,
            title = ebook.title,
            filePath = ebook.filePath,
            fileSize = ebook.fileSize,
            fileType = ebook.fileType,
            normalizedTitle = ebook.normalizedTitle,
            coverUrl = ebook.coverUrl,
            s3Key = ebook.s3Key,
            createdAt = ebook.createdAt
        )
    }
}
