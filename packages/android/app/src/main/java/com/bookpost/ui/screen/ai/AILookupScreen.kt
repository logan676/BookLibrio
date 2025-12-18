package com.bookpost.ui.screen.ai

import androidx.compose.foundation.background
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * AI-powered word/phrase lookup screen
 * Shows dictionary definition, AI interpretation, and related books
 * Matches iOS AILookupView functionality
 */

data class DictionaryResult(
    val word: String,
    val phonetic: String? = null,
    val definitions: List<WordDefinition> = emptyList(),
    val etymology: String? = null,
    val examples: List<String> = emptyList()
)

data class WordDefinition(
    val partOfSpeech: String?,
    val meaning: String
)

data class RelatedBook(
    val id: Int,
    val title: String,
    val author: String,
    val type: String = "ebook",
    val occurrences: Int = 0
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AILookupScreen(
    word: String,
    context: String? = null,
    bookTitle: String? = null,
    onNavigateBack: () -> Unit,
    onNavigateToBook: (Int, String) -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { 3 })
    val scope = rememberCoroutineScope()
    val tabs = listOf("词典", "AI解读", "相关书籍")
    val clipboardManager = LocalClipboardManager.current

    var isLoading by remember { mutableStateOf(true) }
    var dictionaryResult by remember { mutableStateOf<DictionaryResult?>(null) }
    var aiInterpretation by remember { mutableStateOf<String?>(null) }
    var relatedBooks by remember { mutableStateOf<List<RelatedBook>>(emptyList()) }

    // Load content
    LaunchedEffect(word) {
        delay(800)
        dictionaryResult = DictionaryResult(
            word = word,
            phonetic = "cí hǎi",
            definitions = listOf(
                WordDefinition("名词", "大型综合性辞书，收录词语、百科知识等"),
                WordDefinition("比喻", "知识的海洋，形容知识丰富")
            ),
            etymology = "「辞海」一词源于古代对知识汇集的形象比喻，将文字词汇比作汪洋大海。",
            examples = listOf(
                "这本辞海收录了十万余条词目。",
                "他的脑海就像一部活辞海，什么都知道。"
            )
        )

        aiInterpretation = """
「$word」是一个富有文化内涵的词汇。

从字面意思理解，它由"辞"（文字、言辞）和"海"（海洋、广阔）组成，形象地表达了词汇知识如海洋般浩瀚无边的意境。

在实际使用中，它主要有两个含义：
1. 作为专有名词，指代由中华书局出版的大型综合性辞书《辞海》
2. 作为普通名词，泛指收录大量词汇的词典或知识库

这个词体现了中国人对知识的敬畏和追求，将知识比作海洋，既表达了知识的广博，也暗示了学习的无穷无尽。
        """.trimIndent()

        relatedBooks = listOf(
            RelatedBook(1, "辞海（第七版）", "辞海编辑委员会", "ebook", 1),
            RelatedBook(2, "现代汉语词典", "中国社会科学院", "ebook", 3),
            RelatedBook(3, "汉语大词典", "汉语大词典编辑委员会", "ebook", 2)
        )

        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("查词") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "关闭"
                        )
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
            // Word header
            WordHeader(
                word = word,
                context = context,
                bookTitle = bookTitle,
                onCopy = { clipboardManager.setText(AnnotatedString(word)) }
            )

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
                    0 -> DictionaryTab(
                        isLoading = isLoading,
                        result = dictionaryResult
                    )
                    1 -> AIInterpretationTab(
                        isLoading = isLoading,
                        interpretation = aiInterpretation,
                        word = word,
                        context = context
                    )
                    2 -> RelatedBooksTab(
                        isLoading = isLoading,
                        word = word,
                        books = relatedBooks,
                        onBookClick = onNavigateToBook
                    )
                }
            }
        }
    }
}

@Composable
private fun WordHeader(
    word: String,
    context: String?,
    bookTitle: String?,
    onCopy: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = word,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )

            if (context != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "「$context」",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontStyle = FontStyle.Italic
                )
            }

            if (bookTitle != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Book,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "来自《$bookTitle》",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                ActionButton(
                    icon = Icons.AutoMirrored.Filled.VolumeUp,
                    label = "发音",
                    onClick = { /* Text-to-speech */ }
                )
                ActionButton(
                    icon = Icons.Default.ContentCopy,
                    label = "复制",
                    onClick = onCopy
                )
                ActionButton(
                    icon = Icons.Default.Bookmark,
                    label = "收藏",
                    onClick = { /* Add to vocabulary */ }
                )
                ActionButton(
                    icon = Icons.Default.Share,
                    label = "分享",
                    onClick = { /* Share */ }
                )
            }
        }
    }
}

@Composable
private fun ActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun DictionaryTab(
    isLoading: Boolean,
    result: DictionaryResult?
) {
    if (isLoading) {
        LoadingState()
    } else if (result != null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Phonetic
            result.phonetic?.let { phonetic ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "拼音",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = phonetic,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Definitions
            result.definitions.forEachIndexed { index, definition ->
                DefinitionRow(index = index + 1, definition = definition)
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Etymology
            result.etymology?.let { etymology ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "词源",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = etymology,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Examples
            if (result.examples.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "例句",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                result.examples.forEach { example ->
                    Text(
                        text = "• $example",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    } else {
        EmptyState(message = "未找到词典释义")
    }
}

@Composable
private fun DefinitionRow(index: Int, definition: WordDefinition) {
    Row(
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "$index.",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.width(24.dp)
        )

        Column {
            definition.partOfSpeech?.let { pos ->
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.primary
                ) {
                    Text(
                        text = pos,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
            }
            Text(
                text = definition.meaning,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AIInterpretationTab(
    isLoading: Boolean,
    interpretation: String?,
    word: String,
    context: String?
) {
    if (isLoading) {
        LoadingState()
    } else if (interpretation != null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // AI badge
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.tertiary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "AI 智能解读",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = interpretation,
                style = MaterialTheme.typography.bodyMedium,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.5
            )

            // Context explanation
            if (context != null) {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "在此语境中",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "根据上下文，「$word」在这里表达的是...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Related concepts
            Text(
                text = "相关概念",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("同义词", "反义词", "延伸阅读", "历史背景").forEach { concept ->
                    Surface(
                        modifier = Modifier.clickable { /* Show related concept */ },
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Text(
                            text = concept,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    } else {
        EmptyState(message = "AI 解读加载中...")
    }
}

@Composable
private fun RelatedBooksTab(
    isLoading: Boolean,
    word: String,
    books: List<RelatedBook>,
    onBookClick: (Int, String) -> Unit
) {
    if (isLoading) {
        LoadingState()
    } else if (books.isNotEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text(
                text = "包含「$word」的书籍",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(16.dp))

            books.forEach { book ->
                RelatedBookRow(
                    book = book,
                    onClick = { onBookClick(book.id, book.type) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    } else {
        EmptyState(message = "暂无相关书籍推荐")
    }
}

@Composable
private fun RelatedBookRow(
    book: RelatedBook,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Book cover placeholder
            Surface(
                modifier = Modifier.size(50.dp, 68.dp),
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
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
                    text = book.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = book.author,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "出现 ${book.occurrences} 次",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "加载中...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.Book,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
