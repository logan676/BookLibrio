package com.bookpost.ui.screen.store

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/**
 * Full search view with suggestions, history, and results
 * Matches iOS StoreSearchView functionality
 */

data class StoreSearchItem(
    val id: Int,
    val title: String,
    val subtitle: String?,
    val badge: String?,
    val coverUrl: String?,
    val type: String // "ebook" or "magazine"
)

enum class SearchFilterType(val displayName: String) {
    ALL("全部"),
    EBOOK("电子书"),
    MAGAZINE("杂志")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StoreSearchScreen(
    onNavigateBack: () -> Unit,
    onItemClick: (id: Int, type: String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<StoreSearchItem>>(emptyList()) }
    var selectedFilter by remember { mutableStateOf(SearchFilterType.ALL) }
    var searchHistory by remember { mutableStateOf(listOf("三体", "人工智能", "心理学")) }

    val hotSearches = remember {
        listOf("人工智能", "心理学", "小说", "历史", "经济学", "科幻", "编程", "哲学")
    }

    val focusRequester = remember { FocusRequester() }

    // Auto-focus on search field
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    // Simulate search
    fun performSearch() {
        if (searchQuery.isBlank()) return

        // Add to history
        searchHistory = listOf(searchQuery) + searchHistory.filter { it != searchQuery }.take(9)

        isSearching = true
        // Simulate API call - in real app would use ViewModel
    }

    // Simulated search effect
    LaunchedEffect(searchQuery) {
        if (searchQuery.isNotBlank()) {
            delay(500)
            isSearching = false
            // Generate sample results
            results = (1..15).map { i ->
                StoreSearchItem(
                    id = i,
                    title = "${searchQuery}相关书籍 $i",
                    subtitle = "作者 $i",
                    badge = if (i % 3 == 0) "新上架" else null,
                    coverUrl = null,
                    type = if (i % 2 == 0) "ebook" else "magazine"
                )
            }
        } else {
            results = emptyList()
        }
    }

    val filteredResults = remember(results, selectedFilter) {
        when (selectedFilter) {
            SearchFilterType.ALL -> results
            SearchFilterType.EBOOK -> results.filter { it.type == "ebook" }
            SearchFilterType.MAGAZINE -> results.filter { it.type == "magazine" }
        }
    }

    val ebookCount = results.count { it.type == "ebook" }
    val magazineCount = results.count { it.type == "magazine" }

    Scaffold { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search header
            SearchHeader(
                searchQuery = searchQuery,
                onQueryChange = { searchQuery = it },
                onSearch = { performSearch() },
                onClear = {
                    searchQuery = ""
                    results = emptyList()
                    selectedFilter = SearchFilterType.ALL
                },
                onCancel = onNavigateBack,
                focusRequester = focusRequester
            )

            // Content based on state
            when {
                searchQuery.isEmpty() -> {
                    // Show suggestions
                    SearchSuggestionsView(
                        searchHistory = searchHistory,
                        hotSearches = hotSearches,
                        onHistoryClick = { term ->
                            searchQuery = term
                            performSearch()
                        },
                        onHotSearchClick = { term ->
                            searchQuery = term
                            performSearch()
                        },
                        onClearHistory = { searchHistory = emptyList() }
                    )
                }
                isSearching -> {
                    // Loading
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                results.isEmpty() -> {
                    // No results
                    EmptyResultsView()
                }
                else -> {
                    // Search results
                    SearchResultsView(
                        results = filteredResults,
                        totalCount = results.size,
                        ebookCount = ebookCount,
                        magazineCount = magazineCount,
                        selectedFilter = selectedFilter,
                        onFilterChange = { selectedFilter = it },
                        onItemClick = onItemClick
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchHeader(
    searchQuery: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onClear: () -> Unit,
    onCancel: () -> Unit,
    focusRequester: FocusRequester
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Search field
        Surface(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                BasicTextField(
                    value = searchQuery,
                    onValueChange = onQueryChange,
                    modifier = Modifier
                        .weight(1f)
                        .focusRequester(focusRequester),
                    textStyle = TextStyle(
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 16.sp
                    ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                    decorationBox = { innerTextField ->
                        Box {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "搜索书籍或杂志",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            innerTextField()
                        }
                    }
                )

                if (searchQuery.isNotEmpty()) {
                    IconButton(
                        onClick = onClear,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "清除",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        TextButton(onClick = onCancel) {
            Text("取消")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchSuggestionsView(
    searchHistory: List<String>,
    hotSearches: List<String>,
    onHistoryClick: (String) -> Unit,
    onHotSearchClick: (String) -> Unit,
    onClearHistory: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Search history
        if (searchHistory.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "搜索历史",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = onClearHistory) {
                    Text(
                        text = "清除历史",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                searchHistory.forEach { term ->
                    HistoryChip(text = term, onClick = { onHistoryClick(term) })
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Hot searches
        Text(
            text = "热门搜索",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(12.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            hotSearches.forEach { term ->
                HotSearchChip(text = term, onClick = { onHotSearchClick(term) })
            }
        }
    }
}

@Composable
private fun HistoryChip(
    text: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.History,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun HotSearchChip(
    text: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFFF9800).copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFFFF9800),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        )
    }
}

@Composable
private fun EmptyResultsView() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "未找到相关内容",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "请尝试其他关键词",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SearchResultsView(
    results: List<StoreSearchItem>,
    totalCount: Int,
    ebookCount: Int,
    magazineCount: Int,
    selectedFilter: SearchFilterType,
    onFilterChange: (SearchFilterType) -> Unit,
    onItemClick: (id: Int, type: String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Results count
        Text(
            text = "找到 $totalCount 个结果",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        // Filter tabs
        LazyRow(
            modifier = Modifier.padding(vertical = 8.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                FilterChip(
                    title = "全部",
                    count = totalCount,
                    isSelected = selectedFilter == SearchFilterType.ALL,
                    onClick = { onFilterChange(SearchFilterType.ALL) }
                )
            }
            item {
                FilterChip(
                    title = "电子书",
                    count = ebookCount,
                    isSelected = selectedFilter == SearchFilterType.EBOOK,
                    onClick = { onFilterChange(SearchFilterType.EBOOK) }
                )
            }
            item {
                FilterChip(
                    title = "杂志",
                    count = magazineCount,
                    isSelected = selectedFilter == SearchFilterType.MAGAZINE,
                    onClick = { onFilterChange(SearchFilterType.MAGAZINE) }
                )
            }
        }

        // Results list
        LazyColumn {
            items(results) { item ->
                SearchResultRow(
                    item = item,
                    onClick = { onItemClick(item.id, item.type) }
                )
                HorizontalDivider(
                    modifier = Modifier.padding(start = 90.dp)
                )
            }
        }
    }
}

@Composable
private fun FilterChip(
    title: String,
    count: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "($count)",
                style = MaterialTheme.typography.labelSmall,
                color = if (isSelected) Color.White.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SearchResultRow(
    item: StoreSearchItem,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Cover placeholder
        Surface(
            modifier = Modifier.size(60.dp, 80.dp),
            shape = RoundedCornerShape(4.dp),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = item.title.take(2),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            item.subtitle?.let { subtitle ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item.badge?.let { badge ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = badge,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
    }
}
