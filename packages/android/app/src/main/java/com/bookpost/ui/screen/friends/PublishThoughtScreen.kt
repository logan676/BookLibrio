package com.bookpost.ui.screen.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Publish thought/post screen
 * Allows users to share reading thoughts, quotes, and discussions
 * Matches iOS PublishThoughtView functionality
 */

data class TaggedBook(
    val id: Int,
    val title: String,
    val author: String,
    val type: String = "ebook"
)

enum class PostVisibility(val displayName: String, val icon: ImageVector) {
    PUBLIC("公开", Icons.Default.Public),
    FRIENDS("仅好友", Icons.Default.People),
    PRIVATE("仅自己", Icons.Default.Lock)
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PublishThoughtScreen(
    onNavigateBack: () -> Unit,
    onPublishSuccess: () -> Unit
) {
    var thoughtText by remember { mutableStateOf("") }
    var selectedBook by remember { mutableStateOf<TaggedBook?>(null) }
    var selectedVisibility by remember { mutableStateOf(PostVisibility.PUBLIC) }
    var isPublishing by remember { mutableStateOf(false) }
    var showBookPicker by remember { mutableStateOf(false) }
    var showVisibilityPicker by remember { mutableStateOf(false) }

    val maxCharacters = 2000
    val scope = rememberCoroutineScope()

    val canPublish = thoughtText.isNotBlank() && thoughtText.length <= maxCharacters && !isPublishing

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("发布想法") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "取消"
                        )
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            scope.launch {
                                isPublishing = true
                                // Simulate API call
                                delay(1500)
                                isPublishing = false
                                onPublishSuccess()
                            }
                        },
                        enabled = canPublish
                    ) {
                        if (isPublishing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                "发布",
                                fontWeight = FontWeight.SemiBold,
                                color = if (canPublish)
                                    MaterialTheme.colorScheme.primary
                                else
                                    MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Main content - scrollable
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                // User avatar and text input
                Row(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Avatar
                    Surface(
                        modifier = Modifier.size(44.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "我",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        // Text input
                        Box {
                            BasicTextField(
                                value = thoughtText,
                                onValueChange = { thoughtText = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp),
                                textStyle = TextStyle(
                                    fontSize = 16.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                ),
                                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                                decorationBox = { innerTextField ->
                                    Box {
                                        if (thoughtText.isEmpty()) {
                                            Text(
                                                text = "分享你的阅读感想...",
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        innerTextField()
                                    }
                                }
                            )
                        }

                        // Character count
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Text(
                                text = "${thoughtText.length}/$maxCharacters",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (thoughtText.length > maxCharacters)
                                    MaterialTheme.colorScheme.error
                                else
                                    MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Tagged book
                if (selectedBook != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    TaggedBookCard(
                        book = selectedBook!!,
                        onRemove = { selectedBook = null }
                    )
                }
            }

            HorizontalDivider()

            // Bottom toolbar
            BottomToolbar(
                selectedVisibility = selectedVisibility,
                hasTaggedBook = selectedBook != null,
                onImageClick = { /* Handle image picker */ },
                onBookClick = { showBookPicker = true },
                onVisibilityClick = { showVisibilityPicker = true }
            )
        }

        // Book picker bottom sheet
        if (showBookPicker) {
            BookPickerSheet(
                onDismiss = { showBookPicker = false },
                onBookSelected = { book ->
                    selectedBook = book
                    showBookPicker = false
                }
            )
        }

        // Visibility picker bottom sheet
        if (showVisibilityPicker) {
            VisibilityPickerSheet(
                selectedVisibility = selectedVisibility,
                onDismiss = { showVisibilityPicker = false },
                onVisibilitySelected = { visibility ->
                    selectedVisibility = visibility
                    showVisibilityPicker = false
                }
            )
        }
    }
}

@Composable
private fun TaggedBookCard(
    book: TaggedBook,
    onRemove: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Book icon placeholder
            Surface(
                modifier = Modifier.size(40.dp, 56.dp),
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Book,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = book.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = book.author,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(onClick = onRemove) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "移除",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun BottomToolbar(
    selectedVisibility: PostVisibility,
    hasTaggedBook: Boolean,
    onImageClick: () -> Unit,
    onBookClick: () -> Unit,
    onVisibilityClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Image picker
        ToolbarButton(
            icon = Icons.Default.Image,
            label = "图片",
            onClick = onImageClick
        )

        // Book tag
        ToolbarButton(
            icon = Icons.Default.Book,
            label = "书籍",
            isActive = hasTaggedBook,
            onClick = onBookClick
        )

        // Visibility
        ToolbarButton(
            icon = selectedVisibility.icon,
            label = selectedVisibility.displayName,
            onClick = onVisibilityClick
        )

        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun ToolbarButton(
    icon: ImageVector,
    label: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            modifier = Modifier.size(24.dp),
            tint = if (isActive)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (isActive)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.primary
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BookPickerSheet(
    onDismiss: () -> Unit,
    onBookSelected: (TaggedBook) -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    // Sample books
    val recentBooks = listOf(
        TaggedBook(1, "平凡的世界", "路遥"),
        TaggedBook(2, "活着", "余华"),
        TaggedBook(3, "三体", "刘慈欣"),
        TaggedBook(4, "围城", "钱钟书"),
        TaggedBook(5, "红楼梦", "曹雪芹")
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier.padding(bottom = 32.dp)
        ) {
            Text(
                text = "选择书籍",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            Text(
                text = "最近阅读",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            recentBooks.forEach { book ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onBookSelected(book) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(40.dp, 56.dp),
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Book,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = book.title,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = book.author,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VisibilityPickerSheet(
    selectedVisibility: PostVisibility,
    onDismiss: () -> Unit,
    onVisibilitySelected: (PostVisibility) -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier.padding(bottom = 32.dp)
        ) {
            Text(
                text = "谁可以看",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            PostVisibility.entries.forEach { visibility ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onVisibilitySelected(visibility) }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = visibility.icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.width(16.dp))

                    Text(
                        text = visibility.displayName,
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f)
                    )

                    if (visibility == selectedVisibility) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}
