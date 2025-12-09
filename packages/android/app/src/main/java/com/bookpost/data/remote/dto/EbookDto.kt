package com.bookpost.data.remote.dto

import com.bookpost.domain.model.Ebook
import com.bookpost.domain.model.EbookCategory
import com.bookpost.domain.model.EbookUnderline
import kotlinx.serialization.Serializable

@Serializable
data class EbookDto(
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
}

@Serializable
data class EbookCategoryDto(
    val id: Int,
    val name: String,
    val description: String? = null,
    val count: Int? = null,
    val createdAt: String? = null
) {
    fun toDomain(): EbookCategory = EbookCategory(
        id = id,
        name = name,
        description = description,
        count = count ?: 0,
        createdAt = createdAt
    )
}

@Serializable
data class EbookUnderlineDto(
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
    val ideaCount: Int? = null,
    val createdAt: String? = null
) {
    fun toDomain(): EbookUnderline = EbookUnderline(
        id = id,
        ebookId = ebookId,
        userId = userId,
        text = text,
        paragraph = paragraph,
        chapterIndex = chapterIndex,
        paragraphIndex = paragraphIndex,
        startOffset = startOffset,
        endOffset = endOffset,
        cfiRange = cfiRange,
        ideaCount = ideaCount ?: 0,
        createdAt = createdAt
    )
}

@Serializable
data class EbooksResponse(
    val data: List<EbookDto>,
    val total: Int
)

@Serializable
data class EbookResponse(
    val data: EbookDto
)

@Serializable
data class EbookCategoriesResponse(
    val data: List<EbookCategoryDto>
)

@Serializable
data class EbookUnderlinesResponse(
    val data: List<EbookUnderlineDto>
)

@Serializable
data class CreateUnderlineRequest(
    val text: String,
    val paragraph: Int? = null,
    val chapterIndex: Int? = null,
    val paragraphIndex: Int? = null,
    val startOffset: Int? = null,
    val endOffset: Int? = null,
    val cfiRange: String? = null
)
