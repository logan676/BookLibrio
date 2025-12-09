package com.bookpost.ui.screen.magazines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.MagazineRepository
import com.bookpost.domain.model.Magazine
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MagazineDetailUiState(
    val isLoading: Boolean = false,
    val magazine: Magazine? = null,
    val error: String? = null
)

@HiltViewModel
class MagazineDetailViewModel @Inject constructor(
    private val magazineRepository: MagazineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MagazineDetailUiState())
    val uiState: StateFlow<MagazineDetailUiState> = _uiState.asStateFlow()

    fun loadMagazine(id: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val cached = magazineRepository.getCachedMagazine(id)
            if (cached != null) {
                _uiState.value = _uiState.value.copy(magazine = cached)
            }

            when (val result = magazineRepository.getMagazine(id)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        magazine = result.data
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
