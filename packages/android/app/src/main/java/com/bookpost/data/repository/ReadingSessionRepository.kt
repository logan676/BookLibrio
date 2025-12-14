package com.bookpost.data.repository

import com.bookpost.data.remote.api.ReadingSessionApi
import com.bookpost.domain.model.DailyGoalResponse
import com.bookpost.domain.model.EndSessionRequest
import com.bookpost.domain.model.EndSessionResponse
import com.bookpost.domain.model.HeartbeatRequest
import com.bookpost.domain.model.HeartbeatResponse
import com.bookpost.domain.model.PauseResumeResponse
import com.bookpost.domain.model.SetGoalRequest
import com.bookpost.domain.model.SetGoalResponse
import com.bookpost.domain.model.StartSessionRequest
import com.bookpost.domain.model.StartSessionResponse
import com.bookpost.domain.model.TodayDurationResponse
import com.bookpost.util.NetworkResult
import javax.inject.Inject

class ReadingSessionRepository @Inject constructor(
    private val readingSessionApi: ReadingSessionApi
) {
    // Session Management

    suspend fun startSession(
        bookId: Int,
        bookType: String,
        position: String? = null,
        chapterIndex: Int? = null
    ): NetworkResult<StartSessionResponse> {
        return try {
            val request = StartSessionRequest(
                bookId = bookId,
                bookType = bookType,
                position = position,
                chapterIndex = chapterIndex,
                deviceType = "android"
            )
            val response = readingSessionApi.startSession(request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun sendHeartbeat(
        sessionId: Int,
        position: String? = null,
        chapterIndex: Int? = null,
        pagesRead: Int? = null
    ): NetworkResult<HeartbeatResponse> {
        return try {
            val request = HeartbeatRequest(
                currentPosition = position,
                chapterIndex = chapterIndex,
                pagesRead = pagesRead
            )
            val response = readingSessionApi.sendHeartbeat(sessionId, request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun pauseSession(sessionId: Int): NetworkResult<PauseResumeResponse> {
        return try {
            val response = readingSessionApi.pauseSession(sessionId)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun resumeSession(sessionId: Int): NetworkResult<PauseResumeResponse> {
        return try {
            val response = readingSessionApi.resumeSession(sessionId)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun endSession(
        sessionId: Int,
        position: String? = null,
        chapterIndex: Int? = null,
        pagesRead: Int? = null
    ): NetworkResult<EndSessionResponse> {
        return try {
            val request = EndSessionRequest(
                endPosition = position,
                chapterIndex = chapterIndex,
                pagesRead = pagesRead
            )
            val response = readingSessionApi.endSession(sessionId, request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getTodayDuration(): NetworkResult<TodayDurationResponse> {
        return try {
            val response = readingSessionApi.getTodayDuration()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    // Goal Management

    suspend fun getDailyGoal(): NetworkResult<DailyGoalResponse> {
        return try {
            val response = readingSessionApi.getDailyGoal()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun setDailyGoal(targetMinutes: Int): NetworkResult<SetGoalResponse> {
        return try {
            val request = SetGoalRequest(targetMinutes = targetMinutes)
            val response = readingSessionApi.setDailyGoal(request)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
