import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type {
  ExtendedRootStackParamList,
  BookListCategory,
} from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<ExtendedRootStackParamList, 'CreateBookList'>

const CATEGORIES: { value: BookListCategory; label: string; icon: string }[] = [
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

export default function CreateBookListScreen({ navigation }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<BookListCategory>('other')
  const [isPublic, setIsPublic] = useState(true)
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your book list')
      return
    }

    setSubmitting(true)
    try {
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      await api.createBookList({
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedCategory,
        isPublic,
        tags: tagArray.length > 0 ? tagArray : undefined,
      })

      Alert.alert('Success', 'Book list created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to create book list. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a name for your book list"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your book list (optional)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
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
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter tags separated by commas"
            placeholderTextColor="#999"
            value={tags}
            onChangeText={setTags}
          />
          <Text style={styles.hint}>e.g., fiction, classic, must-read</Text>
        </View>

        {/* Public/Private Toggle */}
        <View style={styles.switchGroup}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Public List</Text>
            <Text style={styles.switchDescription}>
              {isPublic
                ? 'Anyone can see this list'
                : 'Only you can see this list'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#e0e0e0', true: '#ffcc80' }}
            thumbColor={isPublic ? '#ff9800' : '#f4f3f4'}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, submitting && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Book List</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  categoryScroll: {
    marginHorizontal: -16,
  },
  categoryContainer: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: '#666',
  },
  createButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 40,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
