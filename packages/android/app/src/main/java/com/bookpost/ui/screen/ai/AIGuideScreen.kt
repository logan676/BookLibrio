package com.bookpost.ui.screen.ai

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FormatQuote
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LocalLibrary
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * AI Guide Screen - Shows AI-generated book introduction with topic cards
 * Provides quick insights into key themes, characters, and concepts
 * Matches iOS AIGuideView functionality
 */

data class AIGuideTopic(
    val id: String,
    val title: String,
    val subtitle: String,
    val content: String,
    val iconName: ImageVector,
    val color: Color,
    val relatedChapters: List<String> = emptyList()
)

data class CelebrityQuote(
    val name: String,
    val title: String,
    val quote: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIGuideScreen(
    bookId: Int,
    bookTitle: String,
    onNavigateBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var guideTopics by remember { mutableStateOf<List<AIGuideTopic>>(emptyList()) }
    var expandedTopicId by remember { mutableStateOf<String?>(null) }

    // Simulated data loading
    LaunchedEffect(bookId) {
        delay(1000)
        guideTopics = listOf(
            AIGuideTopic(
                id = "1",
                title = "命运与抗争",
                subtitle = "探索主人公如何面对命运的安排",
                content = "本书核心主题之一是对命运的思考。主人公从最初的顺从到后来的觉醒，展现了人类精神的韧性。作者通过细腻的笔触，描绘了一个普通人在时代洪流中的挣扎与坚守。",
                iconName = Icons.Default.TrendingUp,
                color = Color(0xFF2196F3),
                relatedChapters = listOf("第3章", "第7章", "第12章")
            ),
            AIGuideTopic(
                id = "2",
                title = "亲情与羁绊",
                subtitle = "家庭关系中的爱与牺牲",
                content = "家庭是本书的另一条重要线索。通过三代人的故事，作者展现了中国家庭特有的情感纽带。父母对子女的期望、子女对父母的理解，构成了感人至深的情感画卷。",
                iconName = Icons.Default.Group,
                color = Color(0xFFE91E63),
                relatedChapters = listOf("第5章", "第9章")
            ),
            AIGuideTopic(
                id = "3",
                title = "时代印记",
                subtitle = "历史背景下的个人命运",
                content = "故事跨越了中国近现代几个重要历史时期。作者巧妙地将个人命运与时代变迁结合，让读者在阅读中感受历史的厚重，思考个人与时代的关系。",
                iconName = Icons.Default.Timeline,
                color = Color(0xFFFF9800),
                relatedChapters = listOf("第1章", "第8章", "第15章")
            ),
            AIGuideTopic(
                id = "4",
                title = "成长与蜕变",
                subtitle = "人物的心理转变历程",
                content = "主人公的成长是一个渐进的过程。从懵懂少年到成熟个体，每一次挫折都成为成长的契机。这种成长不仅是年龄的增长，更是心智的成熟。",
                iconName = Icons.Default.TrendingUp,
                color = Color(0xFF4CAF50),
                relatedChapters = listOf("第4章", "第10章", "第14章")
            )
        )
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI导读") },
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
                .verticalScroll(rememberScrollState())
        ) {
            // Header section
            HeaderSection(bookTitle = bookTitle)

            Spacer(modifier = Modifier.height(24.dp))

            // Quick insights section
            QuickInsightsSection(isLoading = isLoading)

            Spacer(modifier = Modifier.height(24.dp))

            // Topic cards section
            TopicCardsSection(
                isLoading = isLoading,
                topics = guideTopics,
                expandedTopicId = expandedTopicId,
                onTopicClick = { topicId ->
                    expandedTopicId = if (expandedTopicId == topicId) null else topicId
                }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Celebrity recommendations
            CelebrityRecsSection(isLoading = isLoading)

            Spacer(modifier = Modifier.height(24.dp))

            // Reading suggestions
            ReadingSuggestionsSection(isLoading = isLoading)

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun HeaderSection(bookTitle: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // AI badge
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF9C27B0).copy(alpha = 0.1f)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = Color(0xFF9C27B0),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "AI 智能导读",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF9C27B0)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "《$bookTitle》",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "由 AI 为您生成的智能阅读指南",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun QuickInsightsSection(isLoading: Boolean) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        SectionHeader(
            title = "核心亮点",
            icon = Icons.Default.Star,
            color = Color(0xFFFFC107)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            LoadingPlaceholder(height = 100.dp)
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                InsightCard(
                    icon = Icons.AutoMirrored.Filled.MenuBook,
                    title = "主题",
                    value = "成长与救赎",
                    modifier = Modifier.weight(1f)
                )
                InsightCard(
                    icon = Icons.Default.Group,
                    title = "人物",
                    value = "12位主角",
                    modifier = Modifier.weight(1f)
                )
                InsightCard(
                    icon = Icons.Default.AccessTime,
                    title = "时代",
                    value = "1960-2000",
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun InsightCard(
    icon: ImageVector,
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun TopicCardsSection(
    isLoading: Boolean,
    topics: List<AIGuideTopic>,
    expandedTopicId: String?,
    onTopicClick: (String) -> Unit
) {
    Column {
        SectionHeader(
            title = "主题探索",
            icon = Icons.Default.LocalLibrary,
            color = Color(0xFF9C27B0),
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            LoadingPlaceholder(
                height = 200.dp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(topics) { topic ->
                    TopicCard(
                        topic = topic,
                        isExpanded = expandedTopicId == topic.id,
                        onClick = { onTopicClick(topic.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun TopicCard(
    topic: AIGuideTopic,
    isExpanded: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(280.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Icon and expand indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = topic.color
                ) {
                    Icon(
                        imageVector = topic.iconName,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier
                            .padding(10.dp)
                            .size(24.dp)
                    )
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = if (isExpanded) "收起" else "展开",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = topic.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = topic.subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )

            if (isExpanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = topic.content,
                    style = MaterialTheme.typography.bodyMedium,
                    lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.5f
                )

                if (topic.relatedChapters.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Bookmark,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "相关章节: ${topic.relatedChapters.joinToString(", ")}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CelebrityRecsSection(isLoading: Boolean) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        SectionHeader(
            title = "名人推荐",
            icon = Icons.Default.FormatQuote,
            color = Color(0xFFFF9800)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            LoadingPlaceholder(height = 120.dp)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CelebrityQuoteCard(
                    name = "余华",
                    title = "作家",
                    quote = "这是一部关于生命韧性的杰作，读完让人对生活有了更深的理解。"
                )
                CelebrityQuoteCard(
                    name = "王安忆",
                    title = "作家、评论家",
                    quote = "文字朴实却直击人心，是近年来难得的佳作。"
                )
            }
        }
    }
}

@Composable
private fun CelebrityQuoteCard(
    name: String,
    title: String,
    quote: String
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Avatar
            Surface(
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = Color(0xFFFF9800).copy(alpha = 0.2f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = name.first().toString(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFFF9800)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = title,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "「$quote」",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = MaterialTheme.typography.bodySmall.lineHeight * 1.4f
                )
            }
        }
    }
}

@Composable
private fun ReadingSuggestionsSection(isLoading: Boolean) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        SectionHeader(
            title = "阅读建议",
            icon = Icons.Default.Lightbulb,
            color = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            LoadingPlaceholder(height = 150.dp)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SuggestionRow(
                    icon = Icons.Default.AccessTime,
                    title = "预计阅读时间",
                    description = "约 8-10 小时，建议分 15 次阅读完成"
                )
                SuggestionRow(
                    icon = Icons.Default.Bookmark,
                    title = "重点章节",
                    description = "第3章「转折」和第7章「觉醒」是核心章节"
                )
                SuggestionRow(
                    icon = Icons.Default.FormatQuote,
                    title = "阅读技巧",
                    description = "建议边读边做笔记，关注人物内心变化"
                )
                SuggestionRow(
                    icon = Icons.AutoMirrored.Filled.MenuBook,
                    title = "延伸阅读",
                    description = "可搭配《活着》《平凡的世界》一起阅读"
                )
            }
        }
    }
}

@Composable
private fun SuggestionRow(
    icon: ImageVector,
    title: String,
    description: String
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun LoadingPlaceholder(
    height: androidx.compose.ui.unit.Dp,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Box(contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                strokeWidth = 2.dp
            )
        }
    }
}
