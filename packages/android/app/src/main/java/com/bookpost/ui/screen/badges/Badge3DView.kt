package com.bookpost.ui.screen.badges

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 3D Metallic Badge Component
 * Creates realistic 3D medal/badge effects using layered gradients and shadows
 * Supports interactive gestures: drag to rotate, double-tap to flip
 */
@Composable
fun Badge3DView(
    iconName: ImageVector,
    color: Color,
    isEarned: Boolean = true,
    level: Int = 1,
    size: Dp = 60.dp,
    showProgress: Boolean = false,
    progress: Float = 0f,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "shine")
    val shineAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shineAlpha"
    )

    val effectiveColor = if (isEarned) color else Color.Gray.copy(alpha = 0.5f)
    val lighterColor = effectiveColor.lighter(0.3f)
    val darkerColor = effectiveColor.darker(0.2f)

    Box(
        modifier = modifier.size(size * 1.2f),
        contentAlignment = Alignment.Center
    ) {
        // Drop shadow for depth
        Box(
            modifier = Modifier
                .size(size * 0.9f, size * 0.5f)
                .offset(y = size * 0.4f)
                .blur(size * 0.1f, BlurredEdgeTreatment.Unbounded)
                .background(
                    color = Color.Black.copy(alpha = 0.3f),
                    shape = CircleShape
                )
        )

        // Outer metallic ring
        OuterRing(
            size = size,
            color = effectiveColor,
            isEarned = isEarned
        )

        // Main badge body
        MainBadgeBody(
            size = size,
            color = effectiveColor,
            lighterColor = lighterColor,
            darkerColor = darkerColor,
            isEarned = isEarned
        )

        // Inner embossed circle
        InnerEmboss(
            size = size,
            color = effectiveColor,
            darkerColor = darkerColor,
            isEarned = isEarned
        )

        // Icon
        Icon(
            imageVector = iconName,
            contentDescription = null,
            modifier = Modifier.size(size * 0.35f),
            tint = if (isEarned) Color.White else Color.White.copy(alpha = 0.5f)
        )

        // Top highlight shine
        TopShine(
            size = size,
            alpha = if (isEarned) shineAlpha else 0.2f
        )

        // Level indicator
        if (level > 1 && isEarned) {
            LevelIndicator(
                level = level,
                size = size
            )
        }

        // Progress ring
        if (showProgress && !isEarned) {
            ProgressRing(
                progress = progress,
                size = size,
                color = color
            )
        }
    }
}

@Composable
private fun OuterRing(
    size: Dp,
    color: Color,
    isEarned: Boolean
) {
    val gradientColors = if (isEarned) {
        listOf(
            color.copy(alpha = 0.9f),
            color.copy(alpha = 0.6f),
            color.copy(alpha = 0.3f),
            color.copy(alpha = 0.6f),
            color.copy(alpha = 0.9f)
        )
    } else {
        listOf(
            Color.Gray.copy(alpha = 0.5f),
            Color.Gray.copy(alpha = 0.3f),
            Color.Gray.copy(alpha = 0.5f)
        )
    }

    Box(
        modifier = Modifier
            .size(size * 1.1f)
            .clip(CircleShape)
            .background(
                brush = Brush.sweepGradient(gradientColors)
            )
    ) {
        // Outer ring highlight stroke
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(1.dp)
                .drawBehind {
                    drawCircle(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.6f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.2f)
                            ),
                            start = Offset.Zero,
                            end = Offset(this.size.width, this.size.height)
                        ),
                        radius = this.size.minDimension / 2
                    )
                }
        )
    }
}

