package com.bookpost.data.local

import com.bookpost.data.repository.ReadingSessionRepository
import com.bookpost.domain.model.ActiveSessionState
import com.bookpost.domain.model.EndSessionResponse
import com.bookpost.domain.model.Milestone
import com.bookpost.util.NetworkResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages the active reading session across the app
 * Handles heartbeat, pause/resume, and session lifecycle
 */
@Singleton
class ReadingSessionManager @Inject constructor(
    private val repository: ReadingSessionRepository
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var heartbeatJob: Job? = null
    private var localTimerJob: Job? = null

    private val _sessionState = MutableStateFlow(ActiveSessionState())
    val sessionState: StateFlow<ActiveSessionState> = _sessionState.asStateFlow()

    private val _milestonesAchieved = MutableStateFlow<List<Milestone>>(emptyList())
    val milestonesAchieved: StateFlow<List<Milestone>> = _milestonesAchieved.asStateFlow()

    companion object {
        private const val HEARTBEAT_INTERVAL_MS = 30_000L // 30 seconds
        private const val LOCAL_TIMER_INTERVAL_MS = 1_000L // 1 second
    }

    /**
     * Start a new reading session
     */
    suspend fun startSession(
        bookId: Int,
        bookType: String,
        position: String? = null,
        chapterIndex: Int? = null
    ): Boolean {
        // End any existing session first
        if (_sessionState.value.isActive) {
            endSession()
        }

        val result = repository.startSession(bookId, bookType, position, chapterIndex)
        return when (result) {
            is NetworkResult.Success -> {
                _sessionState.update {
                    ActiveSessionState(
                        sessionId = result.data.sessionId,
                        bookId = bookId,
                        bookType = bookType,
                        isActive = true,
                        isPaused = false,
                        durationSeconds = 0,
                        startTime = System.currentTimeMillis()
                    )
                }
                startHeartbeat()
                startLocalTimer()
                true
            }
            else -> false
        }
    }

    /**
     * Pause the current session
     */
    suspend fun pauseSession(): Boolean {
        val sessionId = _sessionState.value.sessionId ?: return false

        val result = repository.pauseSession(sessionId)
        return when (result) {
            is NetworkResult.Success -> {
                _sessionState.update { it.copy(isPaused = true) }
                stopHeartbeat()
                stopLocalTimer()
                true
            }
            else -> false
        }
    }

    /**
     * Resume the current session
     */
    suspend fun resumeSession(): Boolean {
        val sessionId = _sessionState.value.sessionId ?: return false

        val result = repository.resumeSession(sessionId)
        return when (result) {
            is NetworkResult.Success -> {
                _sessionState.update { it.copy(isPaused = false) }
                startHeartbeat()
                startLocalTimer()
                true
            }
            else -> false
        }
    }

    /**
     * End the current session
     */
    suspend fun endSession(
        position: String? = null,
        chapterIndex: Int? = null,
        pagesRead: Int? = null
    ): EndSessionResponse? {
        val sessionId = _sessionState.value.sessionId ?: return null

        stopHeartbeat()
        stopLocalTimer()

        val result = repository.endSession(sessionId, position, chapterIndex, pagesRead)
        return when (result) {
            is NetworkResult.Success -> {
                _sessionState.update { ActiveSessionState() }
                _milestonesAchieved.value = result.data.milestonesAchieved
                result.data
            }
            else -> {
                _sessionState.update { ActiveSessionState() }
                null
            }
        }
    }

    /**
     * Send heartbeat to keep session alive
     */
    private suspend fun sendHeartbeat(
        position: String? = null,
        chapterIndex: Int? = null,
        pagesRead: Int? = null
    ) {
        val sessionId = _sessionState.value.sessionId ?: return

        val result = repository.sendHeartbeat(sessionId, position, chapterIndex, pagesRead)
        if (result is NetworkResult.Success) {
            _sessionState.update { state ->
                state.copy(
                    durationSeconds = result.data.durationSeconds,
                    todayDuration = result.data.todayDuration
                )
            }
        }
    }

    private fun startHeartbeat() {
        stopHeartbeat()
        heartbeatJob = scope.launch {
            while (true) {
                delay(HEARTBEAT_INTERVAL_MS)
                if (_sessionState.value.isActive && !_sessionState.value.isPaused) {
                    sendHeartbeat()
                }
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    private fun startLocalTimer() {
        stopLocalTimer()
        localTimerJob = scope.launch {
            while (true) {
                delay(LOCAL_TIMER_INTERVAL_MS)
                if (_sessionState.value.isActive && !_sessionState.value.isPaused) {
                    _sessionState.update { state ->
                        state.copy(durationSeconds = state.durationSeconds + 1)
                    }
                }
            }
        }
    }

    private fun stopLocalTimer() {
        localTimerJob?.cancel()
        localTimerJob = null
    }

    /**
     * Clear milestones after showing them
     */
    fun clearMilestones() {
        _milestonesAchieved.value = emptyList()
    }

    /**
     * Check if there's an active session for a specific book
     */
    fun isSessionActiveForBook(bookId: Int, bookType: String): Boolean {
        val state = _sessionState.value
        return state.isActive && state.bookId == bookId && state.bookType == bookType
    }

    /**
     * Get formatted duration string
     */
    fun getFormattedDuration(): String {
        val seconds = _sessionState.value.durationSeconds
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60

        return when {
            hours > 0 -> String.format("%d:%02d:%02d", hours, minutes, secs)
            else -> String.format("%02d:%02d", minutes, secs)
        }
    }
}
