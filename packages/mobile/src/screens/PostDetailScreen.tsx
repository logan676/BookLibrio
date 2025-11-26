import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'
import type { RootStackParamList, BlogPost, Underline, Idea } from '../types'
import api from '../services/api'

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>

export default function PostDetailScreen({ route }: Props) {
  const { postId } = route.params
  const [post, setPost] = useState<BlogPost | null>(null)
  const [underlines, setUnderlines] = useState<Underline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUnderline, setSelectedUnderline] = useState<Underline | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [newIdea, setNewIdea] = useState('')
  const [showIdeaModal, setShowIdeaModal] = useState(false)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults
    Voice.onSpeechError = onSpeechError
    Voice.onSpeechEnd = onSpeechEnd

    return () => {
      Voice.destroy().then(Voice.removeAllListeners)
    }
  }, [])

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      setNewIdea(e.value[0])
    }
  }

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('Speech error:', e.error)
    setIsListening(false)
  }

  const onSpeechEnd = () => {
    setIsListening(false)
  }

  const startListening = async () => {
    try {
      setIsListening(true)
      await Voice.start('en-US')
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      setIsListening(false)
    }
  }

  const stopListening = async () => {
    try {
      await Voice.stop()
      setIsListening(false)
    } catch (error) {
      console.error('Failed to stop voice recognition:', error)
    }
  }

  const fetchPost = useCallback(async () => {
    try {
      const data = await api.getPost(postId)
      setPost(data)
    } catch (error) {
      console.error('Failed to fetch post:', error)
      Alert.alert('Error', 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [postId])

  const fetchUnderlines = useCallback(async () => {
    try {
      const data = await api.getUnderlines(postId)
      setUnderlines(data)
    } catch (error) {
      console.error('Failed to fetch underlines:', error)
    }
  }, [postId])

  useEffect(() => {
    fetchPost()
    fetchUnderlines()
  }, [fetchPost, fetchUnderlines])

  const handleUnderlinePress = async (underline: Underline) => {
    setSelectedUnderline(underline)
    setShowIdeaModal(true)
    setLoadingIdeas(true)

    try {
      const ideasData = await api.getIdeas(underline.id)
      setIdeas(ideasData)
    } catch (error) {
      console.error('Failed to fetch ideas:', error)
    } finally {
      setLoadingIdeas(false)
    }
  }

  const handleCloseModal = async () => {
    if (isListening) {
      await stopListening()
    }
    setShowIdeaModal(false)
    setNewIdea('')
  }

  const handleAddIdea = async () => {
    if (!selectedUnderline || !newIdea.trim()) return

    if (isListening) {
      await stopListening()
    }

    try {
      await api.createIdea(selectedUnderline.id, newIdea.trim())
      const ideasData = await api.getIdeas(selectedUnderline.id)
      setIdeas(ideasData)
      setNewIdea('')
      fetchUnderlines()
    } catch (error) {
      console.error('Failed to add idea:', error)
      Alert.alert('Error', 'Failed to add idea')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderParagraph = (paragraph: string, paragraphIndex: number) => {
    const paragraphUnderlines = underlines.filter(u => u.paragraph_index === paragraphIndex)

    if (paragraphUnderlines.length === 0) {
      return (
        <Text key={paragraphIndex} style={styles.paragraph}>
          {paragraph}
        </Text>
      )
    }

    // Sort underlines by start_offset
    const sortedUnderlines = [...paragraphUnderlines].sort((a, b) => a.start_offset - b.start_offset)

    const segments: React.ReactNode[] = []
    let lastEnd = 0

    sortedUnderlines.forEach((underline, index) => {
      // Add text before underline
      if (underline.start_offset > lastEnd) {
        segments.push(
          <Text key={`text-${index}`}>
            {paragraph.slice(lastEnd, underline.start_offset)}
          </Text>
        )
      }

      // Add underlined text
      segments.push(
        <Text
          key={`underline-${underline.id}`}
          style={styles.underlinedText}
          onPress={() => handleUnderlinePress(underline)}
        >
          {paragraph.slice(underline.start_offset, underline.end_offset)}
          {underline.idea_count > 0 && (
            <Text style={styles.ideaCount}> ({underline.idea_count})</Text>
          )}
        </Text>
      )

      lastEnd = underline.end_offset
    })

    // Add remaining text
    if (lastEnd < paragraph.length) {
      segments.push(
        <Text key="text-end">{paragraph.slice(lastEnd)}</Text>
      )
    }

    return (
      <Text key={paragraphIndex} style={styles.paragraph}>
        {segments}
      </Text>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text>Post not found</Text>
      </View>
    )
  }

  const paragraphs = post.content.split('\n\n')

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{post.title}</Text>
          {post.book_title && (
            <Text style={styles.bookInfo}>from {post.book_title}</Text>
          )}
          <Text style={styles.date}>{formatDate(post.created_at)}</Text>
        </View>

        <View style={styles.content}>
          {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Tip: Underlined text contains your highlights. Tap to see ideas.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showIdeaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ideas</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            {selectedUnderline && (
              <View style={styles.selectedTextContainer}>
                <Text style={styles.selectedTextLabel}>Selected text:</Text>
                <Text style={styles.selectedText}>{selectedUnderline.text}</Text>
              </View>
            )}

            {loadingIdeas ? (
              <ActivityIndicator size="small" color="#6366f1" style={styles.loader} />
            ) : (
              <ScrollView style={styles.ideasList}>
                {ideas.length === 0 ? (
                  <Text style={styles.noIdeas}>No ideas yet. Add your first one!</Text>
                ) : (
                  ideas.map((idea) => (
                    <View key={idea.id} style={styles.ideaItem}>
                      <Text style={styles.ideaContent}>{idea.content}</Text>
                      <Text style={styles.ideaDate}>{formatDate(idea.created_at)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Add your idea..."
                value={newIdea}
                onChangeText={setNewIdea}
                multiline
              />
              <TouchableOpacity
                style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                onPress={isListening ? stopListening : startListening}
              >
                <Text style={styles.voiceButtonText}>{isListening ? 'Stop' : 'Voice'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, !newIdea.trim() && styles.addButtonDisabled]}
                onPress={handleAddIdea}
                disabled={!newIdea.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  bookInfo: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
  content: {
    padding: 16,
    backgroundColor: '#fff',
  },
  paragraph: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 26,
    marginBottom: 16,
  },
  underlinedText: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  ideaCount: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  hint: {
    padding: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    fontSize: 16,
    color: '#6366f1',
  },
  selectedTextContainer: {
    padding: 16,
    backgroundColor: '#fef3c7',
    margin: 16,
    borderRadius: 8,
  },
  selectedTextLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 14,
    color: '#78350f',
    fontStyle: 'italic',
  },
  loader: {
    marginVertical: 20,
  },
  ideasList: {
    maxHeight: 200,
    paddingHorizontal: 16,
  },
  noIdeas: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 20,
  },
  ideaItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ideaContent: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  ideaDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 80,
  },
  voiceButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#e53935',
  },
  voiceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
})
