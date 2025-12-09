package com.bookpost.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingHistoryEntry

@Entity(tableName = "reading_history")
data class ReadingHistoryEntity(
    @PrimaryKey
    val id: Int,
    val userId: Int?,
    val itemType: String,
    val itemId: Int,
    val title: String?,
    val coverUrl: String?,
    val lastPage: Int?,
    val lastReadAt: String?,
    val createdAt: String?,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toDomain(): ReadingHistoryEntry = ReadingHistoryEntry(
        id = id,
        userId = userId,
        itemType = ItemType.fromString(itemType),
        itemId = itemId,
        title = title,
        coverUrl = coverUrl,
        lastPage = lastPage,
        lastReadAt = lastReadAt,
        createdAt = createdAt
    )

    companion object {
        fun fromDomain(entry: ReadingHistoryEntry): ReadingHistoryEntity = ReadingHistoryEntity(
            id = entry.id,
            userId = entry.userId,
            itemType = entry.itemType.value,
            itemId = entry.itemId,
            title = entry.title,
            coverUrl = entry.coverUrl,
            lastPage = entry.lastPage,
            lastReadAt = entry.lastReadAt,
            createdAt = entry.createdAt
        )
    }
}
