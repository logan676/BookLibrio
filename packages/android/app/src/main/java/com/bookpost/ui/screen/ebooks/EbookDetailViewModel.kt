package com.bookpost.ui.screen.ebooks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.EbookRepository
import com.bookpost.domain.model.Ebook
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EbookDetailUiState(
    val isLoading: Boolean = false,
    val ebook: Ebook? = null,
    val error: String? = null
)

@HiltViewModel
class EbookDetailViewModel @Inject constructor(
    private val ebookRepository: EbookRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EbookDetailUiState())
    val uiState: StateFlow<EbookDetailUiState> = _uiState.asStateFlow()

    fun loadEbook(id: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // First try to load from cache
            val cached = ebookRepository.getCachedEbook(id)
            if (cached != null) {
                _uiState.value = _uiState.value.copy(ebook = cached)
            }

            // Then fetch from network
            when (val result = ebookRepository.getEbook(id)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        ebook = result.data
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = if (cached == null) result.message else null
                    )
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
}
