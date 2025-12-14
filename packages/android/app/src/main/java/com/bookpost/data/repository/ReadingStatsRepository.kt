package com.bookpost.data.repository

import com.bookpost.data.remote.api.ReadingStatsApi
import com.bookpost.domain.model.CalendarStatsResponse
import com.bookpost.domain.model.TotalStatsResponse
import com.bookpost.domain.model.WeekStatsResponse
import com.bookpost.domain.model.YearStatsResponse
import com.bookpost.util.NetworkResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReadingStatsRepository @Inject constructor(
    private val api: ReadingStatsApi
) {

    suspend fun getWeekStats(date: String? = null): NetworkResult<WeekStatsResponse> {
        return try {
            val response = api.getWeekStats(date)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMonthStats(year: Int? = null, month: Int? = null): NetworkResult<WeekStatsResponse> {
        return try {
            val response = api.getMonthStats(year, month)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getYearStats(year: Int? = null): NetworkResult<YearStatsResponse> {
        return try {
            val response = api.getYearStats(year)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getTotalStats(): NetworkResult<TotalStatsResponse> {
        return try {
            val response = api.getTotalStats()
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getCalendarStats(year: Int? = null, month: Int? = null): NetworkResult<CalendarStatsResponse> {
        return try {
            val response = api.getCalendarStats(year, month)
            if (response.isSuccessful) {
                response.body()?.let {
                    NetworkResult.Success(it)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
