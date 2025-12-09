package com.bookpost.data.remote.dto

import com.bookpost.domain.model.Magazine
import com.bookpost.domain.model.Publisher
import kotlinx.serialization.Serializable

@Serializable
data class MagazineDto(
    val id: Int,
    val publisherId: Int? = null,
    val title: String,
    val filePath: String? = null,
    val fileSize: Long? = null,
    val year: Int? = null,
    val pageCount: Int? = null,
    val coverUrl: String? = null,
    val preprocessed: Boolean? = null,
    val s3Key: String? = null,
    val createdAt: String? = null
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
        preprocessed = preprocessed ?: false,
        s3Key = s3Key,
        createdAt = createdAt
    )
}

@Serializable
data class PublisherDto(
    val id: Int,
    val name: String,
    val description: String? = null,
    val count: Int? = null
) {
    fun toDomain(): Publisher = Publisher(
        id = id,
        name = name,
        description = description,
        count = count ?: 0
    )
}

@Serializable
data class MagazinesResponse(
    val data: List<MagazineDto>,
    val total: Int
)

@Serializable
data class MagazineResponse(
    val data: MagazineDto
)

@Serializable
data class PublishersResponse(
    val data: List<PublisherDto>
)