@Composable
private fun MainBadgeBody(
    size: Dp,
    color: Color,
    lighterColor: Color,
    darkerColor: Color,
    isEarned: Boolean
) {
    val gradientColors = if (isEarned) {
        listOf(lighterColor, color, darkerColor, color.darker(0.4f))
    } else {
        listOf(
            Color.Gray.copy(alpha = 0.6f),
            Color.Gray.copy(alpha = 0.4f),
            Color.Gray.copy(alpha = 0.3f)
        )
    }

    Box(
        modifier = Modifier
            .size(size)
            .shadow(
                elevation = if (isEarned) 16.dp else 4.dp,
                shape = CircleShape,
                ambientColor = if (isEarned) color.copy(alpha = 0.5f) else Color.Transparent,
                spotColor = if (isEarned) color.copy(alpha = 0.5f) else Color.Transparent
            )
            .clip(CircleShape)
            .background(
                brush = Brush.linearGradient(
                    colors = gradientColors,
                    start = Offset.Zero,
                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
                )
            )
    ) {
        // Radial highlight for 3D dome effect
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.radialGradient(
                        colors = if (isEarned) {
                            listOf(
                                lighterColor.copy(alpha = 0.8f),
                                Color.Transparent
                            )
                        } else {
                            listOf(
                                Color.White.copy(alpha = 0.2f),
                                Color.Transparent
                            )
                        },
                        center = Offset(0.35f, 0.35f),
                        radius = 200f
                    )
                )
        )

        // Bottom shadow for depth
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = if (isEarned) 0.3f else 0.15f)
                        )
                    )
                )
        )
    }
}

@Composable
private fun InnerEmboss(
    size: Dp,
    color: Color,
    darkerColor: Color,
    isEarned: Boolean
) {
    // Inner circle surface
    Box(
        modifier = Modifier
            .size(size * 0.65f)
            .clip(CircleShape)
            .background(
                brush = Brush.linearGradient(
                    colors = if (isEarned) {
                        listOf(darkerColor, color.darker(0.25f))
                    } else {
                        listOf(
                            Color.Gray.copy(alpha = 0.35f),
                            Color.Gray.copy(alpha = 0.25f)
                        )
                    }
                )
            )
            .drawBehind {
                // Border emboss effect
                drawCircle(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.3f),
                            Color.Transparent,
                            Color.White.copy(alpha = 0.3f)
                        )
                    ),
                    radius = this.size.minDimension / 2,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(
                        width = this.size.minDimension * 0.04f
                    )
                )
            }
    )
}

@Composable
private fun TopShine(
    size: Dp,
    alpha: Float
) {
    Box(
        modifier = Modifier
            .size(size * 0.5f, size * 0.25f)
            .offset(y = -size * 0.25f)
            .blur(2.dp)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = alpha),
                        Color.White.copy(alpha = 0.1f),
                        Color.Transparent
                    )
                ),
                shape = CircleShape
            )
    )
}

