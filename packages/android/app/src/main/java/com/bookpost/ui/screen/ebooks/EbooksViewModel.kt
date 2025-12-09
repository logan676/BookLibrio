package com.bookpost.ui.screen.ebooks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.EbookRepository
import com.bookpost.domain.model.Ebook
import com.bookpost.domain.model.EbookCategory
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EbooksUiState(
    val isLoading: Boolean = false,
    val ebooks: List<Ebook> = emptyList(),
    val categories: List<EbookCategory> = emptyList(),
    val selectedCategoryId: Int? = null,
    val searchQuery: String = "",
    val total: Int = 0,
    val error: String? = null
)

@HiltViewModel
class EbooksViewModel @Inject constructor(
    private val ebookRepository: EbookRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EbooksUiState())
    val uiState: StateFlow<EbooksUiState> = _uiState.asStateFlow()

    init {
        loadCategories()
        loadEbooks()
    }

    private fun loadCategories() {
        viewModelScope.launch {
            when (val result = ebookRepository.getCategories()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(categories = result.data)
                }
                is NetworkResult.Error -> {
                    // Categories are optional, don't show error
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun loadEbooks() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = ebookRepository.getEbooks(
                category = _uiState.value.selectedCategoryId,
                search = _uiState.value.searchQuery.takeIf { it.isNotBlank() }
            )

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        ebooks = result.data.first,
                        total = result.data.second
                    )
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

    fun selectCategory(categoryId: Int?) {
        _uiState.value = _uiState.value.copy(selectedCategoryId = categoryId)
        loadEbooks()
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadEbooks()
    }

    fun refresh() {
        loadEbooks()
    }
}
