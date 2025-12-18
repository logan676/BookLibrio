package com.bookpost.ui.screen.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.bookpost.data.remote.dto.ActivityItemDto
import com.bookpost.data.remote.dto.FollowUserDto
import com.bookpost.data.remote.dto.TrendingTopicDto
import kotlinx.coroutines.launch

/**
 * Friends/Social Tab Screen
 * Displays activity feed from followed users, discover new users, and trending topics
 * Matches iOS FriendsTabView functionality
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToUserProfile: (Int) -> Unit,
    onNavigateToPublishThought: () -> Unit,
    onNavigateToBookDetail: (Int, String) -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { 3 })
    val scope = rememberCoroutineScope()
    val tabs = listOf("关注", "发现", "热门")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("书友") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToPublishThought,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "发布想法"
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab selector
            TabRow(
                selectedTabIndex = pagerState.currentPage
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            scope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        },
                        text = {
                            Text(
                                text = title,
                                fontWeight = if (pagerState.currentPage == index)
                                    FontWeight.SemiBold else FontWeight.Normal
                            )
                        }
                    )
                }
            }

            // Content pager
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (page) {
                    0 -> FollowingFeedTab(
                        onUserClick = onNavigateToUserProfile,
                        onBookClick = onNavigateToBookDetail
                    )
                    1 -> DiscoverFeedTab(
                        onUserClick = onNavigateToUserProfile,
                        onBookClick = onNavigateToBookDetail
                    )
                    2 -> TrendingTopicsTab(
                        onBookClick = onNavigateToBookDetail
                    )
                }
            }
        }
    }
}

@Composable
private fun FollowingFeedTab(
    onUserClick: (Int) -> Unit,
    onBookClick: (Int, String) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    val activities = remember { mutableStateListOf<ActivityItemDto>() }

    // Simulated loading
    LaunchedEffect(Unit) {
        // In real implementation, call API here
        kotlinx.coroutines.delay(500)
        isLoading = false
    }

    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else if (activities.isEmpty()) {
        EmptyFeedState(
            icon = Icons.Default.PersonAdd,
            title = "关注更多书友",
            subtitle = "关注其他读者，看看他们在读什么书",
            actionText = "发现书友"
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(activities) { activity ->
                ActivityCard(
                    activity = activity,
                    onUserClick = { onUserClick(activity.user.id) },
                    onBookClick = { bookId, type ->
                        onBookClick(bookId, type)
                    },
                    onLikeClick = { /* Handle like */ }
                )
            }
        }
    }
}

@Composable
private fun DiscoverFeedTab(
    onUserClick: (Int) -> Unit,
    onBookClick: (Int, String) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    val activities = remember { mutableStateListOf<ActivityItemDto>() }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(500)
        isLoading = false
    }

    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else if (activities.isEmpty()) {
        EmptyFeedState(
            icon = Icons.Default.TrendingUp,
            title = "暂无发现内容",
            subtitle = "稍后再来看看吧"
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(activities) { activity ->
                ActivityCard(
                    activity = activity,
                    onUserClick = { onUserClick(activity.user.id) },
                    onBookClick = onBookClick,
                    onLikeClick = { /* Handle like */ }
                )
            }
        }
    }
}

@Composable
private fun TrendingTopicsTab(
    onBookClick: (Int, String) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    val topics = remember {
        mutableStateListOf(
            TrendingTopicDto(1, "2024年度好书推荐", 1234),
            TrendingTopicDto(2, "科幻小说入门指南", 892),
            TrendingTopicDto(3, "读书笔记怎么做", 756),
            TrendingTopicDto(4, "历史类书籍推荐", 634),
            TrendingTopicDto(5, "心理学经典书单", 521)
        )
    }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(300)
        isLoading = false
    }

    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hot discussions section
            item {
                HotDiscussionsSection(topics = topics)
            }

            // Trending books section
            item {
                TrendingBooksSection(onBookClick = onBookClick)
            }
        }
    }
}

