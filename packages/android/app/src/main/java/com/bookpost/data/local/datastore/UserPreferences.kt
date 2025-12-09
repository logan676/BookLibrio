package com.bookpost.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.bookpost.domain.model.AuthToken
import com.bookpost.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class UserPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ID = intPreferencesKey("user_id")
        private val KEY_USERNAME = stringPreferencesKey("username")
        private val KEY_EMAIL = stringPreferencesKey("email")
        private val KEY_IS_ADMIN = booleanPreferencesKey("is_admin")
        private val KEY_IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
    }

    val accessToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_ACCESS_TOKEN]
    }

    val refreshToken: Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_REFRESH_TOKEN]
    }

    val isLoggedIn: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[KEY_IS_LOGGED_IN] ?: false
    }

    val user: Flow<User?> = dataStore.data.map { preferences ->
        val userId = preferences[KEY_USER_ID]
        val username = preferences[KEY_USERNAME]
        val email = preferences[KEY_EMAIL]

        if (userId != null && username != null && email != null) {
            User(
                id = userId,
                username = username,
                email = email,
                isAdmin = preferences[KEY_IS_ADMIN] ?: false
            )
        } else {
            null
        }
    }

    suspend fun saveAuthData(user: User, token: AuthToken) {
        dataStore.edit { preferences ->
            preferences[KEY_ACCESS_TOKEN] = token.accessToken
            preferences[KEY_REFRESH_TOKEN] = token.refreshToken
            preferences[KEY_USER_ID] = user.id
            preferences[KEY_USERNAME] = user.username
            preferences[KEY_EMAIL] = user.email
            preferences[KEY_IS_ADMIN] = user.isAdmin
            preferences[KEY_IS_LOGGED_IN] = true
        }
    }

    suspend fun updateTokens(token: AuthToken) {
        dataStore.edit { preferences ->
            preferences[KEY_ACCESS_TOKEN] = token.accessToken
            preferences[KEY_REFRESH_TOKEN] = token.refreshToken
        }
    }

    suspend fun clearAuthData() {
        dataStore.edit { preferences ->
            preferences.remove(KEY_ACCESS_TOKEN)
            preferences.remove(KEY_REFRESH_TOKEN)
            preferences.remove(KEY_USER_ID)
            preferences.remove(KEY_USERNAME)
            preferences.remove(KEY_EMAIL)
            preferences.remove(KEY_IS_ADMIN)
            preferences[KEY_IS_LOGGED_IN] = false
        }
    }
}
