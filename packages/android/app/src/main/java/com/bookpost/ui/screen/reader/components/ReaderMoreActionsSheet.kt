package com.bookpost.ui.screen.reader.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Highlight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.PlaylistAdd
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Reader action types matching iOS ReaderMoreActionsSheet
 */
enum class ReaderActionType(
    val displayName: String,
    val icon: ImageVector,
    val tintColor: Color
) {
    REVIEW_BOOK("评价书籍", Icons.Default.Star, Color(0xFFFF9800)),
    DOWNLOAD_OFFLINE("下载离线", Icons.Default.CloudDownload, Color(0xFF2196F3)),
    AUTO_PAGE_TURN("自动翻页", Icons.Default.PlayCircle, Color(0xFF4CAF50)),
    ADD_BOOKMARK("添加书签", Icons.Default.BookmarkAdd, Color(0xFFFFEB3B)),
    ADD_TO_LIST("加入书单", Icons.Default.PlaylistAdd, Color(0xFF9C27B0)),
    SEARCH_BOOK("搜索内容", Icons.Default.Search, Color(0xFF607D8B)),
    VIEW_NOTES("查看笔记", Icons.Default.TextFields, Color(0xFF26A69A)),
    POPULAR_HIGHLIGHTS("热门划线", Icons.Default.Highlight, Color(0xFFE91E63)),
    GIFT_TO_FRIEND("赠送好友", Icons.Default.CardGiftcard, Color(0xFFF44336)),
    REPORT_ERROR("报告错误", Icons.Default.BugReport, Color(0xFFFF9800)),
    PRIVATE_READING("隐私阅读", Icons.Default.VisibilityOff, Color(0xFF3F51B5)),
    COMMUNITY_THOUGHTS("社区想法", Icons.Default.Forum, Color(0xFF009688)),
    FRIEND_NOTES("好友笔记", Icons.Default.Group, Color(0xFF00BCD4)),
    DISPLAY_SETTINGS("显示设置", Icons.Default.TextFields, Color(0xFF2196F3))
}

