package com.bookpost.domain.model

data class Ebook(
    val id: Int,
    val categoryId: Int? = null,
    val title: String,
    val filePath: String? = null,
    val fileSize: Long? = null,
    val fileType: String? = null,
    val normalizedTitle: String? = null,
    val coverUrl: String? = null,
    val s3Key: String? = null,
    val createdAt: String? = null
) {
    val isPdf: Boolean get() = fileType?.lowercase() == "pdf"
    val isEpub: Boolean get() = fileType?.lowercase() == "epub"
}

data class EbookCategory(
    val id: Int,
    val name: String,
    val description: String? = null,
    val count: Int = 0,
    val createdAt: String? = null
)

data class EbookUnderline(
    val id: Int,
    val ebookId: Int,
    val userId: Int,
    val text: String,
    val paragraph: Int? = null,
    val chapterIndex: Int? = null,
    val paragraphIndex: Int? = null,
    val startOffset: Int? = null,
    val endOffset: Int? = null,
    val cfiRange: String? = null,
    val ideaCount: Int = 0,
    val createdAt: String? = null
)
