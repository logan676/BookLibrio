package com.bookpost.ui.screen.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.ReadingStatsRepository
import com.bookpost.domain.model.CalendarStatsResponse
import com.bookpost.domain.model.StatsDimension
import com.bookpost.domain.model.TotalStatsResponse
import com.bookpost.domain.model.WeekStatsResponse
import com.bookpost.domain.model.YearStatsResponse
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class ReadingStatsUiState(
    val isLoading: Boolean = true,
    val selectedDimension: StatsDimension = StatsDimension.WEEK,
    val selectedDate: LocalDate = LocalDate.now(),
    val currentYear: Int = LocalDate.now().year,

    // Stats data
    val weekStats: WeekStatsResponse? = null,
    val monthStats: WeekStatsResponse? = null,
    val yearStats: YearStatsResponse? = null,
    val totalStats: TotalStatsResponse? = null,
    val calendarStats: CalendarStatsResponse? = null,

    val errorMessage: String? = null
) {
    val dateRangeText: String
        get() = when (selectedDimension) {
            StatsDimension.WEEK -> weekStats?.let {
                "${it.dateRange.start} - ${it.dateRange.end}"
            } ?: "本周"
            StatsDimension.MONTH, StatsDimension.CALENDAR -> {
                val formatter = DateTimeFormatter.ofPattern("yyyy年M月")
                selectedDate.format(formatter)
            }
            StatsDimension.YEAR -> "${currentYear}年"
            StatsDimension.TOTAL -> "全部时间"
        }
}

@HiltViewModel
class ReadingStatsViewModel @Inject constructor(
    private val repository: ReadingStatsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReadingStatsUiState())
    val uiState: StateFlow<ReadingStatsUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    fun loadStats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            when (_uiState.value.selectedDimension) {
                StatsDimension.WEEK -> loadWeekStats()
                StatsDimension.MONTH -> loadMonthStats()
                StatsDimension.YEAR -> loadYearStats()
                StatsDimension.TOTAL -> loadTotalStats()
                StatsDimension.CALENDAR -> loadCalendarStats()
            }
        }
    }

    fun setDimension(dimension: StatsDimension) {
        if (dimension != _uiState.value.selectedDimension) {
            _uiState.update { it.copy(selectedDimension = dimension) }
            loadStats()
        }
    }

    fun goToPreviousPeriod() {
        val state = _uiState.value
        when (state.selectedDimension) {
            StatsDimension.WEEK -> {
                _uiState.update { it.copy(selectedDate = it.selectedDate.minusWeeks(1)) }
            }
            StatsDimension.MONTH, StatsDimension.CALENDAR -> {
                _uiState.update { it.copy(selectedDate = it.selectedDate.minusMonths(1)) }
            }
            StatsDimension.YEAR -> {
                _uiState.update { it.copy(currentYear = it.currentYear - 1) }
            }
            StatsDimension.TOTAL -> { /* No navigation for total */ }
        }
        loadStats()
    }

    fun goToNextPeriod() {
        val state = _uiState.value
        val today = LocalDate.now()

        when (state.selectedDimension) {
            StatsDimension.WEEK -> {
                if (state.selectedDate.plusWeeks(1) <= today) {
                    _uiState.update { it.copy(selectedDate = it.selectedDate.plusWeeks(1)) }
                    loadStats()
                }
            }
            StatsDimension.MONTH, StatsDimension.CALENDAR -> {
                if (state.selectedDate.plusMonths(1) <= today) {
                    _uiState.update { it.copy(selectedDate = it.selectedDate.plusMonths(1)) }
                    loadStats()
                }
            }
            StatsDimension.YEAR -> {
                if (state.currentYear + 1 <= today.year) {
                    _uiState.update { it.copy(currentYear = it.currentYear + 1) }
                    loadStats()
                }
            }
            StatsDimension.TOTAL -> { /* No navigation for total */ }
        }
    }

    private suspend fun loadWeekStats() {
        val dateStr = _uiState.value.selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
        when (val result = repository.getWeekStats(dateStr)) {
            is NetworkResult.Success -> {
                _uiState.update {
                    it.copy(isLoading = false, weekStats = result.data)
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
            }
            is NetworkResult.Loading -> {}
        }
    }

    private suspend fun loadMonthStats() {
        val date = _uiState.value.selectedDate
        when (val result = repository.getMonthStats(date.year, date.monthValue)) {
            is NetworkResult.Success -> {
                _uiState.update {
                    it.copy(isLoading = false, monthStats = result.data)
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
            }
            is NetworkResult.Loading -> {}
        }
    }

    private suspend fun loadYearStats() {
        when (val result = repository.getYearStats(_uiState.value.currentYear)) {
            is NetworkResult.Success -> {
                _uiState.update {
                    it.copy(isLoading = false, yearStats = result.data)
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
            }
            is NetworkResult.Loading -> {}
        }
    }

    private suspend fun loadTotalStats() {
        when (val result = repository.getTotalStats()) {
            is NetworkResult.Success -> {
                _uiState.update {
                    it.copy(isLoading = false, totalStats = result.data)
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
            }
            is NetworkResult.Loading -> {}
        }
    }

    private suspend fun loadCalendarStats() {
        val date = _uiState.value.selectedDate
        when (val result = repository.getCalendarStats(date.year, date.monthValue)) {
            is NetworkResult.Success -> {
                _uiState.update {
                    it.copy(isLoading = false, calendarStats = result.data)
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
            }
            is NetworkResult.Loading -> {}
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
