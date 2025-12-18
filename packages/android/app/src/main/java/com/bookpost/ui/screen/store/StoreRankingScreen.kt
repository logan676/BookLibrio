package com.bookpost.ui.screen.store

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * Full-screen ranking view showing top books
 * with different ranking categories (hot, new, trending)
 * Matches iOS StoreRankingView functionality
 */

data class RankingItem(
    val id: Int,
    val title: String,
    val subtitle: String?,
    val badge: String?,
    val coverUrl: String?,
    val type: String
)

enum class RankingType(
    val displayName: String,
    val icon: ImageVector,
    val color: Color
) {
    HOT("热门榜", Icons.Default.LocalFireDepartment, Color(0xFFFF9800)),
    NEW("新书榜", Icons.Default.NewReleases, Color(0xFF2196F3)),
    TRENDING("飙升榜", Icons.AutoMirrored.Filled.TrendingUp, Color(0xFF4CAF50))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreRankingScreen(
    onNavigateBack: () -> Unit,
    onItemClick: (id: Int, type: String) -> Unit
) {
    var selectedType by remember { mutableStateOf(RankingType.HOT) }
    var isLoading by remember { mutableStateOf(true) }
    var items by remember { mutableStateOf<List<RankingItem>>(emptyList()) }
    var isRefreshing by remember { mutableStateOf(false) }

    // Load rankings
    LaunchedEffect(selectedType) {
        isLoading = true
        delay(800)
        items = (1..20).map { i ->
            RankingItem(
                id = i,
                title = when (selectedType) {
                    RankingType.HOT -> "热门书籍 $i"
                    RankingType.NEW -> "新书推荐 $i"
                    RankingType.TRENDING -> "飙升作品 $i"
                },
                subtitle = "作者 $i",
                badge = when {
                    i <= 3 -> "本周畅销"
                    i % 5 == 0 -> "限时优惠"
                    else -> null
                },
                coverUrl = null,
                type = if (i % 3 == 0) "magazine" else "ebook"
            )
        }
        isLoading = false
    }

    // Refresh function
    suspend fun refresh() {
        isRefreshing = true
        delay(1000)
        // Shuffle items to simulate refresh
        items = items.shuffled()
        isRefreshing = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("排行榜") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                },
                actions = {
                    TextButton(onClick = onNavigateBack) {
                        Text("完成")
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
            // Ranking type tabs
            RankingTypeTabs(
                selectedType = selectedType,
                onTypeSelected = { selectedType = it }
            )

            // Content
            when {
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                items.isEmpty() -> {
                    EmptyRankingState()
                }
                else -> {
                    PullToRefreshBox(
                        isRefreshing = isRefreshing,
                        onRefresh = {
                            kotlinx.coroutines.MainScope().launch {
                                refresh()
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    ) {
                        RankingList(
                            items = items,
                            onItemClick = onItemClick
                        )
                    }
                }
            }
        }
    }
}

// Need to import for MainScope
private fun kotlinx.coroutines.CoroutineScope.launch(block: suspend () -> Unit) {
    kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.Main) {
        block()
    }
}

@Composable
private fun RankingTypeTabs(
    selectedType: RankingType,
    onTypeSelected: (RankingType) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        RankingType.entries.forEach { type ->
            RankingTabButton(
                type = type,
                isSelected = selectedType == type,
                onClick = { onTypeSelected(type) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun RankingTabButton(
    type: RankingType,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = type.icon,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = if (isSelected) type.color else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = type.displayName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) type.color else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Selection indicator
        Surface(
            modifier = Modifier
                .height(2.dp)
                .fillMaxWidth(0.6f),
            color = if (isSelected) type.color else Color.Transparent
        ) {}
    }
}

@Composable
private fun RankingList(
    items: List<RankingItem>,
    onItemClick: (id: Int, type: String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)
    ) {
        itemsIndexed(items) { index, item ->
            RankingRow(
                rank = index + 1,
                item = item,
                onClick = { onItemClick(item.id, item.type) }
            )

            if (index < items.lastIndex) {
                HorizontalDivider(
                    modifier = Modifier.padding(start = 72.dp)
                )
            }
        }
    }
}

@Composable
private fun RankingRow(
    rank: Int,
    item: RankingItem,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Rank badge
        RankBadge(rank = rank)

        Spacer(modifier = Modifier.width(16.dp))

        // Cover placeholder
        Surface(
            modifier = Modifier.size(50.dp, 66.dp),
            shape = RoundedCornerShape(4.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            shadowElevation = 2.dp
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
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

@Composable
private fun RankBadge(rank: Int) {
    Box(
        modifier = Modifier.size(40.dp),
        contentAlignment = Alignment.Center
    ) {
        if (rank <= 3) {
            // Medal for top 3
            val color = when (rank) {
                1 -> Color(0xFFFFD700) // Gold
                2 -> Color(0xFFC0C0C0) // Silver
                else -> Color(0xFFCD7F32) // Bronze
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.2f)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .padding(4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$rank",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = color
                    )
                }
            }
        } else {
            Text(
                text = "$rank",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun EmptyRankingState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.LocalFireDepartment,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "暂无排行数据",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
