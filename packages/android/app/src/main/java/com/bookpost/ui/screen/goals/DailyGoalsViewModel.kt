package com.bookpost.ui.screen.goals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.ReadingSessionRepository
import com.bookpost.domain.model.DailyGoal
import com.bookpost.domain.model.DailyGoalResponse
import com.bookpost.domain.model.GoalPreset
import com.bookpost.domain.model.StreakInfo
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DailyGoalsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val hasGoal: Boolean = false,
    val goal: DailyGoal? = null,
    val streak: StreakInfo = StreakInfo(current = 0, max = 0),
    val errorMessage: String? = null
)

@HiltViewModel
class DailyGoalsViewModel @Inject constructor(
    private val repository: ReadingSessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DailyGoalsUiState())
    val uiState: StateFlow<DailyGoalsUiState> = _uiState.asStateFlow()

    init {
        loadGoal()
    }

    fun loadGoal() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            when (val result = repository.getDailyGoal()) {
                is NetworkResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            hasGoal = data.hasGoal,
                            goal = data.goal,
                            streak = data.streak
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already set loading state
                }
            }
        }
    }

    fun setGoal(preset: GoalPreset) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }

            when (val result = repository.setDailyGoal(preset.minutes)) {
                is NetworkResult.Success -> {
                    // Reload goal to get updated data
                    loadGoal()
                    _uiState.update { it.copy(isSaving = false) }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            errorMessage = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already set saving state
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
