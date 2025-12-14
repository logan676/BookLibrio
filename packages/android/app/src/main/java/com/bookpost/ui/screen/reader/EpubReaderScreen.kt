package com.bookpost.ui.screen.reader

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookpost.domain.model.ReadingSettings
import com.bookpost.domain.model.TOCItem
import com.bookpost.ui.components.ErrorState
import com.bookpost.ui.components.LoadingState
import com.bookpost.ui.screen.reader.components.ReaderSettingsSheet
import com.bookpost.ui.screen.reader.components.TableOfContentsSheet
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EpubReaderScreen(
    ebookId: Int,
    onNavigateBack: () -> Unit,
    viewModel: EpubReaderViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val uiState by viewModel.uiState.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val sessionState by viewModel.sessionState.collectAsState()
    val scope = rememberCoroutineScope()

    var showSettings by remember { mutableStateOf(false) }
    var showTableOfContents by remember { mutableStateOf(false) }
    var showToolbar by remember { mutableStateOf(true) }

    val settingsSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val tocSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(ebookId) {
        viewModel.loadEpub(ebookId, context)
    }

    // Handle lifecycle events for session pause/resume
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> viewModel.pauseSession()
                Lifecycle.Event.ON_RESUME -> viewModel.resumeSession()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val backgroundColor = settings.colorMode.getBackgroundColor()

    Scaffold(
        topBar = {
            if (showToolbar) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = uiState.title ?: "阅读",
                                maxLines = 1
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                uiState.currentPosition?.let { pos ->
                                    Text(
                                        text = pos.formattedProgress,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                if (sessionState.isActive) {
                                    Text(
                                        text = "⏱ ${viewModel.getFormattedDuration()}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            uiState.currentPosition?.let { pos ->
                                viewModel.updateReadingProgress(
                                    ebookId,
                                    pos.currentPage ?: 0,
                                    pos.progress,
                                    pos.cfi
                                )
                            }
                            viewModel.endSession()
                            onNavigateBack()
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showTableOfContents = true }) {
                            Icon(Icons.Filled.List, contentDescription = "目录")
                        }
                        IconButton(onClick = { /* TODO: Bookmarks */ }) {
                            Icon(Icons.Filled.Bookmark, contentDescription = "书签")
                        }
                        IconButton(onClick = { showSettings = true }) {
                            Icon(Icons.Filled.Settings, contentDescription = "设置")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = backgroundColor
                    )
                )
            }
        },
        containerColor = backgroundColor
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(backgroundColor)
        ) {
            when {
                uiState.isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        LoadingState()
                        if (uiState.downloadProgress > 0f) {
                            LinearProgressIndicator(
                                progress = { uiState.downloadProgress },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            )
                            Text(
                                text = "${(uiState.downloadProgress * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: "加载失败",
                        onRetry = { viewModel.loadEpub(ebookId, context) }
                    )
                }
                uiState.epubFilePath != null -> {
                    EpubWebView(
                        epubFilePath = uiState.epubFilePath!!,
                        settings = settings,
                        onProgressChanged = { page, total, progress, cfi ->
                            viewModel.updateReadingProgress(ebookId, page, progress, cfi)
                        },
                        onTocLoaded = { toc ->
                            viewModel.updateTableOfContents(toc)
                        },
                        onTap = {
                            showToolbar = !showToolbar
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }

    // Settings Bottom Sheet
    if (showSettings) {
        ModalBottomSheet(
            onDismissRequest = { showSettings = false },
            sheetState = settingsSheetState
        ) {
            ReaderSettingsSheet(
                settings = settings,
                onSettingsChange = { newSettings ->
                    viewModel.updateSettings(newSettings)
                },
                onDismiss = {
                    scope.launch {
                        settingsSheetState.hide()
                        showSettings = false
                    }
                }
            )
        }
    }

    // Table of Contents Bottom Sheet
    if (showTableOfContents) {
        ModalBottomSheet(
            onDismissRequest = { showTableOfContents = false },
            sheetState = tocSheetState
        ) {
            TableOfContentsSheet(
                items = uiState.tableOfContents,
                onItemClick = { item ->
                    // Navigate to chapter
                    scope.launch {
                        tocSheetState.hide()
                        showTableOfContents = false
                    }
                },
                onDismiss = {
                    scope.launch {
                        tocSheetState.hide()
                        showTableOfContents = false
                    }
                }
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun EpubWebView(
    epubFilePath: String,
    settings: ReadingSettings,
    onProgressChanged: (page: Int, total: Int, progress: Double, cfi: String?) -> Unit,
    onTocLoaded: (List<TOCItem>) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    var webView by remember { mutableStateOf<WebView?>(null) }

    // Update settings when they change
    LaunchedEffect(settings) {
        webView?.let { wv ->
            val bgColor = String.format("#%06X", 0xFFFFFF and settings.colorMode.getBackgroundColor().toArgb())
            val textColor = String.format("#%06X", 0xFFFFFF and settings.colorMode.getTextColor().toArgb())

            wv.evaluateJavascript(
                """
                if (typeof updateReaderSettings === 'function') {
                    updateReaderSettings({
                        fontSize: ${settings.fontSize},
                        lineHeight: ${settings.lineSpacing.multiplier},
                        backgroundColor: '$bgColor',
                        textColor: '$textColor',
                        marginHorizontal: ${settings.marginSize.horizontalPadding},
                        marginVertical: ${settings.marginSize.verticalPadding}
                    });
                }
                """.trimIndent(),
                null
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webView?.destroy()
        }
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                }

                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        // Page loaded
                    }
                }

                addJavascriptInterface(
                    EpubJsInterface(
                        onProgressChanged = onProgressChanged,
                        onTocLoaded = onTocLoaded,
                        onTap = onTap
                    ),
                    "Android"
                )

                // Load EPUB reader HTML
                val epubReaderHtml = createEpubReaderHtml(epubFilePath)
                loadDataWithBaseURL(
                    "file://${File(epubFilePath).parent}/",
                    epubReaderHtml,
                    "text/html",
                    "UTF-8",
                    null
                )

                webView = this
            }
        },
        modifier = modifier
    )
}

private class EpubJsInterface(
    private val onProgressChanged: (page: Int, total: Int, progress: Double, cfi: String?) -> Unit,
    private val onTocLoaded: (List<TOCItem>) -> Unit,
    private val onTap: () -> Unit
) {
    @JavascriptInterface
    fun onProgress(page: Int, total: Int, progress: Double, cfi: String?) {
        onProgressChanged(page, total, progress, cfi)
    }

    @JavascriptInterface
    fun onTableOfContents(tocJson: String) {
        // Parse TOC JSON and call callback
        // For now, empty implementation
        onTocLoaded(emptyList())
    }

    @JavascriptInterface
    fun onCenterTap() {
        onTap()
    }
}

private fun createEpubReaderHtml(epubFilePath: String): String {
    return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { height: 100%; overflow: hidden; }
                #viewer { width: 100%; height: 100%; }
                .epub-container { height: 100% !important; }
            </style>
        </head>
        <body>
            <div id="viewer"></div>
            <script>
                var book = ePub("file://$epubFilePath");
                var rendition = book.renderTo("viewer", {
                    width: "100%",
                    height: "100%",
                    spread: "none"
                });

                rendition.display();

                // Handle navigation
                rendition.on("relocated", function(location) {
                    var progress = book.locations.percentageFromCfi(location.start.cfi);
                    var page = location.start.displayed.page || 0;
                    var total = location.start.displayed.total || 0;
                    Android.onProgress(page, total, progress || 0, location.start.cfi);
                });

                // Handle tap for toolbar toggle
                rendition.on("click", function(e) {
                    var width = window.innerWidth;
                    var x = e.clientX;
                    if (x > width * 0.3 && x < width * 0.7) {
                        Android.onCenterTap();
                    }
                });

                // Load TOC
                book.loaded.navigation.then(function(nav) {
                    var toc = JSON.stringify(nav.toc);
                    Android.onTableOfContents(toc);
                });

                // Settings update function
                function updateReaderSettings(settings) {
                    rendition.themes.default({
                        body: {
                            "font-size": settings.fontSize + "px",
                            "line-height": settings.lineHeight,
                            "background-color": settings.backgroundColor,
                            "color": settings.textColor,
                            "padding-left": settings.marginHorizontal + "px",
                            "padding-right": settings.marginHorizontal + "px",
                            "padding-top": settings.marginVertical + "px",
                            "padding-bottom": settings.marginVertical + "px"
                        }
                    });
                    rendition.themes.select("default");
                }

                // Navigation functions
                function nextPage() { rendition.next(); }
                function prevPage() { rendition.prev(); }
                function goToChapter(href) { rendition.display(href); }
                function goToCfi(cfi) { rendition.display(cfi); }
            </script>
        </body>
        </html>
    """.trimIndent()
}
