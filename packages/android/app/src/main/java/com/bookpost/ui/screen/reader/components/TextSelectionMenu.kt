package com.bookpost.ui.screen.reader.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Highlight
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookpost.domain.model.HighlightColor

/**
 * Menu type for text selection
 */
enum class TextSelectionMenuType {
    CONFIRM,    // New text selected - show Highlight, Meaning, Copy, Share
    EXISTING    // Clicked existing underline - show Ideas, Add Idea, Meaning, Delete
}

/**
 * Data class for text selection state
 */
data class TextSelectionState(
    val text: String = "",
    val rect: SelectionRect? = null,
    val highlightId: Int? = null,  // For existing highlights
    val ideaCount: Int = 0,
    val currentColor: HighlightColor? = null
) {
    val isVisible: Boolean get() = text.isNotEmpty() && rect != null
    val menuType: TextSelectionMenuType get() =
        if (highlightId != null) TextSelectionMenuType.EXISTING else TextSelectionMenuType.CONFIRM
}

/**
 * Rectangle representing the selection position
 */
data class SelectionRect(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float
)

/**
 * Text selection menu that appears when text is selected in the reader.
 * Provides options to highlight, copy, add notes, AI meaning, and share.
 */
@Composable
fun TextSelectionMenu(
    state: TextSelectionState,
    onHighlight: (HighlightColor) -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onMeaning: () -> Unit,
    onAddNote: () -> Unit,
    onViewIdeas: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showColorPicker by remember { mutableStateOf(false) }
    val context = LocalContext.current

    AnimatedVisibility(
        visible = state.isVisible,
        enter = fadeIn(animationSpec = tween(200)) + slideInVertically(
            initialOffsetY = { it / 2 },
            animationSpec = tween(200)
        ),
        exit = fadeOut(animationSpec = tween(150)) + slideOutVertically(
            targetOffsetY = { it / 2 },
            animationSpec = tween(150)
        ),
        modifier = modifier
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Main menu card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.shadow(
                    elevation = 12.dp,
                    shape = RoundedCornerShape(16.dp),
                    ambientColor = Color.Black.copy(alpha = 0.1f),
                    spotColor = Color.Black.copy(alpha = 0.15f)
                )
            ) {
                when (state.menuType) {
                    TextSelectionMenuType.CONFIRM -> {
                        ConfirmMenuContent(
                            onHighlightClick = { showColorPicker = !showColorPicker },
                            onMeaning = onMeaning,
                            onCopy = {
                                copyToClipboard(context, state.text)
                                onCopy()
                            },
                            onShare = {
                                shareText(context, state.text)
                                onShare()
                            }
                        )
                    }
                    TextSelectionMenuType.EXISTING -> {
                        ExistingMenuContent(
                            ideaCount = state.ideaCount,
                            onViewIdeas = onViewIdeas,
                            onAddNote = onAddNote,
                            onMeaning = onMeaning,
                            onDelete = onDelete
                        )
                    }
                }
            }

            // Color picker (shown below the menu)
            AnimatedVisibility(
                visible = showColorPicker && state.menuType == TextSelectionMenuType.CONFIRM,
                enter = fadeIn() + slideInVertically(initialOffsetY = { -it / 2 }),
                exit = fadeOut() + slideOutVertically(targetOffsetY = { -it / 2 })
            ) {
                Spacer(modifier = Modifier.height(8.dp))
                ColorPickerRow(
                    selectedColor = state.currentColor,
                    onColorSelected = { color ->
                        onHighlight(color)
                        showColorPicker = false
                    }
                )
            }
        }
    }
}

@Composable
private fun ConfirmMenuContent(
    onHighlightClick: () -> Unit,
    onMeaning: () -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit
) {
    Row(
        modifier = Modifier.padding(4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Highlight button
        MenuButton(
            icon = Icons.Default.Highlight,
            label = "划线",
            onClick = onHighlightClick
        )

        MenuDivider()

        // AI Meaning button
        MenuButton(
            icon = Icons.Default.AutoAwesome,
            label = "释义",
            onClick = onMeaning
        )

        MenuDivider()

        // Copy button
        MenuButton(
            icon = Icons.Default.ContentCopy,
            label = "复制",
            onClick = onCopy
        )

        MenuDivider()

        // Share button
        MenuButton(
            icon = Icons.Default.Share,
            label = "分享",
            onClick = onShare
        )
    }
}

@Composable
private fun ExistingMenuContent(
    ideaCount: Int,
    onViewIdeas: () -> Unit,
    onAddNote: () -> Unit,
    onMeaning: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier.padding(4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // View Ideas button (if has ideas)
        if (ideaCount > 0) {
            MenuButton(
                icon = Icons.Default.Lightbulb,
                label = "想法($ideaCount)",
                onClick = onViewIdeas
            )
            MenuDivider()
        }

        // Add Note button
        MenuButton(
            icon = Icons.Default.Edit,
            label = "添加想法",
            onClick = onAddNote
        )

        MenuDivider()

        // AI Meaning button
        MenuButton(
            icon = Icons.Default.AutoAwesome,
            label = "释义",
            onClick = onMeaning
        )

        MenuDivider()

        // Delete button
        MenuButton(
            icon = Icons.Default.Delete,
            label = "删除",
            onClick = onDelete,
            tint = MaterialTheme.colorScheme.error
        )
    }
}

@Composable
private fun MenuButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurface
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = tint,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            fontSize = 11.sp
        )
    }
}

@Composable
private fun MenuDivider() {
    Divider(
        modifier = Modifier
            .height(40.dp)
            .width(1.dp),
        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
    )
}

@Composable
private fun ColorPickerRow(
    selectedColor: HighlightColor?,
    onColorSelected: (HighlightColor) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            HighlightColor.entries.forEach { color ->
                ColorButton(
                    color = color,
                    isSelected = color == selectedColor,
                    onClick = { onColorSelected(color) }
                )
            }
        }
    }
}

@Composable
private fun ColorButton(
    color: HighlightColor,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderWidth by animateFloatAsState(
        targetValue = if (isSelected) 3f else 0f,
        animationSpec = tween(200),
        label = "border"
    )

    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(color.getColor())
            .then(
                if (isSelected) {
                    Modifier.border(
                        width = borderWidth.dp,
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    )
                } else Modifier
            )
            .clickable(onClick = onClick)
            .shadow(
                elevation = 2.dp,
                shape = CircleShape,
                ambientColor = color.getColor().copy(alpha = 0.4f)
            )
    )
}

// Helper functions
private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Selected Text", text)
    clipboard.setPrimaryClip(clip)
}

private fun shareText(context: Context, text: String) {
    val sendIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, text)
        type = "text/plain"
    }
    val shareIntent = Intent.createChooser(sendIntent, "分享文本")
    context.startActivity(shareIntent)
}

/**
 * Preview text shown in the selection context
 */
@Composable
fun SelectedTextPreview(
    text: String,
    highlightColor: HighlightColor? = null,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = highlightColor?.getColor()?.copy(alpha = 0.3f)
                ?: MaterialTheme.colorScheme.surfaceVariant
        ),
        modifier = modifier
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(12.dp)
        )
    }
}
