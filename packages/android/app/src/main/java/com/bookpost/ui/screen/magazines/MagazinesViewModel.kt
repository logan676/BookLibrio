package com.bookpost.ui.screen.magazines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.MagazineRepository
import com.bookpost.domain.model.Magazine
import com.bookpost.domain.model.Publisher
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MagazinesUiState(
    val isLoading: Boolean = false,
    val magazines: List<Magazine> = emptyList(),
    val publishers: List<Publisher> = emptyList(),
    val selectedPublisherId: Int? = null,
    val selectedYear: Int? = null,
    val searchQuery: String = "",
    val total: Int = 0,
    val error: String? = null
)

@HiltViewModel
class MagazinesViewModel @Inject constructor(
    private val magazineRepository: MagazineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MagazinesUiState())
    val uiState: StateFlow<MagazinesUiState> = _uiState.asStateFlow()

    init {
        loadPublishers()
        loadMagazines()
    }

    private fun loadPublishers() {
        viewModelScope.launch {
            when (val result = magazineRepository.getPublishers()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(publishers = result.data)
                }
                is NetworkResult.Error -> {}
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun loadMagazines() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = magazineRepository.getMagazines(
                publisher = _uiState.value.selectedPublisherId,
                year = _uiState.value.selectedYear,
                search = _uiState.value.searchQuery.takeIf { it.isNotBlank() }
            )

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        magazines = result.data.first,
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

    fun selectPublisher(publisherId: Int?) {
        _uiState.value = _uiState.value.copy(selectedPublisherId = publisherId)
        loadMagazines()
    }

    fun selectYear(year: Int?) {
        _uiState.value = _uiState.value.copy(selectedYear = year)
        loadMagazines()
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadMagazines()
    }

    fun refresh() {
        loadMagazines()
    }
}
