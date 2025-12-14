package com.bookpost.data.local.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.bookpost.domain.model.ColorMode
import com.bookpost.domain.model.FontFamily
import com.bookpost.domain.model.LineSpacing
import com.bookpost.domain.model.MarginSize
import com.bookpost.domain.model.PageFlipStyle
import com.bookpost.domain.model.ReadingSettings
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.readingSettingsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "reading_settings"
)

@Singleton
class ReadingSettingsStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val FONT_SIZE = floatPreferencesKey("font_size")
        val FONT_FAMILY = stringPreferencesKey("font_family")
        val COLOR_MODE = stringPreferencesKey("color_mode")
        val LINE_SPACING = stringPreferencesKey("line_spacing")
        val MARGIN_SIZE = stringPreferencesKey("margin_size")
        val PAGE_FLIP_STYLE = stringPreferencesKey("page_flip_style")
        val BRIGHTNESS = floatPreferencesKey("brightness")
        val KEEP_SCREEN_ON = booleanPreferencesKey("keep_screen_on")
    }

    val settings: Flow<ReadingSettings> = context.readingSettingsDataStore.data.map { prefs ->
        ReadingSettings(
            fontSize = prefs[Keys.FONT_SIZE] ?: 22f,
            fontFamily = FontFamily.fromString(prefs[Keys.FONT_FAMILY] ?: "SYSTEM"),
            colorMode = ColorMode.fromString(prefs[Keys.COLOR_MODE] ?: "LIGHT"),
            lineSpacing = LineSpacing.fromString(prefs[Keys.LINE_SPACING] ?: "NORMAL"),
            marginSize = MarginSize.fromString(prefs[Keys.MARGIN_SIZE] ?: "MEDIUM"),
            pageFlipStyle = PageFlipStyle.fromString(prefs[Keys.PAGE_FLIP_STYLE] ?: "HORIZONTAL"),
            brightness = prefs[Keys.BRIGHTNESS] ?: 1.0f,
            keepScreenOn = prefs[Keys.KEEP_SCREEN_ON] ?: true
        )
    }

    suspend fun updateSettings(settings: ReadingSettings) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.FONT_SIZE] = settings.fontSize
            prefs[Keys.FONT_FAMILY] = settings.fontFamily.name
            prefs[Keys.COLOR_MODE] = settings.colorMode.name
            prefs[Keys.LINE_SPACING] = settings.lineSpacing.name
            prefs[Keys.MARGIN_SIZE] = settings.marginSize.name
            prefs[Keys.PAGE_FLIP_STYLE] = settings.pageFlipStyle.name
            prefs[Keys.BRIGHTNESS] = settings.brightness
            prefs[Keys.KEEP_SCREEN_ON] = settings.keepScreenOn
        }
    }

    suspend fun updateFontSize(size: Float) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.FONT_SIZE] = size
        }
    }

    suspend fun updateFontFamily(family: FontFamily) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.FONT_FAMILY] = family.name
        }
    }

    suspend fun updateColorMode(mode: ColorMode) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.COLOR_MODE] = mode.name
        }
    }

    suspend fun updateLineSpacing(spacing: LineSpacing) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.LINE_SPACING] = spacing.name
        }
    }

    suspend fun updateMarginSize(size: MarginSize) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.MARGIN_SIZE] = size.name
        }
    }

    suspend fun updatePageFlipStyle(style: PageFlipStyle) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.PAGE_FLIP_STYLE] = style.name
        }
    }

    suspend fun updateBrightness(brightness: Float) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.BRIGHTNESS] = brightness.coerceIn(0f, 1f)
        }
    }

    suspend fun updateKeepScreenOn(keepOn: Boolean) {
        context.readingSettingsDataStore.edit { prefs ->
            prefs[Keys.KEEP_SCREEN_ON] = keepOn
        }
    }

    suspend fun reset() {
        context.readingSettingsDataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
