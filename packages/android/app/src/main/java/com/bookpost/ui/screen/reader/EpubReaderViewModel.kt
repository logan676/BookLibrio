package com.bookpost.ui.screen.reader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.local.datastore.ReadingSettingsStore
import com.bookpost.data.local.ReadingSessionManager
import com.bookpost.data.repository.EbookRepository
import com.bookpost.data.repository.ReadingHistoryRepository
import com.bookpost.domain.model.EpubReaderState
import com.bookpost.domain.model.Highlight
import com.bookpost.domain.model.HighlightColor
import com.bookpost.domain.model.ItemType
import com.bookpost.domain.model.ReadingPosition
import com.bookpost.domain.model.ReadingSettings
import com.bookpost.domain.model.TOCItem
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

@HiltViewModel
class EpubReaderViewModel @Inject constructor(
    private val ebookRepository: EbookRepository,
    private val readingHistoryRepository: ReadingHistoryRepository,
    private val readingSettingsStore: ReadingSettingsStore,
    private val sessionManager: ReadingSessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(EpubReaderState())
    val uiState: StateFlow<EpubReaderState> = _uiState.asStateFlow()

    val settings: StateFlow<ReadingSettings> = readingSettingsStore.settings
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            ReadingSettings.Default
        )

    // Reading session state
    val sessionState = sessionManager.sessionState
    val milestonesAchieved = sessionManager.milestonesAchieved

    private var epubFile: File? = null
    private var currentBookId: Int = 0

    fun loadEpub(ebookId: Int, context: Context) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Get ebook metadata
            val ebook = ebookRepository.getCachedEbook(ebookId)
            _uiState.update {
                it.copy(
                    title = ebook?.title,
                    author = ebook?.author,
                    coverUrl = ebook?.coverUrl
                )
            }

            // Get last reading position
            val lastPosition = readingHistoryRepository.getCachedReadingHistoryEntry(
                ItemType.EBOOK,
                ebookId
            )

            // Check cache
            val cacheDir = File(context.cacheDir, "epubs")
            cacheDir.mkdirs()
            val cachedFile = File(cacheDir, "$ebookId.epub")

            if (cachedFile.exists() && cachedFile.length() > 0) {
                epubFile = cachedFile
                loadEpubContent(ebookId, cachedFile, lastPosition?.lastPage)
                return@launch
            }

            // Download EPUB file
            val result = ebookRepository.getEbookFile(ebookId)
            when (result) {
                is NetworkResult.Success -> {
                    try {
                        withContext(Dispatchers.IO) {
                            val body = result.data
                            val totalBytes = body.contentLength()
                            var downloadedBytes = 0L

                            body.byteStream().use { inputStream ->
                                FileOutputStream(cachedFile).use { outputStream ->
                                    val buffer = ByteArray(8192)
                                    var bytesRead: Int

                                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                                        outputStream.write(buffer, 0, bytesRead)
                                        downloadedBytes += bytesRead

                                        if (totalBytes > 0) {
                                            val progress = downloadedBytes.toFloat() / totalBytes
                                            _uiState.update { it.copy(downloadProgress = progress) }
                                        }
                                    }
                                }
                            }
                        }

                        epubFile = cachedFile
                        loadEpubContent(ebookId, cachedFile, lastPosition?.lastPage)
                    } catch (e: Exception) {
                        cachedFile.delete()
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "文件下载失败: ${e.message}"
                            )
                        }
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    private suspend fun loadEpubContent(ebookId: Int, file: File, lastPage: Int?) {
        try {
            currentBookId = ebookId

            // Load underlines/highlights
            loadHighlights(ebookId)

            // Start reading session
            sessionManager.startSession(
                bookId = ebookId,
                bookType = "ebook",
                chapterIndex = lastPage
            )

            _uiState.update {
                it.copy(
                    isLoading = false,
                    epubFilePath = file.absolutePath,
                    currentPosition = ReadingPosition(
                        bookId = ebookId,
                        bookType = "ebook",
                        currentPage = lastPage,
                        progress = 0.0
                    )
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = "EPUB解析失败: ${e.message}"
                )
            }
        }
    }

    private suspend fun loadHighlights(ebookId: Int) {
        when (val result = ebookRepository.getUnderlines(ebookId)) {
            is NetworkResult.Success -> {
                val highlights = result.data.map { underline ->
                    Highlight(
                        id = underline.id,
                        bookId = ebookId,
                        bookType = "ebook",
                        userId = 0,
                        text = underline.text ?: "",
                        pageNumber = underline.paragraph,
                        chapterIndex = underline.chapterIndex,
                        paragraphIndex = underline.paragraphIndex,
                        startOffset = underline.startOffset,
                        endOffset = underline.endOffset,
                        cfiRange = underline.cfiRange,
                        color = HighlightColor.YELLOW,
                        ideaCount = underline.ideaCount ?: 0,
                        createdAt = underline.createdAt
                    )
                }
                _uiState.update { it.copy(highlights = highlights) }
            }
            else -> {}
        }
    }

    fun updateReadingProgress(ebookId: Int, page: Int, progress: Double, cfi: String? = null) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    currentPosition = state.currentPosition?.copy(
                        currentPage = page,
                        progress = progress,
                        cfi = cfi
                    )
                )
            }

            readingHistoryRepository.updateReadingHistory(
                itemType = ItemType.EBOOK,
                itemId = ebookId,
                title = _uiState.value.title,
                lastPage = page
            )
        }
    }

    fun updateTableOfContents(toc: List<TOCItem>) {
        _uiState.update { it.copy(tableOfContents = toc) }
    }

    fun createHighlight(
        ebookId: Int,
        text: String,
        cfiRange: String? = null,
        chapterIndex: Int? = null,
        paragraphIndex: Int? = null,
        startOffset: Int? = null,
        endOffset: Int? = null
    ) {
        viewModelScope.launch {
            ebookRepository.createUnderline(
                ebookId = ebookId,
                text = text,
                cfiRange = cfiRange,
                chapterIndex = chapterIndex,
                paragraphIndex = paragraphIndex,
                startOffset = startOffset,
                endOffset = endOffset
            )
            // Reload highlights
            loadHighlights(ebookId)
        }
    }

    fun deleteHighlight(ebookId: Int, highlightId: Int) {
        viewModelScope.launch {
            ebookRepository.deleteUnderline(ebookId, highlightId)
            _uiState.update { state ->
                state.copy(highlights = state.highlights.filter { it.id != highlightId })
            }
        }
    }

    // Settings updates
    fun updateSettings(settings: ReadingSettings) {
        viewModelScope.launch {
            readingSettingsStore.updateSettings(settings)
        }
    }

    fun updateFontSize(size: Float) {
        viewModelScope.launch {
            readingSettingsStore.updateFontSize(size)
        }
    }

    fun updateColorMode(mode: com.bookpost.domain.model.ColorMode) {
        viewModelScope.launch {
            readingSettingsStore.updateColorMode(mode)
        }
    }

    fun updateLineSpacing(spacing: com.bookpost.domain.model.LineSpacing) {
        viewModelScope.launch {
            readingSettingsStore.updateLineSpacing(spacing)
        }
    }

    fun updateMarginSize(size: com.bookpost.domain.model.MarginSize) {
        viewModelScope.launch {
            readingSettingsStore.updateMarginSize(size)
        }
    }

    fun updateBrightness(brightness: Float) {
        viewModelScope.launch {
            readingSettingsStore.updateBrightness(brightness)
        }
    }

    fun getEpubFile(): File? = epubFile

    /**
     * End the current reading session
     */
    fun endSession() {
        viewModelScope.launch {
            val position = _uiState.value.currentPosition
            sessionManager.endSession(
                position = position?.cfi,
                chapterIndex = position?.currentPage,
                pagesRead = position?.currentPage
            )
        }
    }

    /**
     * Pause the current reading session (e.g., when app goes to background)
     */
    fun pauseSession() {
        viewModelScope.launch {
            sessionManager.pauseSession()
        }
    }

    /**
     * Resume the reading session
     */
    fun resumeSession() {
        viewModelScope.launch {
            sessionManager.resumeSession()
        }
    }

    /**
     * Clear milestones after showing them
     */
    fun clearMilestones() {
        sessionManager.clearMilestones()
    }

    /**
     * Get formatted reading duration
     */
    fun getFormattedDuration(): String = sessionManager.getFormattedDuration()

    override fun onCleared() {
        super.onCleared()
        // End session when ViewModel is cleared
        viewModelScope.launch {
            val position = _uiState.value.currentPosition
            sessionManager.endSession(
                position = position?.cfi,
                chapterIndex = position?.currentPage,
                pagesRead = position?.currentPage
            )
        }
    }
}
