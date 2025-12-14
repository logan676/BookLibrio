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
  FlatList,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type {
  ExtendedRootStackParamList,
  BookList,
  BookListCategory,
  BookListSortOption,
} from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<ExtendedRootStackParamList, 'BookLists'>

const CATEGORIES: { value: BookListCategory; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📚' },
  { value: 'literature', label: 'Literature', icon: '📖' },
  { value: 'history', label: 'History', icon: '🏛️' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'philosophy', label: 'Philosophy', icon: '🧠' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'lifestyle', label: 'Lifestyle', icon: '🌿' },
  { value: 'other', label: 'Other', icon: '📦' },
]

const SORT_OPTIONS: { value: BookListSortOption; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'most_followed', label: 'Most Followed' },
  { value: 'most_books', label: 'Most Books' },
]

export default function BookListsScreen({ navigation }: Props) {
  const [lists, setLists] = useState<BookList[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BookListCategory>('all')
  const [selectedSort, setSelectedSort] = useState<BookListSortOption>('latest')
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [showSortMenu, setShowSortMenu] = useState(false)

  const PAGE_SIZE = 20

  const fetchLists = useCallback(async (reset = false) => {
    try {
      const newOffset = reset ? 0 : offset
      const response = await api.getBookLists(
        selectedCategory,
        selectedSort,
        PAGE_SIZE,
        newOffset
      )

      if (reset) {
        setLists(response.lists)
      } else {
        setLists(prev => [...prev, ...response.lists])
      }
      setHasMore(response.hasMore)
      setOffset(newOffset + response.lists.length)
    } catch (error) {
      console.error('Failed to fetch book lists:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, selectedSort, offset])

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    fetchLists(true)
  }, [selectedCategory, selectedSort])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setOffset(0)
    fetchLists(true)
  }, [fetchLists])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      fetchLists(false)
    }
  }, [loadingMore, hasMore, fetchLists])

  const formatFollowers = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}w`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return String(count)
  }

  const renderBookListCard = ({ item }: { item: BookList }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => navigation.navigate('BookListDetail', { listId: item.id })}
    >
      {/* Cover Preview */}
      <View style={styles.coverPreview}>
        {item.preview_books && item.preview_books.length > 0 ? (
          <View style={styles.coverGrid}>
            {item.preview_books.slice(0, 2).map((book, index) => (
              <Image
                key={index}
                source={{ uri: book.book?.coverUrl || '' }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCover}>
            <Text style={styles.emptyCoverIcon}>📚</Text>
          </View>
        )}
      </View>

      {/* List Info */}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={2}>{item.title}</Text>
        {item.description && (
          <Text style={styles.listDescription} numberOfLines={2}>{item.description}</Text>
        )}

        {/* Creator */}
        <View style={styles.creatorRow}>
          {item.creator?.avatar ? (
            <Image source={{ uri: item.creator.avatar }} style={styles.creatorAvatar} />
          ) : (
            <View style={styles.creatorAvatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
          )}
          <Text style={styles.creatorName}>{item.creator?.username || 'User'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{item.item_count} books</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>{formatFollowers(item.follower_count)} followers</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const ListHeader = () => (
    <>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
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

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Text style={styles.sortButtonText}>
            {SORT_OPTIONS.find(o => o.value === selectedSort)?.label} ▼
          </Text>
        </TouchableOpacity>
        {loadingMore && (
          <ActivityIndicator size="small" color="#ff9800" />
        )}
      </View>

      {/* Sort Menu */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortMenuItem,
                selectedSort === option.value && styles.sortMenuItemActive,
              ]}
              onPress={() => {
                setSelectedSort(option.value)
                setShowSortMenu(false)
              }}
            >
              <Text style={[
                styles.sortMenuText,
                selectedSort === option.value && styles.sortMenuTextActive,
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff9800" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        renderItem={renderBookListCard}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Book Lists</Text>
            <Text style={styles.emptyDescription}>
              Be the first to create a book list in this category!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateBookList')}
            >
              <Text style={styles.createButtonText}>+ Create Book List</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#ff9800" />
            </View>
          ) : lists.length > 0 ? (
            <Text style={styles.footerText}>No more book lists</Text>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff9800']} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBookList')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  categoryScroll: {
    backgroundColor: '#fff',
  },
  categoryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortMenu: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortMenuItemActive: {
    backgroundColor: '#fff3e0',
  },
  sortMenuText: {
    fontSize: 14,
    color: '#666',
  },
  sortMenuTextActive: {
    color: '#ff9800',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 80,
  },
  listCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverPreview: {
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  coverGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  coverImage: {
    flex: 1,
    height: '100%',
  },
  emptyCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCoverIcon: {
    fontSize: 40,
    opacity: 0.5,
  },
  listInfo: {
    padding: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarIcon: {
    fontSize: 12,
  },
  creatorName: {
    fontSize: 13,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  statDot: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
    padding: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
})