@Composable
private fun LevelIndicator(
    level: Int,
    size: Dp
) {
    val levelColor = when (level) {
        1 -> Color.Gray
        2 -> Color(0xFF4CAF50) // Green
        3 -> Color(0xFF2196F3) // Blue
        4 -> Color(0xFF9C27B0) // Purple
        else -> Color(0xFFFF9800) // Orange
    }

    Box(
        modifier = Modifier
            .size(size * 1.1f),
        contentAlignment = Alignment.BottomEnd
    ) {
        Box(
            modifier = Modifier
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            levelColor.lighter(0.2f),
                            levelColor
                        )
                    ),
                    shape = RoundedCornerShape(50)
                )
                .shadow(2.dp, RoundedCornerShape(50))
                .padding(horizontal = size * 0.08f, vertical = size * 0.04f)
        ) {
            Text(
                text = "Lv.$level",
                color = Color.White,
                fontSize = (size.value * 0.15f).sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun ProgressRing(
    progress: Float,
    size: Dp,
    color: Color
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress / 100f,
        animationSpec = tween(500),
        label = "progress"
    )

    Box(
        modifier = Modifier
            .size(size * 1.15f)
            .drawBehind {
                val strokeWidth = this.size.minDimension * 0.06f
                drawArc(
                    brush = Brush.sweepGradient(
                        colors = listOf(
                            color.lighter(0.2f),
                            color,
                            color.darker(0.2f)
                        )
                    ),
                    startAngle = -90f,
                    sweepAngle = 360f * animatedProgress,
                    useCenter = false,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(
                        width = strokeWidth,
                        cap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                )
            }
    )
}

/**
 * Interactive 3D Badge with drag rotation and flip gestures
 */
@Composable
fun Interactive3DBadgeView(
    iconName: ImageVector,
    color: Color,
    isEarned: Boolean = true,
    level: Int = 1,
    badgeName: String,
    badgeDescription: String? = null,
    earnedDate: String? = null,
    modifier: Modifier = Modifier
) {
    var rotationX by remember { mutableFloatStateOf(0f) }
    var rotationY by remember { mutableFloatStateOf(0f) }
    var isFlipped by remember { mutableStateOf(false) }
    var scale by remember { mutableFloatStateOf(1f) }

    val animatedRotationX by animateFloatAsState(
        targetValue = rotationX,
        animationSpec = spring(),
        label = "rotationX"
    )
    val animatedRotationY by animateFloatAsState(
        targetValue = rotationY + if (isFlipped) 180f else 0f,
        animationSpec = spring(),
        label = "rotationY"
    )
    val animatedScale by animateFloatAsState(
        targetValue = scale,
        animationSpec = spring(),
        label = "scale"
    )

    // Auto-rotation animation for earned badges
    val infiniteTransition = rememberInfiniteTransition(label = "autoRotate")
    val autoRotation by infiniteTransition.animateFloat(
        initialValue = -4f,
        targetValue = 4f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "autoRotation"
    )

    val badgeSize = 120.dp

    Box(
        modifier = modifier
            .size(280.dp)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDrag = { _, dragAmount ->
                        rotationY += dragAmount.x * 0.5f
                        rotationX -= dragAmount.y * 0.3f
                        rotationX = rotationX.coerceIn(-30f, 30f)
                    },
                    onDragEnd = {
                        rotationX = 0f
                        rotationY = (rotationY % 360f)
                    }
                )
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = {
                        isFlipped = !isFlipped
                    },
                    onLongPress = {
                        scale = 1.15f
                    },
                    onPress = {
                        awaitRelease()
                        scale = 1f
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        // Ambient glow
        if (isEarned) {
            Box(
                modifier = Modifier
                    .size(280.dp)
                    .blur(10.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                color.copy(alpha = 0.4f),
                                color.copy(alpha = 0.1f),
                                Color.Transparent
                            )
                        ),
                        shape = CircleShape
                    )
            )
        }

        // Badge content with 3D rotation
        Box(
            modifier = Modifier
                .graphicsLayer {
                    this.rotationX = animatedRotationX
                    this.rotationY = animatedRotationY + if (isEarned) autoRotation else 0f
                    this.scaleX = animatedScale
                    this.scaleY = animatedScale
                    this.cameraDistance = 12f * density
                },
            contentAlignment = Alignment.Center
        ) {
            // Front side (badge)
            if (!isFlipped || animatedRotationY % 360 < 90 || animatedRotationY % 360 > 270) {
                Badge3DView(
                    iconName = iconName,
                    color = color,
                    isEarned = isEarned,
                    level = level,
                    size = badgeSize
                )
            }

            // Back side (info) - shown when flipped
            if (isFlipped && animatedRotationY % 360 >= 90 && animatedRotationY % 360 <= 270) {
                BadgeInfoBack(
                    badgeName = badgeName,
                    level = level,
                    earnedDate = earnedDate,
                    color = color,
                    size = badgeSize
                )
            }
        }
    }
}

@Composable
private fun BadgeInfoBack(
    badgeName: String,
    level: Int,
    earnedDate: String?,
    color: Color,
    size: Dp
) {
    Box(
        modifier = Modifier
            .size(size * 1.1f)
            .shadow(
                elevation = 16.dp,
                shape = CircleShape,
                ambientColor = color.copy(alpha = 0.5f),
                spotColor = color.copy(alpha = 0.5f)
            )
            .clip(CircleShape)
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        color.darker(0.3f),
                        color.darker(0.5f)
                    )
                )
            )
            .graphicsLayer {
                // Mirror the content since we're on the back
                rotationY = 180f
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = badgeName,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = (size.value * 0.12f).sp,
                maxLines = 2
            )

            if (level > 1) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Level $level",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = (size.value * 0.09f).sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            earnedDate?.let { date ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = date,
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = (size.value * 0.08f).sp
                )
            }
        }
    }
}

// Color extension functions
private fun Color.lighter(factor: Float): Color {
    return Color(
        red = (red + (1 - red) * factor).coerceIn(0f, 1f),
        green = (green + (1 - green) * factor).coerceIn(0f, 1f),
        blue = (blue + (1 - blue) * factor).coerceIn(0f, 1f),
        alpha = alpha
    )
}

private fun Color.darker(factor: Float): Color {
    val multiplier = 1 - factor
    return Color(
        red = (red * multiplier).coerceIn(0f, 1f),
        green = (green * multiplier).coerceIn(0f, 1f),
        blue = (blue * multiplier).coerceIn(0f, 1f),
        alpha = alpha
    )
}
