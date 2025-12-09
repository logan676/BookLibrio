package com.bookpost.domain.model

data class ReadingHistoryEntry(
    val id: Int,
    val userId: Int? = null,
    val itemType: ItemType,
    val itemId: Int,
    val title: String? = null,
    val coverUrl: String? = null,
    val lastPage: Int? = null,
    val lastReadAt: String? = null,
    val createdAt: String? = null
)

enum class ItemType(val value: String) {
    EBOOK("ebook"),
    MAGAZINE("magazine"),
    BOOK("book");

    companion object {
        fun fromString(value: String): ItemType {
            return entries.find { it.value == value } ?: EBOOK
        }
    }
}
