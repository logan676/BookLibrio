package com.bookpost.ui.screen.badges

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.domain.model.BadgeCategory
import com.bookpost.domain.model.BadgeItem
import com.bookpost.domain.model.BadgeProgress
import com.bookpost.domain.model.BadgeRarity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(
    onNavigateBack: () -> Unit,
    onBadgeClick: (BadgeItem) -> Unit = {},
    viewModel: BadgesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedCategory by remember { mutableStateOf<BadgeCategory?>(null) }

    // New badge alert dialog
    if (uiState.showNewBadgeAlert && uiState.newBadges.isNotEmpty()) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissNewBadgeAlert() },
            title = { Text("🎉 新徽章获得!") },
            text = {
                Column {
                    uiState.newBadges.forEach { badge ->
                        Text("• ${badge.name}")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.dismissNewBadgeAlert() }) {
                    Text("太棒了!")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("我的徽章") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.loadBadges() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Summary card - full width
                item(span = { GridItemSpan(3) }) {
                    BadgeSummaryCard(
                        totalEarned = uiState.totalEarned,
                        totalBadges = uiState.totalBadges,
                        percentage = uiState.earnedPercentage
                    )
                }

                // Category selector - full width
                item(span = { GridItemSpan(3) }) {
                    CategorySelector(
                        categories = uiState.sortedCategories,
                        selectedCategory = selectedCategory,
                        categorySummaries = uiState.categorySummaries,
                        onCategorySelected = { selectedCategory = it }
                    )
                }

                // Badge sections
                val (earnedItems, inProgressItems) = if (selectedCategory != null) {
                    viewModel.getBadgeItemsForCategory(selectedCategory!!)
                } else {
                    Pair(viewModel.getEarnedBadgeItems(), viewModel.getInProgressBadgeItems())
                }

                // Earned section header
                if (earnedItems.isNotEmpty()) {
                    item(span = { GridItemSpan(3) }) {
                        Text(
                            text = "已获得",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                        )
                    }

                    items(earnedItems) { badge ->
                        BadgeCard(
                            badge = badge,
                            onClick = { onBadgeClick(badge) }
                        )
                    }
                }

                // In progress section header
                if (inProgressItems.isNotEmpty()) {
                    item(span = { GridItemSpan(3) }) {
                        Text(
                            text = "进行中",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                        )
                    }

                    items(inProgressItems) { badge ->
                        BadgeCard(
                            badge = badge,
                            onClick = { onBadgeClick(badge) }
                        )
                    }
                }

                // Empty state
                if (earnedItems.isEmpty() && inProgressItems.isEmpty() && !uiState.isLoading) {
                    item(span = { GridItemSpan(3) }) {
                        Text(
                            text = "暂无徽章",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp)
                        )
                    }
                }

                // Bottom spacer
                item(span = { GridItemSpan(3) }) {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun BadgeSummaryCard(
    totalEarned: Int,
    totalBadges: Int,
    percentage: Double
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (percentage / 100).toFloat().coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 500),
        label = "progress"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "徽章收集",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        text = "$totalEarned",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = " / $totalBadges",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
            }

            // Progress ring
            Box(
                modifier = Modifier.size(60.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    progress = { 1f },
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    strokeWidth = 6.dp,
                    strokeCap = StrokeCap.Round
                )
                CircularProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFFF9800),
                    strokeWidth = 6.dp,
                    strokeCap = StrokeCap.Round
                )
                Text(
                    text = "${percentage.toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun CategorySelector(
    categories: List<BadgeCategory>,
    selectedCategory: BadgeCategory?,
    categorySummaries: Map<String, com.bookpost.domain.model.CategorySummary>,
    onCategorySelected: (BadgeCategory?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // "All" chip
        FilterChip(
            selected = selectedCategory == null,
            onClick = { onCategorySelected(null) },
            label = { Text("全部") },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = Color(0xFFFF9800),
                selectedLabelColor = Color.White
            )
        )

        // Category chips
        categories.forEach { category ->
            val summary = categorySummaries[category.value]
            FilterChip(
                selected = selectedCategory == category,
                onClick = { onCategorySelected(category) },
                label = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(category.displayName)
                        summary?.let {
                            Text(
                                text = "${it.earned}/${it.total}",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (selectedCategory == category) {
                                    Color.White.copy(alpha = 0.8f)
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = category.color,
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}

@Composable
private fun BadgeCard(
    badge: BadgeItem,
    onClick: () -> Unit
) {
    val isEarned = badge is BadgeItem.Earned

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEarned) {
                MaterialTheme.colorScheme.surface
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Badge icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(
                        if (isEarned) {
                            badge.badgeCategory.color
                        } else {
                            badge.badgeCategory.color.copy(alpha = 0.3f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                // Level indicator
                Text(
                    text = "Lv${badge.level}",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Badge name
            Text(
                text = badge.name,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Progress or date
            when (badge) {
                is BadgeItem.Earned -> {
                    // Show earned date
                    Text(
                        text = badge.earnedAt.take(10),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                is BadgeItem.InProgress -> {
                    // Show progress
                    Spacer(modifier = Modifier.height(4.dp))
                    ProgressIndicator(progress = badge.progress)
                }
            }
        }
    }
}

@Composable
private fun ProgressIndicator(progress: BadgeProgress) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        LinearProgressIndicator(
            progress = { (progress.percentage / 100).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp)),
            color = Color(0xFFFF9800),
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "${progress.current}/${progress.target}",
            style = MaterialTheme.typography.labelSmall,
            color = Color(0xFFFF9800),
            fontWeight = FontWeight.Medium
        )
    }
}
