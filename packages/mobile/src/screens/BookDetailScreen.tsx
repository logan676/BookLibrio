import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker'
import type { RootStackParamList, Book, BlogPost } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>

export default function BookDetailScreen({ route, navigation }: Props) {
  const { bookId } = route.params
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)

  const fetchBook = useCallback(async () => {
    try {
      const data = await api.getBook(bookId)
      setBook(data)
    } catch (error) {
      console.error('Failed to fetch book:', error)
      Alert.alert('Error', 'Failed to load book details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchBook()
  }, [fetchBook])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBook()
  }, [fetchBook])

  const handleScanPage = () => {
    Alert.alert(
      'Scan Page',
      'Choose how to capture the page',
      [
        {
          text: 'Take Photo',
          onPress: () => capturePhoto('camera'),
        },
        {
          text: 'Choose from Library',
          onPress: () => capturePhoto('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }

  const capturePhoto = async (source: 'camera' | 'library') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      includeBase64: false,
    }

    const result = source === 'camera'
      ? await launchCamera(options)
      : await launchImageLibrary(options)

    if (result.didCancel || !result.assets?.[0]) {
      return
    }

    const asset = result.assets[0]
    if (!asset.uri) return

    setScanning(true)
    try {
      await api.scanPage(bookId, {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'photo.jpg',
      })

      fetchBook()
    } catch (error) {
      console.error('Failed to scan page:', error)
      Alert.alert('Error', 'Failed to scan page')
    } finally {
      setScanning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!book) {
    return (
      <View style={styles.centered}>
        <Text>Book not found</Text>
      </View>
    )
  }

  const coverImage = book.cover_photo_url || book.cover_url

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>+</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>

          <View style={styles.metaContainer}>
            {book.publisher && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Publisher</Text>
                <Text style={styles.metaValue}>{book.publisher}</Text>
              </View>
            )}
            {book.publish_year && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Published</Text>
                <Text style={styles.metaValue}>{book.publish_year}</Text>
              </View>
            )}
            {book.page_count && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Pages</Text>
                <Text style={styles.metaValue}>{book.page_count}</Text>
              </View>
            )}
            {book.language && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Language</Text>
                <Text style={styles.metaValue}>{book.language.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {book.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{book.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reading Pages</Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanPage} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.scanButtonText}>+ Scan Page</Text>
            )}
          </TouchableOpacity>
        </View>

        {book.posts && book.posts.length > 0 ? (
          book.posts.map((post: BlogPost) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id, bookId: book.id })}
            >
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContent} numberOfLines={3}>
                {post.content}
              </Text>
              <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyText}>No reading pages yet</Text>
            <Text style={styles.emptySubtext}>Tap "Scan Page" to create your first one</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  cover: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  placeholderCover: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
    color: '#94a3b8',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  author: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  metaContainer: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    width: 70,
  },
  metaValue: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginTop: 8,
  },
  scanButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  postCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyPosts: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
})
