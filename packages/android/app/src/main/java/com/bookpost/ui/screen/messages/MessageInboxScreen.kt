package com.bookpost.ui.screen.messages

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Message inbox view with categories, swipe actions, and message details
 * Matches iOS MessageInboxView functionality
 */

enum class MessageCategory(
    val displayName: String,
    val icon: ImageVector,
    val color: Color
) {
    ALL("全部", Icons.Default.Inbox, Color(0xFF2196F3)),
    SOCIAL("互动", Icons.Default.Favorite, Color(0xFFE91E63)),
    ACTIVITY("活动", Icons.Default.Star, Color(0xFFFF9800)),
    SYSTEM("系统", Icons.Default.Notifications, Color(0xFF607D8B)),
    PROMOTION("推广", Icons.Default.CardGiftcard, Color(0xFF9C27B0))
}

data class InboxMessage(
    val id: String,
    val category: MessageCategory,
    val title: String,
    val content: String,
    val fullContent: String?,
    val timestamp: Long,
    var isRead: Boolean,
    val senderAvatarUrl: String?,
    val relatedBookTitle: String?,
    val actionTitle: String?
) {
    val timeAgo: String
        get() {
            val now = System.currentTimeMillis()
            val diff = now - timestamp
            val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
            val hours = TimeUnit.MILLISECONDS.toHours(diff)
            val days = TimeUnit.MILLISECONDS.toDays(diff)

            return when {
                minutes < 1 -> "刚刚"
                minutes < 60 -> "${minutes}分钟前"
                hours < 24 -> "${hours}小时前"
                days < 7 -> "${days}天前"
                else -> {
                    val format = SimpleDateFormat("MM/dd", Locale.getDefault())
                    format.format(Date(timestamp))
                }
            }
        }

    val formattedDate: String
        get() {
            val format = SimpleDateFormat("yyyy年MM月dd日 HH:mm", Locale.CHINA)
            return format.format(Date(timestamp))
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageInboxScreen(
    onNavigateBack: () -> Unit,
    onNavigateToBookDetail: (Int, String) -> Unit = { _, _ -> }
) {
    var selectedCategory by remember { mutableStateOf(MessageCategory.ALL) }
    var messages by remember { mutableStateOf(getSampleMessages()) }
    var selectedMessage by remember { mutableStateOf<InboxMessage?>(null) }
    var showMenu by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val detailSheetState = rememberModalBottomSheetState()

    val filteredMessages = remember(selectedCategory, messages) {
        if (selectedCategory == MessageCategory.ALL) {
            messages
        } else {
            messages.filter { it.category == selectedCategory }
        }
    }

    val unreadCounts = remember(messages) {
        MessageCategory.entries.associateWith { category ->
            if (category == MessageCategory.ALL) {
                messages.count { !it.isRead }
            } else {
                messages.count { !it.isRead && it.category == category }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("消息") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "更多")
                        }

                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("全部标为已读") },
                                onClick = {
                                    messages = messages.map { it.copy(isRead = true) }
                                    showMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("清除已读消息") },
                                onClick = {
                                    messages = messages.filter { !it.isRead }
                                    showMenu = false
                                }
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
            // Category tabs
            CategoryTabs(
                selectedCategory = selectedCategory,
                onCategorySelected = { selectedCategory = it },
                unreadCounts = unreadCounts
            )

            // Message list or empty state
            if (filteredMessages.isEmpty()) {
                EmptyMessageState()
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(
                        items = filteredMessages,
                        key = { it.id }
                    ) { message ->
                        MessageRow(
                            message = message,
                            onClick = {
                                // Mark as read
                                messages = messages.map {
                                    if (it.id == message.id) it.copy(isRead = true) else it
                                }
                                selectedMessage = message
                            },
                            onDelete = {
                                messages = messages.filter { it.id != message.id }
                            },
                            onToggleRead = {
                                messages = messages.map {
                                    if (it.id == message.id) it.copy(isRead = !it.isRead) else it
                                }
                            }
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }

    // Message detail bottom sheet
    selectedMessage?.let { message ->
        ModalBottomSheet(
            onDismissRequest = { selectedMessage = null },
            sheetState = detailSheetState
        ) {
            MessageDetailSheet(
                message = message,
                onDismiss = {
                    scope.launch {
                        detailSheetState.hide()
                        selectedMessage = null
                    }
                },
                onBookClick = { bookId, bookType ->
                    onNavigateToBookDetail(bookId, bookType)
                    selectedMessage = null
                }
            )
        }
    }
}

@Composable
private fun CategoryTabs(
    selectedCategory: MessageCategory,
    onCategorySelected: (MessageCategory) -> Unit,
    unreadCounts: Map<MessageCategory, Int>
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MessageCategory.entries.forEach { category ->
            val isSelected = selectedCategory == category
            val unreadCount = unreadCounts[category] ?: 0

            FilterChip(
                selected = isSelected,
                onClick = { onCategorySelected(category) },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(category.displayName)
                        if (unreadCount > 0 && !isSelected) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Badge(
                                containerColor = Color(0xFFF44336)
                            ) {
                                Text(
                                    text = if (unreadCount > 99) "99+" else "$unreadCount",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White
                                )
                            }
                        }
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF2196F3),
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MessageRow(
    message: InboxMessage,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onToggleRead: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            when (value) {
                SwipeToDismissBoxValue.EndToStart -> {
                    onDelete()
                    true
                }
                else -> false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF44336))
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Text(
                    text = "删除",
                    color = Color.White,
                    fontWeight = FontWeight.Medium
                )
            }
        },
        content = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.clickable(onClick = onClick)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .alpha(if (message.isRead) 0.7f else 1f),
                    verticalAlignment = Alignment.Top
                ) {
                    // Icon
                    Box {
                        Surface(
                            shape = CircleShape,
                            color = message.category.color.copy(alpha = 0.15f),
                            modifier = Modifier.size(44.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = message.category.icon,
                                    contentDescription = null,
                                    tint = message.category.color,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        // Unread indicator
                        if (!message.isRead) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(10.dp)
                                    .background(Color(0xFFF44336), CircleShape)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    // Content
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = message.title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (message.isRead) FontWeight.Normal else FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Text(
                                text = message.timeAgo,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = message.content,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )

                        // Related book
                        message.relatedBookTitle?.let { bookTitle ->
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Book,
                                    contentDescription = null,
                                    tint = Color(0xFF2196F3),
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = bookTitle,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF2196F3)
                                )
                            }
                        }
                    }
                }
            }
        }
    )
}

