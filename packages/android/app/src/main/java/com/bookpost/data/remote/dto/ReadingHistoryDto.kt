package com.bookpost.data.remote.dto

import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingHistoryEntry
import kotlinx.serialization.Serializable

@Serializable
data class ReadingHistoryEntryDto(
    val id: Int,
    val userId: Int? = null,
    val itemType: String,
    val itemId: Int,
    val title: String? = null,
    val coverUrl: String? = null,
    val lastPage: Int? = null,
    val lastReadAt: String? = null,
    val createdAt: String? = null
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
}

@Serializable
data class ReadingHistoryResponse(
    val data: List<ReadingHistoryEntryDto>
)

@Serializable
data class UpdateReadingHistoryRequest(
    val itemType: String,
    val itemId: Int,
    val title: String? = null,
    val coverUrl: String? = null,
    val lastPage: Int? = null
)

@Serializable
data class UpdateReadingHistoryResponse(
    val data: ReadingHistoryEntryDto
)
