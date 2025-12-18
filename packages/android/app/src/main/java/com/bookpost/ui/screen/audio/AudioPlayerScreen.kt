package com.bookpost.ui.screen.audio

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * Full-screen audio player for AI-narrated books
 * Supports chapter navigation, playback speed, sleep timer, and voice selection
 * Matches iOS AudioPlayerView functionality
 */

data class ChapterInfo(
    val number: Int,
    val title: String,
    val duration: Long // in seconds
)

data class AIVoice(
    val id: String,
    val name: String,
    val gender: String,
    val description: String
)

enum class SleepTimerOption(val displayName: String, val minutes: Int?) {
    MIN_15("15分钟", 15),
    MIN_30("30分钟", 30),
    MIN_45("45分钟", 45),
    MIN_60("60分钟", 60),
    END_OF_CHAPTER("本章结束后", null)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AudioPlayerScreen(
    bookId: Int,
    bookTitle: String,
    coverUrl: String? = null,
    onNavigateBack: () -> Unit
) {
    // Player state
    var isPlaying by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(0.3f) }
    var currentTime by remember { mutableIntStateOf(90) } // seconds
    var duration by remember { mutableIntStateOf(300) } // 5 min sample
    var currentChapter by remember { mutableIntStateOf(1) }
    val totalChapters = 10
    var playbackSpeed by remember { mutableFloatStateOf(1.0f) }
    var selectedVoice by remember { mutableStateOf(AIVoice.defaultVoice) }
    var sleepTimer by remember { mutableStateOf<SleepTimerOption?>(null) }

    // Bottom sheet states
    var showVoiceSelection by remember { mutableStateOf(false) }
    var showSleepTimer by remember { mutableStateOf(false) }
    var showChapterList by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    // Sample chapters
    val chapters = remember {
        (1..10).map { ChapterInfo(it, "第${it}章", 300) }
    }

