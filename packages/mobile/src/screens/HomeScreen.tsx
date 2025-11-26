import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker'
import type { RootStackParamList, Book } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export default function HomeScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)

  const fetchBooks = useCallback(async () => {
    try {
      const data = await api.getBooks()
      setBooks(data)
    } catch (error) {
      console.error('Failed to fetch books:', error)
      Alert.alert('Error', 'Failed to load books')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBooks()
  }, [fetchBooks])

  const handleAddBook = () => {
    Alert.alert(
      'Add Book',
      'Choose how to add a book',
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
      const scanResult = await api.scanBookCover({
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'photo.jpg',
      })

      // Auto-create the book with scanned data
      await api.createBook({
        title: scanResult.title || 'Unknown Title',
        author: scanResult.author || 'Unknown Author',
        isbn: scanResult.isbn,
        publisher: scanResult.publisher,
        publish_year: scanResult.publish_year,
        description: scanResult.description,
        page_count: scanResult.page_count,
        categories: scanResult.categories,
        language: scanResult.language,
        cover_photo_url: scanResult.cover_photo_url,
        cover_url: scanResult.cover_url,
      })

      fetchBooks()
    } catch (error) {
      console.error('Failed to scan book:', error)
      Alert.alert('Error', 'Failed to scan book cover')
    } finally {
      setScanning(false)
    }
  }

  const renderBook = ({ item }: { item: Book }) => {
    const coverImage = item.cover_photo_url || item.cover_url

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      >
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.bookCover} />
        ) : (
          <View style={[styles.bookCover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>+</Text>
          </View>
        )}
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Books</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddBook} disabled={scanning}>
          {scanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {books.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No books yet</Text>
          <Text style={styles.emptySubtext}>Tap "+ Add" to scan your first book cover</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bookCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookCover: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderCover: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: '#94a3b8',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
})