/**
 * Comprehensive action sheet for reader view
 * Provides quick access to all reader features
 * Matches iOS ReaderMoreActionsSheet functionality
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReaderMoreActionsSheet(
    bookType: String,
    bookId: Int,
    bookTitle: String,
    isDownloaded: Boolean = false,
    isAutoPageTurnEnabled: Boolean = false,
    isPrivateReading: Boolean = false,
    showCommunityThoughts: Boolean = true,
    showFriendNotes: Boolean = true,
    onReviewBook: () -> Unit = {},
    onDownloadOffline: () -> Unit = {},
    onAutoPageTurnToggle: (Boolean) -> Unit = {},
    onAddBookmark: () -> Unit = {},
    onAddToList: () -> Unit = {},
    onSearchBook: () -> Unit = {},
    onViewNotes: () -> Unit = {},
    onPopularHighlights: () -> Unit = {},
    onGiftToFriend: () -> Unit = {},
    onReportError: () -> Unit = {},
    onPrivateReadingToggle: (Boolean) -> Unit = {},
    onCommunityThoughtsToggle: (Boolean) -> Unit = {},
    onFriendNotesToggle: (Boolean) -> Unit = {},
    onDisplaySettings: () -> Unit = {},
    onQuickRating: (Int) -> Unit = {},
    onDismiss: () -> Unit
) {
    var isDownloading by remember { mutableStateOf(false) }
    var localAutoPageTurn by remember { mutableStateOf(isAutoPageTurnEnabled) }
    var localPrivateReading by remember { mutableStateOf(isPrivateReading) }
    var localCommunityThoughts by remember { mutableStateOf(showCommunityThoughts) }
    var localFriendNotes by remember { mutableStateOf(showFriendNotes) }
    var quickRating by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Title
        Text(
            text = "更多操作",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Quick Rating Section
        QuickRatingSection(
            currentRating = quickRating,
            onRatingChange = { rating ->
                quickRating = rating
                onQuickRating(rating)
            },
            onWriteReview = onReviewBook
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

        // Quick Actions Grid
        Text(
            text = "快捷操作",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(12.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            // Add Bookmark
            ActionButton(
                action = ReaderActionType.ADD_BOOKMARK,
                onClick = {
                    onAddBookmark()
                    onDismiss()
                }
            )

            // Add to List
            ActionButton(
                action = ReaderActionType.ADD_TO_LIST,
                onClick = {
                    onAddToList()
                    onDismiss()
                }
            )

            // Search
            ActionButton(
                action = ReaderActionType.SEARCH_BOOK,
                onClick = {
                    onSearchBook()
                    onDismiss()
                }
            )

            // View Notes
            ActionButton(
                action = ReaderActionType.VIEW_NOTES,
                onClick = {
                    onViewNotes()
                    onDismiss()
                }
            )

            // Popular Highlights
            ActionButton(
                action = ReaderActionType.POPULAR_HIGHLIGHTS,
                onClick = {
                    onPopularHighlights()
                    onDismiss()
                }
            )

            // Display Settings
            ActionButton(
                action = ReaderActionType.DISPLAY_SETTINGS,
                onClick = {
                    onDisplaySettings()
                    onDismiss()
                }
            )

            // Download Offline
            DownloadButton(
                isDownloaded = isDownloaded,
                isDownloading = isDownloading,
                onClick = {
                    if (!isDownloaded && !isDownloading) {
                        isDownloading = true
                        onDownloadOffline()
                        // Simulating download - in real app, this would be async
                    }
                }
            )

            // Gift to Friend
            ActionButton(
                action = ReaderActionType.GIFT_TO_FRIEND,
                onClick = {
                    onGiftToFriend()
                    onDismiss()
                }
            )
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

        // Reading Mode Toggles Section
        Text(
            text = "阅读模式",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(12.dp))

        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {
            Column {
                // Auto Page Turn Toggle
                ToggleRow(
                    icon = Icons.Default.PlayCircle,
                    title = "自动翻页",
                    subtitle = "自动滚动阅读",
                    isEnabled = localAutoPageTurn,
                    tintColor = Color(0xFF4CAF50),
                    onToggle = {
                        localAutoPageTurn = it
                        onAutoPageTurnToggle(it)
                    }
                )

                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                // Private Reading Toggle
                ToggleRow(
                    icon = Icons.Default.VisibilityOff,
                    title = "隐私阅读",
                    subtitle = "不记录阅读历史",
                    isEnabled = localPrivateReading,
                    tintColor = Color(0xFF3F51B5),
                    onToggle = {
                        localPrivateReading = it
                        onPrivateReadingToggle(it)
                    }
                )

                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                // Community Thoughts Toggle
                ToggleRow(
                    icon = Icons.Default.Forum,
                    title = "社区想法",
                    subtitle = "显示其他读者的想法",
                    isEnabled = localCommunityThoughts,
                    tintColor = Color(0xFF009688),
                    onToggle = {
                        localCommunityThoughts = it
                        onCommunityThoughtsToggle(it)
                    }
                )

                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                // Friend Notes Toggle
                ToggleRow(
                    icon = Icons.Default.Group,
                    title = "好友笔记",
                    subtitle = "显示好友的笔记和划线",
                    isEnabled = localFriendNotes,
                    tintColor = Color(0xFF00BCD4),
                    onToggle = {
                        localFriendNotes = it
                        onFriendNotesToggle(it)
                    }
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

        // Utility Section
        Text(
            text = "更多",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(12.dp))

        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {
            Column {
                // Report Error
                UtilityRow(
                    icon = Icons.Default.BugReport,
                    title = "报告错误",
                    subtitle = "反馈内容问题",
                    tintColor = Color(0xFFFF9800),
                    onClick = {
                        onReportError()
                        onDismiss()
                    }
                )

                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                // Book Info
                UtilityRow(
                    icon = Icons.Default.Info,
                    title = "书籍信息",
                    subtitle = "查看详细信息",
                    tintColor = Color(0xFF607D8B),
                    onClick = onDismiss
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun QuickRatingSection(
    currentRating: Int,
    onRatingChange: (Int) -> Unit,
    onWriteReview: () -> Unit
) {
    Column {
        Text(
            text = "快速评分",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Star rating
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                (1..5).forEach { rating ->
                    Icon(
                        imageVector = if (rating <= currentRating) Icons.Default.Star else Icons.Default.StarOutline,
                        contentDescription = "评分 $rating",
                        tint = if (rating <= currentRating) Color(0xFFFF9800) else Color(0xFFFFCC80),
                        modifier = Modifier
                            .size(32.dp)
                            .clickable { onRatingChange(rating) }
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            TextButton(onClick = onWriteReview) {
                Text("写评论")
            }
        }
    }
}

@Composable
private fun ActionButton(
    action: ReaderActionType,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(72.dp)
            .clickable(onClick = onClick)
    ) {
        Surface(
            shape = CircleShape,
            color = action.tintColor.copy(alpha = if (isActive) 0.2f else 0.1f),
            modifier = Modifier.size(50.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = action.icon,
                    contentDescription = action.displayName,
                    tint = action.tintColor,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = action.displayName,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 2
        )
    }
}

@Composable
private fun DownloadButton(
    isDownloaded: Boolean,
    isDownloading: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(72.dp)
            .clickable(enabled = !isDownloaded && !isDownloading, onClick = onClick)
    ) {
        Surface(
            shape = CircleShape,
            color = Color(0xFF2196F3).copy(alpha = if (isDownloaded) 0.2f else 0.1f),
            modifier = Modifier.size(50.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                when {
                    isDownloading -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    }
                    isDownloaded -> {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "已下载",
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    else -> {
                        Icon(
                            imageVector = Icons.Default.CloudDownload,
                            contentDescription = "下载离线",
                            tint = Color(0xFF2196F3),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = if (isDownloaded) "已下载" else "下载离线",
            style = MaterialTheme.typography.labelSmall,
            maxLines = 2
        )
    }
}

@Composable
private fun ToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isEnabled: Boolean,
    tintColor: Color,
    onToggle: (Boolean) -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tintColor,
            modifier = Modifier.size(24.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Switch(
            checked = isEnabled,
            onCheckedChange = onToggle
        )
    }
}

@Composable
private fun UtilityRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    tintColor: Color,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tintColor,
            modifier = Modifier.size(24.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
    }
}
