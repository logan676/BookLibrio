package com.bookpost.domain.model

data class Magazine(
    val id: Int,
    val publisherId: Int? = null,
    val title: String,
    val filePath: String? = null,
    val fileSize: Long? = null,
    val year: Int? = null,
    val pageCount: Int? = null,
    val coverUrl: String? = null,
    val preprocessed: Boolean = false,
    val s3Key: String? = null,
    val createdAt: String? = null
)

data class Publisher(
    val id: Int,
    val name: String,
    val description: String? = null,
    val count: Int = 0
)
