package com.bookpost.domain.model

data class Book(
    val id: Int,
    val title: String,
    val author: String,
    val coverUrl: String? = null,
    val coverPhotoUrl: String? = null,
    val isbn: String? = null,
    val publisher: String? = null,
    val publishYear: Int? = null,
    val description: String? = null,
    val pageCount: Int? = null,
    val categories: String? = null,
    val language: String? = null,
    val createdAt: String? = null,
    val posts: List<BlogPost> = emptyList()
)

data class BlogPost(
    val id: Int,
    val bookId: Int,
    val title: String,
    val content: String,
    val pagePhotoUrl: String? = null,
    val pageNumber: Int? = null,
    val extractedText: String? = null,
    val createdAt: String? = null,
    val bookTitle: String? = null,
    val bookAuthor: String? = null
)

data class Note(
    val id: Int,
    val userId: Int,
    val title: String,
    val content: String,
    val createdAt: String? = null,
    val updatedAt: String? = null
)