@Composable
private fun EmptyMessageState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Inbox,
            contentDescription = null,
            modifier = Modifier.size(60.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "暂无消息",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "互动消息和系统通知将显示在这里",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MessageDetailSheet(
    message: InboxMessage,
    onDismiss: () -> Unit,
    onBookClick: (Int, String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Header
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = message.category.color.copy(alpha = 0.15f),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = message.category.icon,
                        contentDescription = null,
                        tint = message.category.color,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = message.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = message.formattedDate,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

        // Content
        Text(
            text = message.fullContent ?: message.content,
            style = MaterialTheme.typography.bodyMedium,
            lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.5
        )

        // Related book card
        message.relatedBookTitle?.let { bookTitle ->
            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onBookClick(1, "ebook") }, // TODO: Pass actual book ID
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Cover placeholder
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.size(50.dp, 68.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Book,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = bookTitle,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "点击查看详情",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF2196F3)
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
        }

        // Action button
        message.actionTitle?.let { actionTitle ->
            Spacer(modifier = Modifier.height(20.dp))

            Surface(
                onClick = onDismiss,
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF2196F3),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = actionTitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    modifier = Modifier.padding(vertical = 14.dp),
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

private fun getSampleMessages(): List<InboxMessage> {
    val now = System.currentTimeMillis()
    return listOf(
        InboxMessage(
            id = "1",
            category = MessageCategory.SOCIAL,
            title = "小明 赞了你的书评",
            content = "你对《人类简史》的书评获得了一个赞",
            fullContent = "你发表的书评「这本书彻底改变了我对历史的看法...」获得了小明的赞，继续分享你的阅读感悟吧！",
            timestamp = now - TimeUnit.MINUTES.toMillis(5),
            isRead = false,
            senderAvatarUrl = null,
            relatedBookTitle = "人类简史",
            actionTitle = "查看书评"
        ),
        InboxMessage(
            id = "2",
            category = MessageCategory.SOCIAL,
            title = "书友回复了你的评论",
            content = "阅读达人回复：说得太对了，我也有同感...",
            fullContent = "阅读达人 回复了你在《三体》下的评论:\n\n\"说得太对了，我也有同感。刘慈欣的想象力真的太惊人了，每次重读都有新的发现。\"",
            timestamp = now - TimeUnit.HOURS.toMillis(1),
            isRead = false,
            senderAvatarUrl = null,
            relatedBookTitle = "三体",
            actionTitle = "回复"
        ),
        InboxMessage(
            id = "3",
            category = MessageCategory.ACTIVITY,
            title = "🎉 恭喜获得新徽章",
            content = "你已解锁「连续阅读7天」成就徽章",
            fullContent = "恭喜你！你已经连续阅读7天，成功解锁「坚持不懈」成就徽章！\n\n继续保持，下一个目标是连续阅读30天，加油！",
            timestamp = now - TimeUnit.HOURS.toMillis(2),
            isRead = true,
            senderAvatarUrl = null,
            relatedBookTitle = null,
            actionTitle = "查看徽章"
        ),
        InboxMessage(
            id = "4",
            category = MessageCategory.SYSTEM,
            title = "您关注的书籍已更新",
            content = "《技术的本质》已上架有声书版本",
            fullContent = "您收藏的《技术的本质》现已推出有声书版本，由专业主播朗读，让您随时随地享受阅读。\n\n会员用户可免费收听完整版本。",
            timestamp = now - TimeUnit.DAYS.toMillis(1),
            isRead = true,
            senderAvatarUrl = null,
            relatedBookTitle = "技术的本质",
            actionTitle = "立即收听"
        ),
        InboxMessage(
            id = "5",
            category = MessageCategory.PROMOTION,
            title = "限时特惠：年度会员5折",
            content = "新年特惠，年度会员限时5折优惠",
            fullContent = "🎊 新年特惠活动\n\n年度会员原价 ¥198，现仅需 ¥99！\n\n会员权益：\n• 全站电子书免费阅读\n• 有声书免费收听\n• 杂志免费订阅\n• 专属徽章和特权\n\n活动时间：即日起至1月31日",
            timestamp = now - TimeUnit.DAYS.toMillis(2),
            isRead = false,
            senderAvatarUrl = null,
            relatedBookTitle = null,
            actionTitle = "立即开通"
        ),
        InboxMessage(
            id = "6",
            category = MessageCategory.SOCIAL,
            title = "有新书友关注了你",
            content = "阅读爱好者 开始关注你",
            fullContent = "阅读爱好者 开始关注你了！\n\nTA也喜欢历史、传记类书籍，你们有共同的阅读爱好。",
            timestamp = now - TimeUnit.DAYS.toMillis(3),
            isRead = true,
            senderAvatarUrl = null,
            relatedBookTitle = null,
            actionTitle = "查看主页"
        )
    )
}
