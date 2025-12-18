package com.bookpost.ui.screen.membership

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material.icons.filled.Waving
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Membership subscription view with plan selection, benefits, and redeem code
 * Matches iOS MembershipView functionality
 */

data class MembershipPlan(
    val id: String,
    val name: String,
    val description: String,
    val price: Int,
    val originalPrice: Int?,
    val durationDays: Int,
    val discount: Double,
    val isRecommended: Boolean,
    val isAutoRenewal: Boolean
)

data class MembershipStatus(
    val planName: String,
    val expiresAt: String,
    val isActive: Boolean,
    val daysRemaining: Int
)

data class MembershipBenefit(
    val id: String,
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val color: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MembershipScreen(
    onNavigateBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var plans by remember { mutableStateOf<List<MembershipPlan>>(emptyList()) }
    var selectedPlan by remember { mutableStateOf<MembershipPlan?>(null) }
    var currentMembership by remember { mutableStateOf<MembershipStatus?>(null) }
    var showRedeemSheet by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val redeemSheetState = rememberModalBottomSheetState()

    val benefits = remember {
        listOf(
            MembershipBenefit("1", Icons.Default.Book, "无限阅读", "全站电子书免费阅读", Color(0xFF2196F3)),
            MembershipBenefit("2", Icons.Default.Waving, "AI有声书", "AI朗读任意书籍", Color(0xFF9C27B0)),
            MembershipBenefit("3", Icons.Default.Stars, "AI问答", "智能阅读助手", Color(0xFFFF9800)),
            MembershipBenefit("4", Icons.Default.CloudDownload, "离线下载", "随时随地阅读", Color(0xFF4CAF50)),
            MembershipBenefit("5", Icons.Default.CardGiftcard, "专属活动", "会员专享福利", Color(0xFFF44336)),
            MembershipBenefit("6", Icons.Default.Star, "尊贵徽章", "彰显会员身份", Color(0xFFFFEB3B))
        )
    }

    // Load plans
    LaunchedEffect(Unit) {
        delay(500)
        plans = listOf(
            MembershipPlan(
                id = "monthly_auto",
                name = "连续包月",
                description = "自动续费，随时可取消",
                price = 19,
                originalPrice = 30,
                durationDays = 30,
                discount = 0.37,
                isRecommended = true,
                isAutoRenewal = true
            ),
            MembershipPlan(
                id = "monthly",
                name = "月度会员",
                description = "单月会员，不自动续费",
                price = 30,
                originalPrice = null,
                durationDays = 30,
                discount = 0.0,
                isRecommended = false,
                isAutoRenewal = false
            ),
            MembershipPlan(
                id = "quarterly",
                name = "季度会员",
                description = "3个月会员",
                price = 68,
                originalPrice = 90,
                durationDays = 90,
                discount = 0.24,
                isRecommended = false,
                isAutoRenewal = false
            ),
            MembershipPlan(
                id = "yearly",
                name = "年度会员",
                description = "12个月会员，最超值",
                price = 198,
                originalPrice = 360,
                durationDays = 365,
                discount = 0.45,
                isRecommended = false,
                isAutoRenewal = false
            )
        )
        selectedPlan = plans.first { it.isRecommended }

        // Simulate current membership (optional)
        currentMembership = MembershipStatus(
            planName = "连续包月",
            expiresAt = "2025-02-15",
            isActive = true,
            daysRemaining = 15
        )

        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("会员中心") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                }
            )
        },
        bottomBar = {
            // Purchase button
            Surface(
                tonalElevation = 8.dp
            ) {
                Button(
                    onClick = { /* Handle purchase */ },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    enabled = selectedPlan != null,
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2196F3)
                    )
                ) {
                    Text(
                        text = selectedPlan?.let { "立即开通 ¥${it.price}" } ?: "请选择套餐",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Current membership card
                currentMembership?.let { membership ->
                    item {
                        CurrentMembershipCard(membership = membership)
                    }
                }

                // Benefits section
                item {
                    BenefitsSection(benefits = benefits)
                }

                // Plans section
                item {
                    Text(
                        text = "选择套餐",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                items(plans) { plan ->
                    PlanCard(
                        plan = plan,
                        isSelected = selectedPlan?.id == plan.id,
                        onClick = { selectedPlan = plan }
                    )
                }

                // Promo banner
                item {
                    PromoBanner(text = "新用户专享：首月仅需 ¥9.9")
                }

                // Redeem code section
                item {
                    RedeemCodeRow(onClick = { showRedeemSheet = true })
                }

                // FAQ link
                item {
                    FAQRow(onClick = { /* Open FAQ */ })
                }

                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }

    // Redeem code bottom sheet
    if (showRedeemSheet) {
        ModalBottomSheet(
            onDismissRequest = { showRedeemSheet = false },
            sheetState = redeemSheetState
        ) {
            RedeemCodeSheet(
                onDismiss = {
                    scope.launch {
                        redeemSheetState.hide()
                        showRedeemSheet = false
                    }
                }
            )
        }
    }
}

@Composable
private fun CurrentMembershipCard(membership: MembershipStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color(0xFFFF9800).copy(alpha = 0.2f),
                            Color(0xFFFFEB3B).copy(alpha = 0.1f)
                        )
                    )
                )
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "当前会员",
                                style = MaterialTheme.typography.labelLarge
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = membership.planName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "有效期至 ${membership.expiresAt}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Days remaining badge
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "${membership.daysRemaining}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFF9800)
                        )
                        Text(
                            text = "天",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFFF9800)
                        )
                    }
                }

                // Renewal reminder if days remaining <= 7
                if (membership.daysRemaining <= 7) {
                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFFF9800).copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Stars,
                                contentDescription = null,
                                tint = Color(0xFFFF9800),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "会员即将到期，续费享优惠",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "立即续费",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF2196F3)
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BenefitsSection(benefits: List<MembershipBenefit>) {
    Column {
        Text(
            text = "会员权益",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(12.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            benefits.forEach { benefit ->
                BenefitCard(
                    benefit = benefit,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun BenefitCard(
    benefit: MembershipBenefit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = benefit.icon,
                contentDescription = null,
                tint = benefit.color,
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = benefit.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = benefit.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun PlanCard(
    plan: MembershipPlan,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .then(
                if (isSelected) {
                    Modifier.border(2.dp, Color(0xFF2196F3), RoundedCornerShape(12.dp))
                } else {
                    Modifier
                }
            ),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column {
            // Recommended badge
            if (plan.isRecommended) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFFF9800))
                        .padding(vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "推荐",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = plan.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        if (plan.discount > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(0xFFF44336)
                            ) {
                                Text(
                                    text = "${(plan.discount * 100).toInt()}%OFF",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = plan.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Row(
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = "¥",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isSelected) Color(0xFF2196F3) else MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${plan.price}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color(0xFF2196F3) else MaterialTheme.colorScheme.onSurface
                        )
                    }

                    plan.originalPrice?.let { originalPrice ->
                        Text(
                            text = "¥$originalPrice",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textDecoration = TextDecoration.LineThrough
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Selection indicator
                Icon(
                    imageVector = if (isSelected) Icons.Default.CheckCircle else Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = if (isSelected) Color(0xFF2196F3) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f),
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
private fun PromoBanner(text: String) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF44336).copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.CardGiftcard,
                contentDescription = null,
                tint = Color(0xFFF44336),
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Text(
                text = text,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )

            Text(
                text = "立即领取",
                style = MaterialTheme.typography.labelMedium,
                color = Color(0xFF2196F3)
            )
        }
    }
}

@Composable
private fun RedeemCodeRow(onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.ConfirmationNumber,
                contentDescription = null,
                tint = Color(0xFF2196F3),
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Text(
                text = "使用兑换码",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun FAQRow(onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = Icons.Default.Help,
            contentDescription = null,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = "会员常见问题",
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun RedeemCodeSheet(
    onDismiss: () -> Unit
) {
    var code by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "兑换码",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "请输入兑换码",
            style = MaterialTheme.typography.titleMedium
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = code,
            onValueChange = {
                code = it.uppercase()
                errorMessage = null
            },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("请输入兑换码") },
            isError = errorMessage != null,
            supportingText = errorMessage?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
            singleLine = true
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                isLoading = true
                // Simulate API call
                // After delay, set errorMessage or success
                isLoading = false
                errorMessage = "兑换码无效或已过期"
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = code.isNotBlank() && !isLoading,
            shape = RoundedCornerShape(24.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = Color.White
                )
            } else {
                Text("立即兑换")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "兑换码可在官方活动、合作渠道获得，每个账号仅能使用一次",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}
