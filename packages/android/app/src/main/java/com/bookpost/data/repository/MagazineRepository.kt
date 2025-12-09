package com.bookpost.data.repository

import com.bookpost.data.local.db.dao.MagazineDao
import com.bookpost.data.local.db.entity.MagazineEntity
import com.bookpost.data.remote.api.MagazinesApi
import com.bookpost.domain.model.Magazine
import com.bookpost.domain.model.Publisher
import com.bookpost.util.NetworkResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import okhttp3.ResponseBody
import javax.inject.Inject

class MagazineRepository @Inject constructor(
    private val magazinesApi: MagazinesApi,
    private val magazineDao: MagazineDao
) {
    fun getCachedMagazines(): Flow<List<Magazine>> {
        return magazineDao.getAllMagazines().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getCachedMagazinesByPublisher(publisherId: Int): Flow<List<Magazine>> {
        return magazineDao.getMagazinesByPublisher(publisherId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun getCachedMagazinesByYear(year: Int): Flow<List<Magazine>> {
        return magazineDao.getMagazinesByYear(year).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun searchCachedMagazines(query: String): Flow<List<Magazine>> {
        return magazineDao.searchMagazines(query).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun getMagazines(
        publisher: Int? = null,
        year: Int? = null,
        search: String? = null,
        limit: Int? = null,
        offset: Int? = null
    ): NetworkResult<Pair<List<Magazine>, Int>> {
        return try {
            val response = magazinesApi.getMagazines(publisher, year, search, limit, offset)
            if (response.isSuccessful) {
                response.body()?.let { magazinesResponse ->
                    val magazines = magazinesResponse.data.map { it.toDomain() }
                    // Cache magazines
                    magazineDao.insertMagazines(magazines.map { MagazineEntity.fromDomain(it) })
                    NetworkResult.Success(Pair(magazines, magazinesResponse.total))
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMagazine(id: Int): NetworkResult<Magazine> {
        return try {
            val response = magazinesApi.getMagazine(id)
            if (response.isSuccessful) {
                response.body()?.let { magazineResponse ->
                    val magazine = magazineResponse.data.toDomain()
                    magazineDao.insertMagazine(MagazineEntity.fromDomain(magazine))
                    NetworkResult.Success(magazine)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getCachedMagazine(id: Int): Magazine? {
        return magazineDao.getMagazineById(id)?.toDomain()
    }

    suspend fun getPublishers(): NetworkResult<List<Publisher>> {
        return try {
            val response = magazinesApi.getPublishers()
            if (response.isSuccessful) {
                response.body()?.let { publishersResponse ->
                    NetworkResult.Success(publishersResponse.data.map { it.toDomain() })
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMagazineFile(id: Int): NetworkResult<ResponseBody> {
        return try {
            val response = magazinesApi.getMagazineFile(id)
            if (response.isSuccessful) {
                response.body()?.let { body ->
                    NetworkResult.Success(body)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getMagazinePage(id: Int, page: Int): NetworkResult<ResponseBody> {
        return try {
            val response = magazinesApi.getMagazinePage(id, page)
            if (response.isSuccessful) {
                response.body()?.let { body ->
                    NetworkResult.Success(body)
                } ?: NetworkResult.Error("Empty response")
            } else {
                NetworkResult.Error(response.message(), response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Unknown error")
        }
    }
}
