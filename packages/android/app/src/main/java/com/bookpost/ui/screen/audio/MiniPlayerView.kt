package com.bookpost.ui.screen.audio

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * Mini player overlay that appears at the bottom of the screen during audio playback
 * Provides quick access to play/pause, progress, and expands to full player
 * Matches iOS MiniPlayerView functionality
 */

data class AudioPlayerState(
    val isPlaying: Boolean = false,
    val progress: Float = 0f,
    val currentChapter: Int = 1,
    val bookTitle: String = "",
    val bookId: Int = 0,
    val coverUrl: String? = null
)

/**
 * Mini player component for compact audio playback control
 */
@Composable
fun MiniPlayerView(
    playerState: AudioPlayerState,
    onExpandClick: () -> Unit,
    onPlayPauseClick: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp)
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(16.dp),
                spotColor = Color.Black.copy(alpha = 0.15f)
            ),
        shape = RoundedCornerShape(16.dp),
        tonalElevation = 2.dp
    ) {
        Column {
            // Progress bar at top
            LinearProgressIndicator(
                progress = { playerState.progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            // Player content
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tap to expand area
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(onClick = onExpandClick),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Cover thumbnail
                    CoverThumbnail(
                        title = playerState.bookTitle,
                        coverUrl = playerState.coverUrl
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    // Book info
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = playerState.bookTitle,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.GraphicEq,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "第${playerState.currentChapter}章",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Play/Pause button
                IconButton(
                    onClick = onPlayPauseClick,
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(
                        imageVector = if (playerState.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (playerState.isPlaying) "暂停" else "播放",
                        modifier = Modifier.size(28.dp)
                    )
                }

                // Close button
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "关闭",
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun CoverThumbnail(
    title: String,
    coverUrl: String?
) {
    Surface(
        modifier = Modifier.size(44.dp, 60.dp),
        shape = RoundedCornerShape(4.dp),
        color = MaterialTheme.colorScheme.primaryContainer
    ) {
        Box(contentAlignment = Alignment.Center) {
            // Placeholder - in real app would use Coil to load coverUrl
            Text(
                text = title.take(2),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

/**
 * Animated mini player container that manages visibility
 */
@Composable
fun MiniPlayerContainer(
    isActive: Boolean,
    playerState: AudioPlayerState,
    onExpandClick: () -> Unit,
    onPlayPauseClick: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isActive,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = modifier
    ) {
        MiniPlayerView(
            playerState = playerState,
            onExpandClick = onExpandClick,
            onPlayPauseClick = onPlayPauseClick,
            onDismiss = onDismiss
        )
    }
}

/**
 * Audio Player Coordinator - Singleton state holder for app-wide audio playback
 * In a real app, this would be a ViewModel or a shared state management solution
 */
object AudioPlayerCoordinator {
    var isActive by mutableStateOf(false)
        private set
    var currentBook by mutableStateOf<AudioBook?>(null)
        private set
    var isPlaying by mutableStateOf(false)
        private set
    var progress by mutableFloatStateOf(0f)
        private set
    var currentChapter by mutableIntStateOf(1)
        private set

    data class AudioBook(
        val id: Int,
        val title: String,
        val coverUrl: String?,
        val type: String
    )

    fun play(book: AudioBook) {
        currentBook = book
        isActive = true
        isPlaying = true
    }

    fun stop() {
        isActive = false
        isPlaying = false
        currentBook = null
        progress = 0f
        currentChapter = 1
    }

    fun pause() {
        isPlaying = false
    }

    fun resume() {
        isPlaying = true
    }

    fun togglePlayPause() {
        isPlaying = !isPlaying
    }

    fun updateProgress(newProgress: Float) {
        progress = newProgress
    }

    fun goToChapter(chapter: Int) {
        currentChapter = chapter
        progress = 0f
    }

    fun getPlayerState(): AudioPlayerState {
        return AudioPlayerState(
            isPlaying = isPlaying,
            progress = progress,
            currentChapter = currentChapter,
            bookTitle = currentBook?.title ?: "",
            bookId = currentBook?.id ?: 0,
            coverUrl = currentBook?.coverUrl
        )
    }
}

/**
 * Extension function to add mini player support to any composable
 * Usage: modifier = Modifier.withMiniPlayer(...)
 */
@Composable
fun MiniPlayerOverlay(
    onNavigateToFullPlayer: (Int, String) -> Unit
) {
    val coordinator = AudioPlayerCoordinator

    MiniPlayerContainer(
        isActive = coordinator.isActive,
        playerState = coordinator.getPlayerState(),
        onExpandClick = {
            coordinator.currentBook?.let { book ->
                onNavigateToFullPlayer(book.id, book.title)
            }
        },
        onPlayPauseClick = { coordinator.togglePlayPause() },
        onDismiss = { coordinator.stop() }
    )
}