    val playbackSpeeds = listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF2196F3).copy(alpha = 0.3f),
                        Color(0xFF9C27B0).copy(alpha = 0.2f),
                        MaterialTheme.colorScheme.background
                    )
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = { },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.KeyboardArrowDown, contentDescription = "收起")
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
                                    text = { Text("章节列表") },
                                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.List, null) },
                                    onClick = {
                                        showChapterList = true
                                        showMenu = false
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text("查看原文") },
                                    leadingIcon = { Icon(Icons.Default.TextFields, null) },
                                    onClick = { showMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("分享") },
                                    leadingIcon = { Icon(Icons.Default.Share, null) },
                                    onClick = { showMenu = false }
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent
                    )
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.weight(0.5f))

                // Cover art
                CoverArtView(
                    title = bookTitle,
                    coverUrl = coverUrl
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Book info
                BookInfoSection(
                    title = bookTitle,
                    currentChapter = currentChapter,
                    voiceName = selectedVoice.name
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Progress bar
                ProgressSection(
                    progress = progress,
                    currentTime = currentTime,
                    duration = duration,
                    onProgressChange = { newProgress ->
                        progress = newProgress
                        currentTime = (duration * newProgress).toInt()
                    }
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Playback controls
                PlaybackControls(
                    isPlaying = isPlaying,
                    currentChapter = currentChapter,
                    totalChapters = totalChapters,
                    onPlayPauseClick = { isPlaying = !isPlaying },
                    onSkipForward = {
                        currentTime = minOf(currentTime + 15, duration)
                        progress = currentTime.toFloat() / duration
                    },
                    onSkipBackward = {
                        currentTime = maxOf(currentTime - 15, 0)
                        progress = currentTime.toFloat() / duration
                    },
                    onPreviousChapter = {
                        if (currentChapter > 1) {
                            currentChapter--
                            currentTime = 0
                            progress = 0f
                        }
                    },
                    onNextChapter = {
                        if (currentChapter < totalChapters) {
                            currentChapter++
                            currentTime = 0
                            progress = 0f
                        }
                    }
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Secondary controls
                SecondaryControls(
                    playbackSpeed = playbackSpeed,
                    hasSleepTimer = sleepTimer != null,
                    onSpeedClick = {
                        val currentIndex = playbackSpeeds.indexOf(playbackSpeed)
                        val nextIndex = (currentIndex + 1) % playbackSpeeds.size
                        playbackSpeed = playbackSpeeds[nextIndex]
                    },
                    onVoiceClick = { showVoiceSelection = true },
                    onTimerClick = { showSleepTimer = true },
                    onChapterClick = { showChapterList = true }
                )

                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }

    // Voice selection sheet
    if (showVoiceSelection) {
        VoiceSelectionSheet(
            selectedVoice = selectedVoice,
            onVoiceSelected = { voice ->
                selectedVoice = voice
                showVoiceSelection = false
            },
            onDismiss = { showVoiceSelection = false }
        )
    }

    // Sleep timer sheet
    if (showSleepTimer) {
        SleepTimerSheet(
            selectedTimer = sleepTimer,
            onTimerSelected = { timer ->
                sleepTimer = timer
                showSleepTimer = false
            },
            onCancelTimer = { sleepTimer = null },
            onDismiss = { showSleepTimer = false }
        )
    }

    // Chapter list sheet
    if (showChapterList) {
        ChapterListSheet(
            chapters = chapters,
            currentChapter = currentChapter,
            onChapterSelected = { chapter ->
                currentChapter = chapter.number
                currentTime = 0
                progress = 0f
                showChapterList = false
            },
            onDismiss = { showChapterList = false }
        )
    }
}

@Composable
private fun CoverArtView(
    title: String,
    coverUrl: String?
) {
    Surface(
        modifier = Modifier
            .size(240.dp, 320.dp)
            .shadow(
                elevation = 20.dp,
                shape = RoundedCornerShape(16.dp),
                spotColor = Color.Black.copy(alpha = 0.3f)
            ),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.primaryContainer
    ) {
        Box(contentAlignment = Alignment.Center) {
            // Placeholder - in real app would use Coil to load coverUrl
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.VolumeUp,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.5f)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    textAlign = TextAlign.Center,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }
    }
}

@Composable
private fun BookInfoSection(
    title: String,
    currentChapter: Int,
    voiceName: String
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "第${currentChapter}章",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.GraphicEq,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "AI朗读 · $voiceName",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun ProgressSection(
    progress: Float,
    currentTime: Int,
    duration: Int,
    onProgressChange: (Float) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Slider(
            value = progress,
            onValueChange = onProgressChange,
            modifier = Modifier.fillMaxWidth(),
            colors = SliderDefaults.colors(
                thumbColor = MaterialTheme.colorScheme.primary,
                activeTrackColor = MaterialTheme.colorScheme.primary,
                inactiveTrackColor = MaterialTheme.colorScheme.surfaceVariant
            )
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = formatTime(currentTime),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = formatTime(duration),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun PlaybackControls(
    isPlaying: Boolean,
    currentChapter: Int,
    totalChapters: Int,
    onPlayPauseClick: () -> Unit,
    onSkipForward: () -> Unit,
    onSkipBackward: () -> Unit,
    onPreviousChapter: () -> Unit,
    onNextChapter: () -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Previous chapter
        IconButton(
            onClick = onPreviousChapter,
            enabled = currentChapter > 1
        ) {
            Icon(
                imageVector = Icons.Default.SkipPrevious,
                contentDescription = "上一章",
                modifier = Modifier.size(32.dp)
            )
        }

        // Skip backward 15s
        IconButton(onClick = onSkipBackward) {
            Icon(
                imageVector = Icons.Default.Replay10,
                contentDescription = "后退15秒",
                modifier = Modifier.size(28.dp)
            )
        }

        // Play/Pause
        Surface(
            onClick = onPlayPauseClick,
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(72.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "暂停" else "播放",
                    modifier = Modifier.size(36.dp),
                    tint = Color.White
                )
            }
        }

        // Skip forward 15s
        IconButton(onClick = onSkipForward) {
            Icon(
                imageVector = Icons.Default.Forward10,
                contentDescription = "前进15秒",
                modifier = Modifier.size(28.dp)
            )
        }

        // Next chapter
        IconButton(
            onClick = onNextChapter,
            enabled = currentChapter < totalChapters
        ) {
            Icon(
                imageVector = Icons.Default.SkipNext,
                contentDescription = "下一章",
                modifier = Modifier.size(32.dp)
            )
        }
    }
}

@Composable
private fun SecondaryControls(
    playbackSpeed: Float,
    hasSleepTimer: Boolean,
    onSpeedClick: () -> Unit,
    onVoiceClick: () -> Unit,
    onTimerClick: () -> Unit,
    onChapterClick: () -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(40.dp)
    ) {
        SecondaryButton(
            icon = Icons.Default.Speed,
            label = "${playbackSpeed}x",
            onClick = onSpeedClick
        )
        SecondaryButton(
            icon = Icons.Default.GraphicEq,
            label = "音色",
            onClick = onVoiceClick
        )
        SecondaryButton(
            icon = if (hasSleepTimer) Icons.Default.Nightlight else Icons.Default.Nightlight,
            label = "定时",
            isActive = hasSleepTimer,
            onClick = onTimerClick
        )
        SecondaryButton(
            icon = Icons.AutoMirrored.Filled.List,
            label = "目录",
            onClick = onChapterClick
        )
    }
}

@Composable
private fun SecondaryButton(
    icon: ImageVector,
    label: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VoiceSelectionSheet(
    selectedVoice: AIVoice,
    onVoiceSelected: (AIVoice) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(bottom = 32.dp)) {
            Text(
                text = "选择音色",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            AIVoice.allVoices.forEach { voice ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onVoiceSelected(voice) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = voice.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = voice.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (selectedVoice.id == voice.id) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Preview button
                    IconButton(onClick = { /* Preview voice */ }) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "试听",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SleepTimerSheet(
    selectedTimer: SleepTimerOption?,
    onTimerSelected: (SleepTimerOption) -> Unit,
    onCancelTimer: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(bottom = 32.dp)) {
            Text(
                text = "定时关闭",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            // Current timer status
            if (selectedTimer != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Nightlight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "定时器已开启: ${selectedTimer.displayName}",
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = onCancelTimer) {
                            Text("取消", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            Text(
                text = "设置定时",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            SleepTimerOption.entries.forEach { option ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onTimerSelected(option) }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = option.displayName,
                        style = MaterialTheme.typography.bodyLarge
                    )

                    if (selectedTimer == option) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChapterListSheet(
    chapters: List<ChapterInfo>,
    currentChapter: Int,
    onChapterSelected: (ChapterInfo) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(bottom = 32.dp)) {
            Text(
                text = "章节列表",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            LazyColumn {
                items(chapters) { chapter ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onChapterSelected(chapter) }
                            .padding(horizontal = 16.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = chapter.title,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = if (chapter.number == currentChapter) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (chapter.number == currentChapter) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (chapter.number == currentChapter) {
                                Icon(
                                    imageVector = Icons.Default.VolumeUp,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Text(
                                text = "${chapter.duration / 60}分钟",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

// Helper functions
private fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%d:%02d", mins, secs)
}

// AIVoice companion object
private val AIVoice.Companion.defaultVoice: AIVoice
    get() = AIVoice("default", "温柔女声", "female", "温柔知性，富有感情")

private val AIVoice.Companion.allVoices: List<AIVoice>
    get() = listOf(
        AIVoice("female1", "温柔女声", "female", "温柔知性，富有感情"),
        AIVoice("female2", "活泼女声", "female", "青春活泼，清脆悦耳"),
        AIVoice("male1", "磁性男声", "male", "低沉磁性，稳重大气"),
        AIVoice("male2", "阳光男声", "male", "阳光开朗，积极向上"),
        AIVoice("child", "童声", "neutral", "可爱稚嫩，天真烂漫")
    )

private object AIVoice {
    companion object
}
