import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ExtendedRootStackParamList, Badge, BadgeProgress, BadgeCategory, BadgeTier } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<ExtendedRootStackParamList, 'Badges'>

const BADGE_CATEGORIES: { value: BadgeCategory; label: string; icon: string }[] = [
  { value: 'first_steps', label: 'First Steps', icon: '👶' },
  { value: 'bookworm', label: 'Bookworm', icon: '📚' },
  { value: 'speed_reader', label: 'Speed Reader', icon: '⚡' },
  { value: 'night_owl', label: 'Night Owl', icon: '🦉' },
  { value: 'early_bird', label: 'Early Bird', icon: '🐦' },
  { value: 'marathon', label: 'Marathon', icon: '🏃' },
  { value: 'consistent', label: 'Consistent', icon: '🔥' },
  { value: 'explorer', label: 'Explorer', icon: '🧭' },
  { value: 'collector', label: 'Collector', icon: '💎' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'reviewer', label: 'Reviewer', icon: '✍️' },
  { value: 'challenger', label: 'Challenger', icon: '🏆' },
  { value: 'seasonal', label: 'Seasonal', icon: '🍂' },
  { value: 'milestone', label: 'Milestone', icon: '🎯' },
  { value: 'special', label: 'Special', icon: '⭐' },
  { value: 'secret', label: 'Secret', icon: '🔮' },
]

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
}

export default function BadgesScreen({ navigation }: Props) {
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all')
  const [totalPoints, setTotalPoints] = useState(0)
  const [earnedCount, setEarnedCount] = useState(0)

  const fetchBadges = useCallback(async () => {
    try {
      const progress = await api.getBadgeProgress()
      setBadgeProgress(progress)

      // Calculate stats
      const earned = progress.filter(p => p.is_earned)
      setEarnedCount(earned.length)
      setTotalPoints(earned.reduce((sum, p) => sum + p.badge.points, 0))
    } catch (error) {
      console.error('Failed to fetch badges:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBadges()
  }, [fetchBadges])

  const filteredBadges = selectedCategory === 'all'
    ? badgeProgress
    : badgeProgress.filter(p => p.badge.category === selectedCategory)

  const groupedByCategory = BADGE_CATEGORIES.reduce((acc, cat) => {
    const badges = filteredBadges.filter(p => p.badge.category === cat.value)
    if (badges.length > 0) {
      acc[cat.value] = badges
    }
    return acc
  }, {} as Record<BadgeCategory, BadgeProgress[]>)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff9800" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{earnedCount}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{badgeProgress.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === 'all' && styles.categoryTextActive,
          ]}>All</Text>
        </TouchableOpacity>
        {BADGE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === cat.value && styles.categoryTextActive,
            ]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Badge List */}
      <ScrollView
        style={styles.badgeList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff9800']} />
        }
      >
        {selectedCategory === 'all' ? (
          // Group by category
          Object.entries(groupedByCategory).map(([category, badges]) => {
            const categoryInfo = BADGE_CATEGORIES.find(c => c.value === category)
            return (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <Text style={styles.categoryEmoji}>{categoryInfo?.icon}</Text>
                  <Text style={styles.categorySectionTitle}>{categoryInfo?.label}</Text>
                  <Text style={styles.categoryCount}>
                    {badges.filter(b => b.is_earned).length}/{badges.length}
                  </Text>
                </View>
                <View style={styles.badgeGrid}>
                  {badges.map((progress) => (
                    <BadgeCard key={progress.badge.id} progress={progress} />
                  ))}
                </View>
              </View>
            )
          })
        ) : (
          // Flat list for single category
          <View style={styles.badgeGrid}>
            {filteredBadges.map((progress) => (
              <BadgeCard key={progress.badge.id} progress={progress} />
            ))}
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  )
}

function BadgeCard({ progress }: { progress: BadgeProgress }) {
  const { badge, is_earned, percentage, current_progress, target_value } = progress
  const tierColor = TIER_COLORS[badge.tier]

  return (
    <View style={[styles.badgeCard, !is_earned && styles.badgeCardLocked]}>
      {/* Badge Icon */}
      <View style={[styles.badgeIconContainer, { borderColor: is_earned ? tierColor : '#e0e0e0' }]}>
        <Text style={styles.badgeIcon}>{badge.icon}</Text>
        {is_earned && (
          <View style={[styles.tierIndicator, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{badge.tier.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Badge Info */}
      <Text style={[styles.badgeName, !is_earned && styles.badgeNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>

      {/* Progress or Points */}
      {is_earned ? (
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{badge.points} pts</Text>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{current_progress}/{target_value}</Text>
        </View>
      )}
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
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff9800',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  categoryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ff9800',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  badgeList: {
    flex: 1,
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  categorySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 24,
  },
  tierIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    height: 28,
  },
  badgeNameLocked: {
    color: '#999',
  },
  pointsBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ff9800',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9800',
  },
  progressText: {
    fontSize: 9,
    color: '#999',
  },
  bottomPadding: {
    height: 32,
  },
})
