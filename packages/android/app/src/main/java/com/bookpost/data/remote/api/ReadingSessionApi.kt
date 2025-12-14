package com.bookpost.data.remote.api

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
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ReadingSessionApi {

    // Reading Sessions
    @POST("/api/reading-sessions/start")
    suspend fun startSession(
        @Body request: StartSessionRequest
    ): Response<StartSessionResponse>

    @POST("/api/reading-sessions/{sessionId}/heartbeat")
    suspend fun sendHeartbeat(
        @Path("sessionId") sessionId: Int,
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>

    @POST("/api/reading-sessions/{sessionId}/pause")
    suspend fun pauseSession(
        @Path("sessionId") sessionId: Int
    ): Response<PauseResumeResponse>

    @POST("/api/reading-sessions/{sessionId}/resume")
    suspend fun resumeSession(
        @Path("sessionId") sessionId: Int
    ): Response<PauseResumeResponse>

    @POST("/api/reading-sessions/{sessionId}/end")
    suspend fun endSession(
        @Path("sessionId") sessionId: Int,
        @Body request: EndSessionRequest
    ): Response<EndSessionResponse>

    @GET("/api/reading-sessions/today-duration")
    suspend fun getTodayDuration(): Response<TodayDurationResponse>

    // Reading Goals
    @GET("/api/goals/daily")
    suspend fun getDailyGoal(): Response<DailyGoalResponse>

    @POST("/api/goals/daily")
    suspend fun setDailyGoal(
        @Body request: SetGoalRequest
    ): Response<SetGoalResponse>
}
