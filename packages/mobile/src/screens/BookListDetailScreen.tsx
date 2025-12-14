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
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type {
  ExtendedRootStackParamList,
  BookList,
  BookListItem,
} from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<ExtendedRootStackParamList, 'BookListDetail'>

export default function BookListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params
  const [list, setList] = useState<BookList | null>(null)
  const [items, setItems] = useState<BookListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [following, setFollowing] = useState(false)

  const PAGE_SIZE = 20

  const fetchListDetail = useCallback(async () => {
    try {
      const detail = await api.getBookList(listId)
      setList(detail)
      setFollowing(detail.is_following ?? false)
    } catch (error) {
      console.error('Failed to fetch book list detail:', error)
    }
  }, [listId])

  const fetchItems = useCallback(async (reset = false) => {
    try {
      const newOffset = reset ? 0 : offset
      const response = await api.getBookListItems(listId, PAGE_SIZE, newOffset)

      if (reset) {
        setItems(response.items)
      } else {
        setItems(prev => [...prev, ...response.items])
      }
      setHasMore(response.hasMore)
      setOffset(newOffset + response.items.length)
    } catch (error) {
      console.error('Failed to fetch book list items:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [listId, offset])

  useEffect(() => {
    fetchListDetail()
    fetchItems(true)
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setOffset(0)
    fetchListDetail()
    fetchItems(true)
  }, [fetchListDetail, fetchItems])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      fetchItems(false)
    }
  }, [loadingMore, hasMore, fetchItems])

  const handleFollow = async () => {
    try {
      if (following) {
        await api.unfollowBookList(listId)
        setFollowing(false)
        if (list) {
          setList({ ...list, follower_count: list.follower_count - 1 })
        }
      } else {
        await api.followBookList(listId)
        setFollowing(true)
        if (list) {
          setList({ ...list, follower_count: list.follower_count + 1 })
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status')
    }
  }

  const navigateToBook = (item: BookListItem) => {
    if (item.book_type === 'ebook') {
      navigation.navigate('EbookDetail', { ebookId: item.book_id })
    } else {
      navigation.navigate('MagazineDetail', { magazineId: item.book_id })
    }
  }

  const renderBookItem = ({ item }: { item: BookListItem }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => navigateToBook(item)}
    >
      {item.book?.coverUrl ? (
        <Image source={{ uri: item.book.coverUrl }} style={styles.bookCover} />
      ) : (
        <View style={styles.bookCoverPlaceholder}>
          <Text style={styles.placeholderIcon}>
            {item.book_type === 'ebook' ? '📖' : '📰'}
          </Text>
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.book?.title || 'Unknown Title'}
        </Text>
        {item.book?.author && (
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.book.author}
          </Text>
        )}
        {item.note && (
          <Text style={styles.bookNote} numberOfLines={2}>
            "{item.note}"
          </Text>
        )}
        <Text style={styles.addedDate}>
          Added {new Date(item.added_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const ListHeader = () => {
    if (!list) return null

    return (
      <View style={styles.header}>
        {/* Cover Preview */}
        <View style={styles.coverPreview}>
          {list.preview_books && list.preview_books.length > 0 ? (
            <View style={styles.coverGrid}>
              {list.preview_books.slice(0, 4).map((item, index) => (
                <Image
                  key={index}
                  source={{ uri: item.book?.coverUrl || '' }}
                  style={styles.previewCover}
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
        <Text style={styles.listTitle}>{list.title}</Text>
        {list.description && (
          <Text style={styles.listDescription}>{list.description}</Text>
        )}

        {/* Creator */}
        <View style={styles.creatorRow}>
          {list.creator?.avatar ? (
            <Image source={{ uri: list.creator.avatar }} style={styles.creatorAvatar} />
          ) : (
            <View style={styles.creatorAvatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
          )}
          <Text style={styles.creatorName}>
            Created by {list.creator?.username || 'User'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{list.item_count}</Text>
            <Text style={styles.statLabel}>books</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{list.follower_count}</Text>
            <Text style={styles.statLabel}>followers</Text>
          </View>
        </View>

        {/* Follow Button */}
        <TouchableOpacity
          style={[styles.followButton, following && styles.followingButton]}
          onPress={handleFollow}
        >
          <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Books in this list</Text>
        </View>
      </View>
    )
  }

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
        data={items}
        renderItem={renderBookItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No books yet</Text>
            <Text style={styles.emptyDescription}>
              This book list is empty
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#ff9800" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ff9800']} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
      />
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
  listContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  coverPreview: {
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  coverGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewCover: {
    width: '50%',
    height: 100,
  },
  emptyCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCoverIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  listDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 20,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  creatorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarIcon: {
    fontSize: 16,
  },
  creatorName: {
    fontSize: 14,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  followButton: {
    backgroundColor: '#ff9800',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#666',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    borderTopWidth: 8,
    borderTopColor: '#f0f0f0',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  bookCoverPlaceholder: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bookNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
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
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
})
