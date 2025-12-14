package com.bookpost.ui.screen.reader.components

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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BrightnessHigh
import androidx.compose.material.icons.filled.BrightnessLow
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookpost.domain.model.ColorMode
import com.bookpost.domain.model.FontFamily
import com.bookpost.domain.model.LineSpacing
import com.bookpost.domain.model.MarginSize
import com.bookpost.domain.model.ReadingSettings

@Composable
fun ReaderSettingsSheet(
    settings: ReadingSettings,
    onSettingsChange: (ReadingSettings) -> Unit,
    onDismiss: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "阅读设置",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Font Size
        SettingSection(title = "字号") {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(
                    onClick = {
                        val newSize = (settings.fontSize - 2).coerceAtLeast(14f)
                        onSettingsChange(settings.copy(fontSize = newSize))
                    }
                ) {
                    Icon(Icons.Default.Remove, "减小字号")
                }

                Text(
                    text = "${settings.fontSize.toInt()}",
                    style = MaterialTheme.typography.titleMedium
                )

                IconButton(
                    onClick = {
                        val newSize = (settings.fontSize + 2).coerceAtMost(40f)
                        onSettingsChange(settings.copy(fontSize = newSize))
                    }
                ) {
                    Icon(Icons.Default.Add, "增大字号")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Font Family
        SettingSection(title = "字体") {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                FontFamily.entries.forEach { font ->
                    SelectableChip(
                        text = font.displayName,
                        selected = settings.fontFamily == font,
                        onClick = { onSettingsChange(settings.copy(fontFamily = font)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Color Mode
        SettingSection(title = "主题") {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                ColorMode.entries.forEach { mode ->
                    ColorModeButton(
                        mode = mode,
                        selected = settings.colorMode == mode,
                        onClick = { onSettingsChange(settings.copy(colorMode = mode)) }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Line Spacing
        SettingSection(title = "行距") {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                LineSpacing.entries.forEach { spacing ->
                    SelectableChip(
                        text = spacing.displayName,
                        selected = settings.lineSpacing == spacing,
                        onClick = { onSettingsChange(settings.copy(lineSpacing = spacing)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Margin Size
        SettingSection(title = "边距") {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                MarginSize.entries.forEach { size ->
                    SelectableChip(
                        text = size.displayName,
                        selected = settings.marginSize == size,
                        onClick = { onSettingsChange(settings.copy(marginSize = size)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Brightness
        SettingSection(title = "亮度") {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.BrightnessLow,
                    contentDescription = "低亮度",
                    modifier = Modifier.size(24.dp)
                )
                Slider(
                    value = settings.brightness,
                    onValueChange = { onSettingsChange(settings.copy(brightness = it)) },
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                )
                Icon(
                    Icons.Default.BrightnessHigh,
                    contentDescription = "高亮度",
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Keep Screen On
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("屏幕常亮")
            Switch(
                checked = settings.keepScreenOn,
                onCheckedChange = { onSettingsChange(settings.copy(keepScreenOn = it)) }
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun SettingSection(
    title: String,
    content: @Composable () -> Unit
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        content()
    }
}

@Composable
private fun SelectableChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surfaceVariant
            )
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 12.dp)
    ) {
        Text(
            text = text,
            fontSize = 14.sp,
            color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer
            else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ColorModeButton(
    mode: ColorMode,
    selected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(mode.getBackgroundColor())
                .then(
                    if (selected) Modifier.border(
                        width = 3.dp,
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    )
                    else Modifier
                )
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = mode.displayName,
            fontSize = 12.sp,
            color = if (selected) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