@Composable
private fun HotDiscussionsSection(topics: List<TrendingTopicDto>) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.LocalFireDepartment,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "热门话题",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column {
                topics.forEachIndexed { index, topic ->
                    TopicRow(
                        rank = index + 1,
                        topic = topic,
                        onClick = { /* Navigate to topic */ }
                    )
                    if (index < topics.size - 1) {
                        androidx.compose.material3.HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TopicRow(
    rank: Int,
    topic: TrendingTopicDto,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$rank",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (rank <= 3) MaterialTheme.colorScheme.error
            else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(24.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = topic.title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "${topic.discussionCount}人参与讨论",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .size(16.dp)
                .then(Modifier) // Flip horizontally for right arrow
        )
    }
}

@Composable
private fun TrendingBooksSection(onBookClick: (Int, String) -> Unit) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.TrendingUp,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "热议书籍",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(5) { index ->
                TrendingBookCard(
                    title = "示例书籍 ${index + 1}",
                    coverUrl = null,
                    onClick = { onBookClick(index + 1, "ebook") }
                )
            }
        }
    }
}

@Composable
private fun TrendingBookCard(
    title: String,
    coverUrl: String?,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(100.dp)
            .clickable(onClick = onClick)
    ) {
        // Book cover
        Surface(
            modifier = Modifier
                .size(100.dp, 140.dp)
                .clip(RoundedCornerShape(6.dp)),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            if (coverUrl != null) {
                AsyncImage(
                    model = coverUrl,
                    contentDescription = title,
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Book,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Outlined.ChatBubbleOutline,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "热议中",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun ActivityCard(
    activity: ActivityItemDto,
    onUserClick: () -> Unit,
    onBookClick: (Int, String) -> Unit,
    onLikeClick: () -> Unit
) {
    var isLiked by remember { mutableStateOf(activity.isLiked) }
    var likesCount by remember { mutableIntStateOf(activity.likesCount) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // User header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable(onClick = onUserClick)
            ) {
                // Avatar
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    if (activity.user.avatarUrl != null) {
                        AsyncImage(
                            model = activity.user.avatarUrl,
                            contentDescription = activity.user.username,
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = activity.user.username.take(1).uppercase(),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = activity.user.username,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    activity.createdAt?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Activity type icon
                Icon(
                    imageVector = getActivityIcon(activity.activityType),
                    contentDescription = null,
                    tint = getActivityColor(activity.activityType),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Activity description
            Text(
                text = getActivityDescription(activity),
                style = MaterialTheme.typography.bodyMedium
            )

            // Book link if applicable
            if (activity.bookId != null && activity.bookTitle != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    modifier = Modifier
                        .clickable {
                            onBookClick(activity.bookId, activity.bookType ?: "ebook")
                        },
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Book,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = activity.bookTitle,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Like button
                Row(
                    modifier = Modifier.clickable {
                        isLiked = !isLiked
                        likesCount += if (isLiked) 1 else -1
                        onLikeClick()
                    },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Like",
                        modifier = Modifier.size(18.dp),
                        tint = if (isLiked) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "$likesCount",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Comment button
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ChatBubbleOutline,
                        contentDescription = "Comment",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "评论",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyFeedState(
    icon: ImageVector,
    title: String,
    subtitle: String,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        if (actionText != null && onAction != null) {
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text(actionText)
            }
        }
    }
}

private fun getActivityIcon(activityType: String): ImageVector {
    return when (activityType) {
        "started_reading" -> Icons.Default.Book
        "finished_book" -> Icons.Default.Book
        "earned_badge" -> Icons.Default.Person
        "wrote_review" -> Icons.Default.Edit
        else -> Icons.Default.Person
    }
}

@Composable
private fun getActivityColor(activityType: String): androidx.compose.ui.graphics.Color {
    return when (activityType) {
        "started_reading" -> MaterialTheme.colorScheme.primary
        "finished_book" -> MaterialTheme.colorScheme.tertiary
        "earned_badge" -> MaterialTheme.colorScheme.error
        "wrote_review" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

private fun getActivityDescription(activity: ActivityItemDto): String {
    return when (activity.activityType) {
        "started_reading" -> "开始阅读《${activity.bookTitle ?: ""}》"
        "finished_book" -> "读完了《${activity.bookTitle ?: ""}》"
        "earned_badge" -> "获得了「${activity.badgeName ?: ""}」徽章"
        "wrote_review" -> "发表了书评"
        "reading_progress" -> "阅读了 ${activity.pagesRead ?: 0} 页"
        else -> activity.content ?: ""
    }
}
