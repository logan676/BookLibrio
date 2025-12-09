package com.bookpost.ui.screen.magazines

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.R
import com.bookpost.ui.components.BookCoverImage
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.util.formatFileSize

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MagazineDetailScreen(
    magazineId: Int,
    onNavigateBack: () -> Unit,
    onReadClick: (Int) -> Unit,
    viewModel: MagazineDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(magazineId) {
        viewModel.loadMagazine(magazineId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.magazine?.title ?: "") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                LoadingState(modifier = Modifier.padding(paddingValues))
            }
            uiState.error != null -> {
                ErrorState(
                    message = uiState.error ?: "未知错误",
                    onRetry = { viewModel.loadMagazine(magazineId) },
                    modifier = Modifier.padding(paddingValues)
                )
            }
            uiState.magazine != null -> {
                val magazine = uiState.magazine!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        BookCoverImage(
                            coverUrl = magazine.coverUrl,
                            contentDescription = magazine.title,
                            modifier = Modifier
                                .width(150.dp)
                                .aspectRatio(0.7f)
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = magazine.title,
                                style = MaterialTheme.typography.titleLarge
                            )

                            magazine.year?.let { year ->
                                Text(
                                    text = "年份: $year",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            magazine.pageCount?.let { pages ->
                                Text(
                                    text = "页数: $pages",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            magazine.fileSize?.let { size ->
                                Text(
                                    text = "大小: ${size.formatFileSize()}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { onReadClick(magazine.id) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(stringResource(R.string.start_reading))
                    }
                }
            }
        }
    }
}
