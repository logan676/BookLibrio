package com.bookpost.ui.screen.friends

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.bookpost.data.remote.dto.ActivityItemDto
import com.bookpost.data.remote.dto.ActivityUserDto
import com.bookpost.data.remote.dto.UserProfileDto

/**
 * User Profile Screen
 * Displays another user's profile with their stats, activities, and follow functionality
 * Matches iOS UserProfileView functionality
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    userId: Int,
    onNavigateBack: () -> Unit,
    onNavigateToFollowers: (Int) -> Unit,
    onNavigateToFollowing: (Int) -> Unit,
    onNavigateToBookDetail: (Int, String) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var userProfile by remember { mutableStateOf<UserProfileDto?>(null) }
    var isFollowing by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableIntStateOf(0) }

    val tabs = listOf("动态", "书评", "书单")

    // Simulate loading user profile
    LaunchedEffect(userId) {
        kotlinx.coroutines.delay(500)
        userProfile = UserProfileDto(
            id = userId,
            username = "书虫小王",
            avatarUrl = null,
            bio = "热爱阅读，每天读书一小时",
            booksRead = 42,
            pagesRead = 12500,
            currentStreak = 15,
            longestStreak = 30,
            followersCount = 128,
            followingCount = 56,
            isFollowing = false
        )
        isFollowing = userProfile?.isFollowing ?: false
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(userProfile?.username ?: "用户主页") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { /* More options */ }) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "更多"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            userProfile?.let { profile ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
                    // Profile header
                    item {
                        ProfileHeader(
                            profile = profile,
                            isFollowing = isFollowing,
                            onFollowClick = {
                                isFollowing = !isFollowing
                            },
                            onFollowersClick = { onNavigateToFollowers(userId) },
                            onFollowingClick = { onNavigateToFollowing(userId) }
                        )
                    }

                    // Stats section
                    item {
                        StatsSection(profile = profile)
                    }

                    // Tab selector
                    item {
                        TabRow(
                            selectedTabIndex = selectedTab,
                            modifier = Modifier.padding(top = 8.dp)
                        ) {
                            tabs.forEachIndexed { index, title ->
                                Tab(
                                    selected = selectedTab == index,
                                    onClick = { selectedTab = index },
                                    text = {
                                        Text(
                                            text = title,
                                            fontWeight = if (selectedTab == index)
                                                FontWeight.SemiBold else FontWeight.Normal
                                        )
                                    }
                                )
                            }
                        }
                    }

                    // Content based on selected tab
                    when (selectedTab) {
                        0 -> {
                            // Activities
                            items(getSampleActivities(profile)) { activity ->
                                UserActivityCard(
                                    activity = activity,
                                    onBookClick = onNavigateToBookDetail
                                )
                            }
                        }
                        1 -> {
                            // Reviews placeholder
                            item {
                                EmptyStateContent(
                                    message = "暂无书评"
                                )
                            }
                        }
                        2 -> {
                            // Book lists placeholder
                            item {
                                EmptyStateContent(
                                    message = "暂无公开书单"
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileHeader(
    profile: UserProfileDto,
    isFollowing: Boolean,
    onFollowClick: () -> Unit,
    onFollowersClick: () -> Unit,
    onFollowingClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Avatar
        Surface(
            modifier = Modifier.size(80.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            if (profile.avatarUrl != null) {
                AsyncImage(
                    model = profile.avatarUrl,
                    contentDescription = profile.username,
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = profile.username.take(1).uppercase(),
                        style = MaterialTheme.typography.headlineLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Username
        Text(
            text = profile.username,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        // Bio
        profile.bio?.let { bio ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = bio,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Followers/Following counts
        Row(
            horizontalArrangement = Arrangement.spacedBy(32.dp)
        ) {
            CountColumn(
                count = profile.followersCount,
                label = "粉丝",
                onClick = onFollowersClick
            )
            CountColumn(
                count = profile.followingCount,
                label = "关注",
                onClick = onFollowingClick
            )
            CountColumn(
                count = profile.booksRead,
                label = "读过"
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Follow button
        if (isFollowing) {
            OutlinedButton(
                onClick = onFollowClick,
                modifier = Modifier.fillMaxWidth(0.6f)
            ) {
                Text("已关注")
            }
        } else {
            Button(
                onClick = onFollowClick,
                modifier = Modifier.fillMaxWidth(0.6f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text("关注")
            }
        }
    }
}

@Composable
private fun CountColumn(
    count: Int,
    label: String,
    onClick: (() -> Unit)? = null
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
    ) {
        Text(
            text = "$count",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun StatsSection(profile: UserProfileDto) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                icon = Icons.Default.MenuBook,
                value = "${profile.pagesRead}",
                label = "阅读页数"
            )
            StatItem(
                icon = Icons.Default.LocalFireDepartment,
                value = "${profile.currentStreak}",
                label = "连续天数"
            )
            StatItem(
                icon = Icons.Default.LocalFireDepartment,
                value = "${profile.longestStreak}",
                label = "最长连续"
            )
        }
    }
}

@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun UserActivityCard(
    activity: ActivityItemDto,
    onBookClick: (Int, String) -> Unit
) {
    var isLiked by remember { mutableStateOf(activity.isLiked) }
    var likesCount by remember { mutableIntStateOf(activity.likesCount) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
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

            Spacer(modifier = Modifier.height(8.dp))

            // Timestamp and actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = activity.createdAt ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Like button
                    Row(
                        modifier = Modifier.clickable {
                            isLiked = !isLiked
                            likesCount += if (isLiked) 1 else -1
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
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyStateContent(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun getSampleActivities(profile: UserProfileDto): List<ActivityItemDto> {
    return listOf(
        ActivityItemDto(
            id = 1,
            userId = profile.id,
            activityType = "finished_book",
            bookId = 1,
            bookType = "ebook",
            bookTitle = "活着",
            likesCount = 12,
            isLiked = false,
            createdAt = "2小时前",
            user = ActivityUserDto(profile.id, profile.username, profile.avatarUrl)
        ),
        ActivityItemDto(
            id = 2,
            userId = profile.id,
            activityType = "started_reading",
            bookId = 2,
            bookType = "ebook",
            bookTitle = "三体",
            likesCount = 8,
            isLiked = true,
            createdAt = "1天前",
            user = ActivityUserDto(profile.id, profile.username, profile.avatarUrl)
        ),
        ActivityItemDto(
            id = 3,
            userId = profile.id,
            activityType = "earned_badge",
            badgeId = 1,
            badgeName = "阅读达人",
            likesCount = 24,
            isLiked = false,
            createdAt = "3天前",
            user = ActivityUserDto(profile.id, profile.username, profile.avatarUrl)
        )
    )
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
