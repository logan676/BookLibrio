package com.bookpost.ui.screen.ai

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ViewModule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/**
 * AI Outline Screen - Shows AI-generated book outline
 * Displays hierarchical structure with AI summaries for each section
 * Supports tree, list, and mindmap view modes
 * Matches iOS AIOutlineView functionality
 */

data class OutlineSectionData(
    val id: String,
    val title: String,
    val pageRange: String? = null,
    val aiSummary: String? = null,
    val keywords: List<String> = emptyList(),
    val isKeySection: Boolean = false,
    val readingProgress: Float? = null,
    val children: List<OutlineSectionData> = emptyList()
)

enum class OutlineViewMode(val displayName: String) {
    TREE("树形"),
    LIST("列表"),
    MINDMAP("脑图")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIOutlineScreen(
    bookId: Int,
    bookTitle: String,
    onNavigateBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var outline by remember { mutableStateOf<List<OutlineSectionData>>(emptyList()) }
    var expandedSections by remember { mutableStateOf<Set<String>>(emptySet()) }
    var searchText by remember { mutableStateOf("") }
    var selectedViewMode by remember { mutableStateOf(OutlineViewMode.TREE) }
    var showMenu by remember { mutableStateOf(false) }

    // Load outline data
    LaunchedEffect(bookId) {
        delay(1500)
        outline = listOf(
            OutlineSectionData(
                id = "1",
                title = "第一部 少年时代",
                pageRange = "1-120",
                aiSummary = "讲述主人公的童年和青少年时期，建立了故事的基础背景和人物关系。",
                keywords = listOf("童年", "家庭", "成长"),
                isKeySection = true,
                readingProgress = 1.0f,
                children = listOf(
                    OutlineSectionData(
                        id = "1-1",
                        title = "第一章 黄土地",
                        pageRange = "1-25",
                        aiSummary = "介绍故事发生的地点和时代背景。",
                        keywords = listOf("环境", "背景"),
                        readingProgress = 1.0f
                    ),
                    OutlineSectionData(
                        id = "1-2",
                        title = "第二章 家",
                        pageRange = "26-50",
                        aiSummary = "描写主人公的家庭成员和家庭关系。",
                        keywords = listOf("家庭", "亲情"),
                        readingProgress = 1.0f
                    ),
                    OutlineSectionData(
                        id = "1-3",
                        title = "第三章 学校",
                        pageRange = "51-80",
                        aiSummary = "主人公的求学经历和梦想的萌芽。",
                        keywords = listOf("教育", "梦想"),
                        isKeySection = true,
                        readingProgress = 1.0f
                    )
                )
            ),
            OutlineSectionData(
                id = "2",
                title = "第二部 青年奋斗",
                pageRange = "121-280",
                aiSummary = "主人公离开家乡，在城市中寻找自己的人生道路。",
                keywords = listOf("奋斗", "城市", "挫折"),
                isKeySection = true,
                readingProgress = 0.6f,
                children = listOf(
                    OutlineSectionData(
                        id = "2-1",
                        title = "第四章 离乡",
                        pageRange = "121-150",
                        aiSummary = "主人公告别家乡，踏上新的征程。",
                        keywords = listOf("离别", "期望"),
                        readingProgress = 1.0f
                    ),
                    OutlineSectionData(
                        id = "2-2",
                        title = "第五章 初到城市",
                        pageRange = "151-190",
                        aiSummary = "描写主人公在城市的初次体验和困惑。",
                        keywords = listOf("适应", "挑战"),
                        readingProgress = 0.5f
                    ),
                    OutlineSectionData(
                        id = "2-3",
                        title = "第六章 爱情",
                        pageRange = "191-230",
                        aiSummary = "主人公的感情线展开。",
                        keywords = listOf("爱情", "选择"),
                        isKeySection = true,
                        readingProgress = 0.3f
                    )
                )
            ),
            OutlineSectionData(
                id = "3",
                title = "第三部 成熟与回归",
                pageRange = "281-400",
                aiSummary = "经历磨难后的主人公对人生有了新的理解，最终找到内心的平静。",
                keywords = listOf("成熟", "回归", "和解"),
                isKeySection = true,
                readingProgress = 0f
            )
        )
        isLoading = false
    }

    // Filter outline based on search
    val filteredOutline = remember(outline, searchText) {
        if (searchText.isBlank()) outline
        else filterOutline(outline, searchText.lowercase())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI大纲") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
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
                                text = { Text("展开全部") },
                                leadingIcon = {
                                    Icon(Icons.Default.ExpandMore, contentDescription = null)
                                },
                                onClick = {
                                    expandedSections = getAllSectionIds(outline)
                                    showMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("折叠全部") },
                                leadingIcon = {
                                    Icon(Icons.Default.ExpandLess, contentDescription = null)
                                },
                                onClick = {
                                    expandedSections = emptySet()
                                    showMenu = false
                                }
                            )
                            HorizontalDivider()
                            DropdownMenuItem(
                                text = { Text("导出大纲") },
                                leadingIcon = {
                                    Icon(Icons.Default.Share, contentDescription = null)
                                },
                                onClick = { showMenu = false }
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
            // View mode selector
            ViewModeSelector(
                selectedMode = selectedViewMode,
                onModeSelected = { selectedViewMode = it }
            )

            // Search bar
            SearchBar(
                searchText = searchText,
                onSearchTextChange = { searchText = it }
            )

            // Content
            when {
                isLoading -> LoadingView()
                filteredOutline.isEmpty() -> EmptyState()
                else -> {
                    when (selectedViewMode) {
                        OutlineViewMode.TREE -> TreeView(
                            sections = filteredOutline,
                            expandedSections = expandedSections,
                            onSectionClick = { sectionId ->
                                expandedSections = if (expandedSections.contains(sectionId)) {
                                    expandedSections - sectionId
                                } else {
                                    expandedSections + sectionId
                                }
                            }
                        )
                        OutlineViewMode.LIST -> ListView(sections = filteredOutline)
                        OutlineViewMode.MINDMAP -> MindmapView(
                            bookTitle = bookTitle,
                            sections = filteredOutline
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ViewModeSelector(
    selectedMode: OutlineViewMode,
    onModeSelected: (OutlineViewMode) -> Unit
) {
    TabRow(
        selectedTabIndex = OutlineViewMode.entries.indexOf(selectedMode),
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        OutlineViewMode.entries.forEach { mode ->
            Tab(
                selected = selectedMode == mode,
                onClick = { onModeSelected(mode) },
                text = { Text(mode.displayName) },
                icon = {
                    Icon(
                        imageVector = when (mode) {
                            OutlineViewMode.TREE -> Icons.Default.AccountTree
                            OutlineViewMode.LIST -> Icons.Default.FormatListBulleted
                            OutlineViewMode.MINDMAP -> Icons.Default.ViewModule
                        },
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            )
        }
    }
}

@Composable
private fun SearchBar(
    searchText: String,
    onSearchTextChange: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
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
                value = searchText,
                onValueChange = onSearchTextChange,
                modifier = Modifier.weight(1f),
                textStyle = TextStyle(
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 16.sp
                ),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                decorationBox = { innerTextField ->
                    Box {
                        if (searchText.isEmpty()) {
                            Text(
                                text = "搜索章节或关键词",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        innerTextField()
                    }
                }
            )

            if (searchText.isNotEmpty()) {
                IconButton(
                    onClick = { onSearchTextChange("") },
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
}

@Composable
private fun TreeView(
    sections: List<OutlineSectionData>,
    expandedSections: Set<String>,
    onSectionClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp)
    ) {
        sections.forEach { section ->
            item(key = section.id) {
                TreeSectionRow(
                    section = section,
                    level = 0,
                    expandedSections = expandedSections,
                    onSectionClick = onSectionClick
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TreeSectionRow(
    section: OutlineSectionData,
    level: Int,
    expandedSections: Set<String>,
    onSectionClick: (String) -> Unit
) {
    val isExpanded = expandedSections.contains(section.id)
    val hasChildren = section.children.isNotEmpty()

    Column {
        // Section header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onSectionClick(section.id) }
                .padding(vertical = 12.dp)
                .padding(start = (level * 20).dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Expand indicator or bullet
            if (hasChildren) {
                Icon(
                    imageVector = if (isExpanded) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                    contentDescription = if (isExpanded) "收起" else "展开",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(levelColor(level))
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Title and info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = section.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (level == 0) FontWeight.SemiBold else FontWeight.Normal
                    )

                    if (section.isKeySection) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = "重点章节",
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                section.pageRange?.let { pages ->
                    Text(
                        text = "P.$pages",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Reading progress
            section.readingProgress?.let { progress ->
                Text(
                    text = "${(progress * 100).toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // AI Summary card (when expanded)
        AnimatedVisibility(
            visible = isExpanded && section.aiSummary != null,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            section.aiSummary?.let { summary ->
                AISummaryCard(
                    summary = summary,
                    keywords = section.keywords,
                    modifier = Modifier.padding(start = (level * 20 + 24).dp, end = 8.dp, bottom = 8.dp)
                )
            }
        }

        // Children
        AnimatedVisibility(
            visible = isExpanded,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            Column {
                section.children.forEach { child ->
                    TreeSectionRow(
                        section = child,
                        level = level + 1,
                        expandedSections = expandedSections,
                        onSectionClick = onSectionClick
                    )
                }
            }
        }

        HorizontalDivider(
            modifier = Modifier.padding(start = (level * 20 + 24).dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AISummaryCard(
    summary: String,
    keywords: List<String>,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = Color(0xFF9C27B0),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "AI摘要",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF9C27B0)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = summary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = MaterialTheme.typography.bodySmall.lineHeight * 1.4f
            )

            if (keywords.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    keywords.forEach { keyword ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = keyword,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ListView(sections: List<OutlineSectionData>) {
    val flattenedSections = remember(sections) { flattenSections(sections) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(flattenedSections, key = { it.id }) { section ->
            ListItemCard(section = section)
        }
    }
}

@Composable
private fun ListItemCard(section: OutlineSectionData) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = section.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (section.isKeySection) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFFFF9800)
                        ) {
                            Text(
                                text = "重点",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                section.pageRange?.let { pages ->
                    Text(
                        text = "P.$pages",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            section.aiSummary?.let { summary ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun MindmapView(
    bookTitle: String,
    sections: List<OutlineSectionData>
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Center node (book title)
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.primary
        ) {
            Text(
                text = bookTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                maxLines = 2,
                textAlign = TextAlign.Center
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // First level nodes in grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(sections.take(6), key = { it.id }) { section ->
                MindmapNode(section = section)
            }
        }
    }
}

@Composable
private fun MindmapNode(section: OutlineSectionData) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = section.title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            if (section.children.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "+${section.children.size}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun LoadingView() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "AI正在生成大纲...",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = null,
            modifier = Modifier.size(50.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "未找到匹配内容",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "尝试其他关键词",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

// Helper functions
private fun levelColor(level: Int): Color = when (level) {
    0 -> Color(0xFF2196F3)
    1 -> Color(0xFF4CAF50)
    2 -> Color(0xFFFF9800)
    else -> Color.Gray
}

private fun filterOutline(
    sections: List<OutlineSectionData>,
    searchText: String
): List<OutlineSectionData> {
    return sections.mapNotNull { section ->
        filterSection(section, searchText)
    }
}

private fun filterSection(
    section: OutlineSectionData,
    searchText: String
): OutlineSectionData? {
    val titleMatches = section.title.lowercase().contains(searchText)
    val summaryMatches = section.aiSummary?.lowercase()?.contains(searchText) == true
    val keywordsMatch = section.keywords.any { it.lowercase().contains(searchText) }

    val filteredChildren = section.children.mapNotNull { filterSection(it, searchText) }

    return if (titleMatches || summaryMatches || keywordsMatch || filteredChildren.isNotEmpty()) {
        section.copy(children = filteredChildren)
    } else {
        null
    }
}

private fun flattenSections(sections: List<OutlineSectionData>): List<OutlineSectionData> {
    val result = mutableListOf<OutlineSectionData>()
    fun flatten(sectionList: List<OutlineSectionData>) {
        for (section in sectionList) {
            result.add(section)
            flatten(section.children)
        }
    }
    flatten(sections)
    return result
}

private fun getAllSectionIds(sections: List<OutlineSectionData>): Set<String> {
    val ids = mutableSetOf<String>()
    fun collectIds(sectionList: List<OutlineSectionData>) {
        for (section in sectionList) {
            ids.add(section.id)
            collectIds(section.children)
        }
    }
    collectIds(sections)
    return ids
}
