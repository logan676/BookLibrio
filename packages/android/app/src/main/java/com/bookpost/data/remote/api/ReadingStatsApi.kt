package com.bookpost.data.remote.api

import com.bookpost.domain.model.CalendarStatsResponse
import com.bookpost.domain.model.TotalStatsResponse
import com.bookpost.domain.model.WeekStatsResponse
import com.bookpost.domain.model.YearStatsResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface ReadingStatsApi {

    @GET("/api/reading-stats/week")
    suspend fun getWeekStats(
        @Query("date") date: String? = null
    ): Response<WeekStatsResponse>

    @GET("/api/reading-stats/month")
    suspend fun getMonthStats(
        @Query("year") year: Int? = null,
        @Query("month") month: Int? = null
    ): Response<WeekStatsResponse>

    @GET("/api/reading-stats/year")
    suspend fun getYearStats(
        @Query("year") year: Int? = null
    ): Response<YearStatsResponse>

    @GET("/api/reading-stats/total")
    suspend fun getTotalStats(): Response<TotalStatsResponse>

    @GET("/api/reading-stats/calendar")
    suspend fun getCalendarStats(
        @Query("year") year: Int? = null,
        @Query("month") month: Int? = null
    ): Response<CalendarStatsResponse>
}
