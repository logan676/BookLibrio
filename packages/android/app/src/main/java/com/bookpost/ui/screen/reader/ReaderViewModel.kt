package com.bookpost.ui.screen.reader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.EbookRepository
import com.bookpost.data.repository.MagazineRepository
import com.bookpost.data.repository.ReadingHistoryRepository
import com.bookpost.domain.model.ItemType
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class ReaderUiState(
    val isLoading: Boolean = false,
    val pdfFile: File? = null,
    val title: String? = null,
    val lastPage: Int = 0,
    val downloadProgress: Float = 0f,
    val error: String? = null
)

@HiltViewModel
class ReaderViewModel @Inject constructor(
    private val ebookRepository: EbookRepository,
    private val magazineRepository: MagazineRepository,
    private val readingHistoryRepository: ReadingHistoryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    fun loadPdf(type: String, id: Int, context: Context) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Get title and last reading position
            val itemType = if (type == "ebook") ItemType.EBOOK else ItemType.MAGAZINE
            val title = when (type) {
                "ebook" -> ebookRepository.getCachedEbook(id)?.title
                "magazine" -> magazineRepository.getCachedMagazine(id)?.title
                else -> null
            }

            val lastPage = readingHistoryRepository.getCachedReadingHistoryEntry(itemType, id)?.lastPage ?: 0

            _uiState.value = _uiState.value.copy(
                title = title,
                lastPage = lastPage
            )

            // Check if file is already cached
            val cacheDir = File(context.cacheDir, "pdfs/$type")
            cacheDir.mkdirs()
            val cachedFile = File(cacheDir, "$id.pdf")

            if (cachedFile.exists() && cachedFile.length() > 0) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    pdfFile = cachedFile
                )
                return@launch
            }

            // Download file
            val result = when (type) {
                "ebook" -> ebookRepository.getEbookFile(id)
                "magazine" -> magazineRepository.getMagazineFile(id)
                else -> NetworkResult.Error("Unknown type")
            }

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
                                            _uiState.value = _uiState.value.copy(
                                                downloadProgress = progress
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            pdfFile = cachedFile
                        )
                    } catch (e: Exception) {
                        cachedFile.delete()
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "文件下载失败: ${e.message}"
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun saveReadingProgress(type: String, id: Int, page: Int) {
        viewModelScope.launch {
            val itemType = if (type == "ebook") ItemType.EBOOK else ItemType.MAGAZINE
            readingHistoryRepository.updateReadingHistory(
                itemType = itemType,
                itemId = id,
                title = _uiState.value.title,
                lastPage = page
            )
        }
    }
}
