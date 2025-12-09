package com.bookpost.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun String?.orEmpty(): String = this ?: ""

fun String?.toDisplayDate(): String {
    if (this == null) return ""
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val outputFormat = SimpleDateFormat("yyyy年MM月dd日", Locale.CHINESE)
        val date = inputFormat.parse(this)
        date?.let { outputFormat.format(it) } ?: this
    } catch (e: Exception) {
        this
    }
}

fun Long.formatFileSize(): String {
    val kb = 1024L
    val mb = kb * 1024
    val gb = mb * 1024

    return when {
        this >= gb -> String.format(Locale.getDefault(), "%.2f GB", this.toFloat() / gb)
        this >= mb -> String.format(Locale.getDefault(), "%.2f MB", this.toFloat() / mb)
        this >= kb -> String.format(Locale.getDefault(), "%.2f KB", this.toFloat() / kb)
        else -> "$this B"
    }
}

fun Date.formatRelativeTime(): String {
    val now = System.currentTimeMillis()
    val diff = now - this.time

    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        days > 30 -> SimpleDateFormat("yyyy年MM月dd日", Locale.CHINESE).format(this)
        days > 0 -> "${days}天前"
        hours > 0 -> "${hours}小时前"
        minutes > 0 -> "${minutes}分钟前"
        else -> "刚刚"
    }
}
