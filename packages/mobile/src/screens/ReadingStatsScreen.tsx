import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type {
  ExtendedRootStackParamList,
  StatsDimension,
  WeekStats,
  YearStats,
  TotalStats,
  CalendarStats,
  CalendarDay,
} from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<ExtendedRootStackParamList, 'ReadingStats'>

const DIMENSIONS: { value: StatsDimension; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'total', label: 'Total' },
  { value: 'calendar', label: 'Calendar' },
]

const { width: screenWidth } = Dimensions.get('window')

export default function ReadingStatsScreen({ navigation }: Props) {
  const [dimension, setDimension] = useState<StatsDimension>('week')
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null)
  const [yearStats, setYearStats] = useState<YearStats | null>(null)
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null)
  const [calendarStats, setCalendarStats] = useState<CalendarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      switch (dimension) {
        case 'week':
          setWeekStats(await api.getWeekStats())
          break
        case 'month':
          setWeekStats(await api.getMonthStats())
          break
        case 'year':
          setYearStats(await api.getYearStats())
          break
        case 'total':
          setTotalStats(await api.getTotalStats())
          break
        case 'calendar':
          setCalendarStats(await api.getCalendarStats())
          break
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dimension])

  useEffect(() => {
    setLoading(true)
    fetchStats()
  }, [fetchStats])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStats()
  }, [fetchStats])

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff9800" />
        </View>
      )
    }

    switch (dimension) {
      case 'week':
      case 'month':
        return weekStats ? <WeekMonthView stats={weekStats} formatDuration={formatDuration} /> : null
      case 'year':
        return yearStats ? <YearView stats={yearStats} formatDuration={formatDuration} /> : null
      case 'total':
        return totalStats ? <TotalView stats={totalStats} formatDuration={formatDuration} /> : null
      case 'calendar':
        return calendarStats ? <CalendarView stats={calendarStats} /> : null
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      {/* Dimension Picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dimensionScroll}
        contentContainerStyle={styles.dimensionContainer}
      >
        {DIMENSIONS.map((dim) => (
          <TouchableOpacity
            key={dim.value}
            style={[
              styles.dimensionChip,
              dimension === dim.value && styles.dimensionChipActive,
            ]}
            onPress={() => setDimension(dim.value)}
          >
            <Text style={[
              styles.dimensionText,
              dimension === dim.value && styles.dimensionTextActive,
            ]}>{dim.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff9800']} />
        }
      >
        {renderContent()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  )
}

function WeekMonthView({ stats, formatDuration }: { stats: WeekStats; formatDuration: (m: number) => string }) {
  const maxDuration = Math.max(...stats.dailyDurations.map(d => d.duration), 1)

  return (
    <View>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard title="Total Time" value={formatDuration(stats.totalMinutes)} icon="⏱️" />
        <SummaryCard title="Books Read" value={String(stats.totalBooks)} icon="📚" />
        <SummaryCard title="Pages Read" value={String(stats.totalPages)} icon="📄" />
        <SummaryCard title="Daily Avg" value={formatDuration(stats.averageMinutesPerDay)} icon="📊" />
      </View>

      {/* Streaks */}
      {stats.longestStreak !== undefined && (
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakValue}>{stats.currentStreak || 0}</Text>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🏆</Text>
            <Text style={styles.streakValue}>{stats.longestStreak || 0}</Text>
            <Text style={styles.streakLabel}>Longest Streak</Text>
          </View>
        </View>
      )}

      {/* Bar Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Daily Reading</Text>
        <View style={styles.barChart}>
          {stats.dailyDurations.map((day, index) => (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { height: `${(day.duration / maxDuration) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{day.label}</Text>
              <Text style={styles.barValue}>{day.duration}m</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function YearView({ stats, formatDuration }: { stats: YearStats; formatDuration: (m: number) => string }) {
  const maxDuration = Math.max(...stats.monthlyDurations.map(d => d.duration), 1)

  return (
    <View>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard title="Total Time" value={formatDuration(stats.totalMinutes)} icon="⏱️" />
        <SummaryCard title="Books Read" value={String(stats.totalBooks)} icon="📚" />
        <SummaryCard title="Pages Read" value={String(stats.totalPages)} icon="📄" />
      </View>

      {/* Monthly Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Monthly Breakdown ({stats.year})</Text>
        <View style={styles.barChart}>
          {stats.monthlyDurations.map((month, index) => (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { height: `${(month.duration / maxDuration) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{month.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Categories */}
      {stats.topCategories && stats.topCategories.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          {stats.topCategories.slice(0, 5).map((cat, index) => (
            <View key={index} style={styles.categoryRow}>
              <Text style={styles.categoryRank}>#{index + 1}</Text>
              <Text style={styles.categoryName}>{cat.category}</Text>
              <Text style={styles.categoryCount}>{cat.count} books</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function TotalView({ stats, formatDuration }: { stats: TotalStats; formatDuration: (m: number) => string }) {
  return (
    <View>
      {/* Main Stats */}
      <View style={styles.summaryGrid}>
        <SummaryCard title="Total Time" value={formatDuration(stats.totalMinutes)} icon="⏱️" />
        <SummaryCard title="Books Read" value={String(stats.totalBooks)} icon="📚" />
        <SummaryCard title="Pages Read" value={String(stats.totalPages)} icon="📄" />
        <SummaryCard title="Daily Avg" value={formatDuration(stats.averageMinutesPerDay)} icon="📊" />
      </View>

      {/* Member Since */}
      <View style={styles.memberSince}>
        <Text style={styles.memberSinceLabel}>Member since</Text>
        <Text style={styles.memberSinceValue}>{stats.memberSince?.slice(0, 10)}</Text>
      </View>

      {/* Streaks */}
      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakValue}>{stats.currentStreak}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={styles.streakIcon}>🏆</Text>
          <Text style={styles.streakValue}>{stats.longestStreak}</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
      </View>

      {/* Favorite Category */}
      {stats.favoriteCategory && (
        <View style={styles.favoriteCategory}>
          <Text style={styles.favoriteCategoryLabel}>Favorite Category</Text>
          <Text style={styles.favoriteCategoryValue}>{stats.favoriteCategory}</Text>
        </View>
      )}

      {/* Milestones */}
      {stats.milestones && stats.milestones.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {stats.milestones.map((milestone, index) => (
            <View key={index} style={styles.milestoneRow}>
              <Text style={styles.milestoneIcon}>🎯</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                <Text style={styles.milestoneDate}>{milestone.reachedAt?.slice(0, 10)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function CalendarView({ stats }: { stats: CalendarStats }) {
  const LEVEL_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
  const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Generate calendar grid (7 rows x ~5 cols for a month)
  const firstDayOfMonth = new Date(stats.year, stats.month - 1, 1).getDay()
  const daysInMonth = new Date(stats.year, stats.month, 0).getDate()

  const calendarGrid: (CalendarDay | null)[][] = []
  let currentWeek: (CalendarDay | null)[] = Array(firstDayOfMonth).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${stats.year}-${String(stats.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = stats.days.find(d => d.date === dateStr) || { date: dateStr, duration: 0, level: 0 as const }
    currentWeek.push(dayData)

    if (currentWeek.length === 7) {
      calendarGrid.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    calendarGrid.push(currentWeek)
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <View>
      {/* Month Header */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarMonth}>{monthNames[stats.month - 1]} {stats.year}</Text>
        <Text style={styles.calendarSummary}>
          {stats.activeDays} active days • {stats.totalMinutes}min total
        </Text>
      </View>

      {/* Day Labels */}
      <View style={styles.dayLabels}>
        {DAYS_OF_WEEK.map((day, index) => (
          <Text key={index} style={styles.dayLabel}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarGrid.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.calendarWeek}>
            {week.map((day, dayIndex) => (
              <View
                key={dayIndex}
                style={[
                  styles.calendarDay,
                  { backgroundColor: day ? LEVEL_COLORS[day.level] : 'transparent' },
                ]}
              >
                {day && (
                  <Text style={[styles.calendarDayText, day.level > 2 && styles.calendarDayTextLight]}>
                    {parseInt(day.date.split('-')[2])}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {LEVEL_COLORS.map((color, index) => (
          <View key={index} style={[styles.legendBox, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  )
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dimensionScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dimensionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dimensionChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  dimensionChipActive: {
    backgroundColor: '#ff9800',
  },
  dimensionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dimensionTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  streakRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff9800',
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: '70%',
    height: 100,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#ff9800',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
  },
  barValue: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryRank: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9800',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
  },
  memberSince: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  memberSinceLabel: {
    fontSize: 12,
    color: '#666',
  },
  memberSinceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  favoriteCategory: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  favoriteCategoryLabel: {
    fontSize: 12,
    color: '#666',
  },
  favoriteCategoryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff9800',
    marginTop: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  milestoneIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  milestoneDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  calendarHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  calendarMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  calendarSummary: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  calendarDayTextLight: {
    color: '#fff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#666',
    marginHorizontal: 4,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  bottomPadding: {
    height: 32,
  },
})
