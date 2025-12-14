package com.bookpost.ui.screen.badges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.BadgeRepository
import com.bookpost.domain.model.BadgeCategory
import com.bookpost.domain.model.BadgeItem
import com.bookpost.domain.model.BadgeWithProgress
import com.bookpost.domain.model.CategorySummary
import com.bookpost.domain.model.EarnedBadge
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BadgesUiState(
    val isLoading: Boolean = true,
    val earnedBadges: List<EarnedBadge> = emptyList(),
    val inProgressBadges: List<BadgeWithProgress> = emptyList(),
    val categorySummaries: Map<String, CategorySummary> = emptyMap(),
    val newBadges: List<EarnedBadge> = emptyList(),
    val showNewBadgeAlert: Boolean = false,
    val errorMessage: String? = null
) {
    val totalEarned: Int
        get() = categorySummaries.values.sumOf { it.earned }

    val totalBadges: Int
        get() = categorySummaries.values.sumOf { it.total }

    val earnedPercentage: Double
        get() = if (totalBadges > 0) totalEarned.toDouble() / totalBadges * 100 else 0.0

    val sortedCategories: List<BadgeCategory>
        get() = categorySummaries.keys
            .mapNotNull { key -> BadgeCategory.entries.find { it.value == key } }
            .sortedBy { it.displayName }
}

@HiltViewModel
class BadgesViewModel @Inject constructor(
    private val repository: BadgeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState.asStateFlow()

    init {
        loadBadges()
    }

    fun loadBadges() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            when (val result = repository.getUserBadges()) {
                is NetworkResult.Success -> {
                    val data = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            earnedBadges = data.earned,
                            inProgressBadges = data.inProgress,
                            categorySummaries = data.categories
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
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun checkNewBadges() {
        viewModelScope.launch {
            when (val result = repository.checkNewBadges()) {
                is NetworkResult.Success -> {
                    val newBadges = result.data.newBadges
                    if (newBadges.isNotEmpty()) {
                        _uiState.update {
                            it.copy(
                                newBadges = newBadges,
                                showNewBadgeAlert = true
                            )
                        }
                        // Reload badges to update the list
                        loadBadges()
                    }
                }
                else -> {}
            }
        }
    }

    fun dismissNewBadgeAlert() {
        _uiState.update {
            it.copy(
                showNewBadgeAlert = false,
                newBadges = emptyList()
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    /**
     * Get earned badges filtered by category
     */
    fun earnedBadgesForCategory(category: BadgeCategory): List<EarnedBadge> {
        return _uiState.value.earnedBadges.filter { it.category == category.value }
    }

    /**
     * Get in-progress badges filtered by category
     */
    fun inProgressBadgesForCategory(category: BadgeCategory): List<BadgeWithProgress> {
        return _uiState.value.inProgressBadges.filter { it.badge.category == category.value }
    }

    /**
     * Convert earned badges to BadgeItems for display
     */
    fun getEarnedBadgeItems(): List<BadgeItem> {
        return _uiState.value.earnedBadges.map { BadgeItem.Earned(it) }
    }

    /**
     * Convert in-progress badges to BadgeItems for display
     */
    fun getInProgressBadgeItems(): List<BadgeItem> {
        return _uiState.value.inProgressBadges.map { BadgeItem.InProgress(it) }
    }

    /**
     * Get badge items for a specific category
     */
    fun getBadgeItemsForCategory(category: BadgeCategory): Pair<List<BadgeItem>, List<BadgeItem>> {
        val earned = earnedBadgesForCategory(category).map { BadgeItem.Earned(it) }
        val inProgress = inProgressBadgesForCategory(category).map { BadgeItem.InProgress(it) }
        return Pair(earned, inProgress)
    }
}
