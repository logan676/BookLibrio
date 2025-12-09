package com.bookpost.ui.screen.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Newspaper
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingHistoryEntry
import com.bookpost.ui.components.BookCoverImage
import com.bookpost.ui.components.EmptyState
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onEbookClick: (Int) -> Unit,
    onMagazineClick: (Int) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BookPost") }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.readingHistory.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.readingHistory.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: "未知错误",
                        onRetry = { viewModel.refresh() }
                    )
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        // Recent reading section
                        if (uiState.readingHistory.isNotEmpty()) {
                            Text(
                                text = "继续阅读",
                                style = MaterialTheme.typography.titleLarge
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp)
                            ) {
                                items(uiState.readingHistory) { entry ->
                                    ReadingHistoryCard(
                                        entry = entry,
                                        onClick = {
                                            when (entry.itemType) {
                                                ItemType.EBOOK -> onEbookClick(entry.itemId)
                                                ItemType.MAGAZINE -> onMagazineClick(entry.itemId)
                                                ItemType.BOOK -> { /* TODO */ }
                                            }
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(24.dp))
                        }

                        // Quick access section
                        Text(
                            text = "快速入口",
                            style = MaterialTheme.typography.titleLarge
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            QuickAccessCard(
                                title = "电子书",
                                icon = { Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null) },
                                modifier = Modifier.weight(1f),
                                onClick = { /* Navigate handled by bottom nav */ }
                            )

                            QuickAccessCard(
                                title = "杂志",
                                icon = { Icon(Icons.Default.Newspaper, contentDescription = null) },
                                modifier = Modifier.weight(1f),
                                onClick = { /* Navigate handled by bottom nav */ }
                            )

                            QuickAccessCard(
                                title = "实体书",
                                icon = { Icon(Icons.Default.Book, contentDescription = null) },
                                modifier = Modifier.weight(1f),
                                onClick = { /* Navigate handled by bottom nav */ }
                            )
                        }

                        if (uiState.readingHistory.isEmpty()) {
                            Spacer(modifier = Modifier.height(48.dp))
                            EmptyState(message = "暂无阅读记录\n开始探索您的书架吧")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReadingHistoryCard(
    entry: ReadingHistoryEntry,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .width(140.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            BookCoverImage(
                coverUrl = entry.coverUrl,
                contentDescription = entry.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
            )

            Column(
                modifier = Modifier.padding(8.dp)
            ) {
                Text(
                    text = entry.title ?: "未知标题",
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                if (entry.lastPage != null) {
                    Text(
                        text = "第 ${entry.lastPage} 页",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickAccessCard(
    title: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            icon()
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
