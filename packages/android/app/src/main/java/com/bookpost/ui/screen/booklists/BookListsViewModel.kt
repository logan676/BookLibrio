package com.bookpost.ui.screen.booklists

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookpost.data.repository.BookListRepository
import com.bookpost.domain.model.BookList
import com.bookpost.domain.model.BookListCategory
import com.bookpost.domain.model.BookListItem
import com.bookpost.domain.model.BookListSortOption
import com.bookpost.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookListsUiState(
    val lists: List<BookList> = emptyList(),
    val selectedCategory: BookListCategory = BookListCategory.ALL,
    val selectedSort: BookListSortOption = BookListSortOption.POPULAR,
    val searchQuery: String = "",

    // User's lists
    val myCreatedLists: List<BookList> = emptyList(),
    val myFollowingLists: List<BookList> = emptyList(),

    // Detail view state
    val currentList: BookList? = null,
    val currentListItems: List<BookListItem> = emptyList(),

    // Loading states
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val isCreating: Boolean = false,

    // Error & pagination
    val errorMessage: String? = null,
    val hasMore: Boolean = true
)

@HiltViewModel
class BookListsViewModel @Inject constructor(
    private val repository: BookListRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookListsUiState())
    val uiState: StateFlow<BookListsUiState> = _uiState.asStateFlow()

    private var currentOffset = 0
    private val pageSize = 20

    init {
        loadLists()
    }

    // MARK: - Browse Lists

    fun loadLists() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            currentOffset = 0

            val state = _uiState.value
            when (val result = repository.getBookLists(
                category = if (state.selectedCategory == BookListCategory.ALL) null else state.selectedCategory.value,
                search = state.searchQuery.ifEmpty { null },
                sort = state.selectedSort.value,
                limit = pageSize,
                offset = 0
            )) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            lists = result.data.data,
                            hasMore = result.data.hasMore ?: (result.data.data.size >= pageSize)
                        )
                    }
                    currentOffset = result.data.data.size
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = result.message)
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun loadMoreIfNeeded(currentItem: BookList) {
        val state = _uiState.value
        if (state.isLoadingMore || !state.hasMore) return

        val index = state.lists.indexOfFirst { it.id == currentItem.id }
        if (index < 0 || index < state.lists.size - 3) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }

            when (val result = repository.getBookLists(
                category = if (state.selectedCategory == BookListCategory.ALL) null else state.selectedCategory.value,
                search = state.searchQuery.ifEmpty { null },
                sort = state.selectedSort.value,
                limit = pageSize,
                offset = currentOffset
            )) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoadingMore = false,
                            lists = it.lists + result.data.data,
                            hasMore = result.data.hasMore ?: (result.data.data.size >= pageSize)
                        )
                    }
                    currentOffset += result.data.data.size
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(isLoadingMore = false) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun setCategory(category: BookListCategory) {
        if (category != _uiState.value.selectedCategory) {
            _uiState.update { it.copy(selectedCategory = category) }
            loadLists()
        }
    }

    fun setSort(sort: BookListSortOption) {
        if (sort != _uiState.value.selectedSort) {
            _uiState.update { it.copy(selectedSort = sort) }
            loadLists()
        }
    }

    fun search(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        loadLists()
    }

    // MARK: - My Lists

    fun loadMyLists() {
        viewModelScope.launch {
            when (val result = repository.getMyBookLists()) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            myCreatedLists = result.data.created,
                            myFollowingLists = result.data.following
                        )
                    }
                }
                is NetworkResult.Error -> {
                    // Silent fail for my lists
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    // MARK: - List Detail

    fun loadListDetail(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingDetail = true, errorMessage = null) }

            when (val result = repository.getBookList(id)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoadingDetail = false,
                            currentList = result.data,
                            currentListItems = result.data.items ?: emptyList()
                        )
                    }

                    // Load items separately if not included
                    if (result.data.items.isNullOrEmpty()) {
                        loadListItems(id)
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(isLoadingDetail = false, errorMessage = result.message)
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    private fun loadListItems(listId: Int) {
        viewModelScope.launch {
            when (val result = repository.getBookListItems(listId, limit = 50, offset = 0)) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(currentListItems = result.data) }
                }
                is NetworkResult.Error -> {}
                is NetworkResult.Loading -> {}
            }
        }
    }

    // MARK: - Create & Edit Lists

    fun createList(
        title: String,
        description: String?,
        isPublic: Boolean,
        category: String?,
        tags: List<String>?,
        onSuccess: (BookList) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCreating = true, errorMessage = null) }

            when (val result = repository.createBookList(title, description, isPublic, category, tags)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isCreating = false,
                            myCreatedLists = listOf(result.data) + it.myCreatedLists
                        )
                    }
                    onSuccess(result.data)
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(isCreating = false, errorMessage = result.message)
                    }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun deleteList(id: Int, onSuccess: () -> Unit) {
        viewModelScope.launch {
            when (val result = repository.deleteBookList(id)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            myCreatedLists = it.myCreatedLists.filter { list -> list.id != id },
                            lists = it.lists.filter { list -> list.id != id }
                        )
                    }
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(errorMessage = result.message) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    // MARK: - List Items

    fun addBookToList(
        listId: Int,
        bookId: Int,
        bookType: String,
        note: String? = null,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            when (val result = repository.addBookToList(listId, bookId, bookType, note)) {
                is NetworkResult.Success -> {
                    val state = _uiState.value
                    if (state.currentList?.id == listId) {
                        _uiState.update {
                            it.copy(currentListItems = it.currentListItems + result.data)
                        }
                    }
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(errorMessage = result.message) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    fun removeBookFromList(listId: Int, itemId: Int, onSuccess: () -> Unit) {
        viewModelScope.launch {
            when (val result = repository.removeBookFromList(listId, itemId)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(currentListItems = it.currentListItems.filter { item -> item.id != itemId })
                    }
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(errorMessage = result.message) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    // MARK: - Follow/Unfollow

    fun toggleFollow(listId: Int) {
        viewModelScope.launch {
            when (val result = repository.toggleFollow(listId)) {
                is NetworkResult.Success -> {
                    // Reload to get updated state
                    if (_uiState.value.currentList?.id == listId) {
                        loadListDetail(listId)
                    }
                    loadMyLists()
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(errorMessage = result.message) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }

    // MARK: - Helpers

    fun clearDetail() {
        _uiState.update { it.copy(currentList = null, currentListItems = emptyList()) }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
