// Initialize Sentry first - must be before any other imports
import { initSentry, Sentry } from './src/lib/sentry'
initSentry()

if (__DEV__) {
  require('./src/ReactotronConfig').default
}

import React from 'react'
import { StatusBar, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import {
  HomeScreen,
  BookDetailScreen,
  PostDetailScreen,
  EbooksScreen,
  EbookDetailScreen,
  EbookReaderScreen,
  MagazinesScreen,
  MagazineDetailScreen,
  MagazineReaderScreen,
  ShelfScreen,
  MeScreen,
  LoginScreen,
  ThinkingScreen,
  NoteDetailScreen,
  BadgesScreen,
  ReadingStatsScreen,
  BookListsScreen,
  BookListDetailScreen,
  CreateBookListScreen,
} from './src/screens'
import type { ExtendedRootStackParamList } from './src/types'

const Stack = createNativeStackNavigator<ExtendedRootStackParamList>()
const Tab = createBottomTabNavigator()

// Tab icons using emoji
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Shelf: '📚',
    Ebook: '📖',
    Magazine: '📰',
    Thinking: '💭',
    Me: '👤',
  }
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name] || '📄'}
      </Text>
    </View>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 6,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Shelf"
        component={ShelfScreen}
        options={{ tabBarLabel: 'Shelf' }}
      />
      <Tab.Screen
        name="Ebook"
        component={EbooksScreen}
        options={{ tabBarLabel: 'Ebook' }}
      />
      <Tab.Screen
        name="Magazine"
        component={MagazinesScreen}
        options={{ tabBarLabel: 'Magazine' }}
      />
      <Tab.Screen
        name="Thinking"
        component={ThinkingScreen}
        options={{ tabBarLabel: 'Thinking' }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{ tabBarLabel: 'Me' }}
      />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#6366f1',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BookDetail"
            component={BookDetailScreen}
            options={{ title: 'Book Details' }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ title: 'Reading Note' }}
          />
          <Stack.Screen
            name="EbookDetail"
            component={EbookDetailScreen}
            options={{ title: 'Book Details' }}
          />
          <Stack.Screen
            name="EbookReader"
            component={EbookReaderScreen}
            options={{ title: 'Reading' }}
          />
          <Stack.Screen
            name="MagazineDetail"
            component={MagazineDetailScreen}
            options={{ title: 'Magazine Details' }}
          />
          <Stack.Screen
            name="MagazineReader"
            component={MagazineReaderScreen}
            options={{ title: 'Magazine' }}
          />
          <Stack.Screen
            name="NoteDetail"
            component={NoteDetailScreen}
            options={{ title: 'Note' }}
          />
          <Stack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{ title: 'My Badges' }}
          />
          <Stack.Screen
            name="ReadingStats"
            component={ReadingStatsScreen}
            options={{ title: 'Reading Stats' }}
          />
          <Stack.Screen
            name="BookLists"
            component={BookListsScreen}
            options={{ title: 'Book Lists' }}
          />
          <Stack.Screen
            name="BookListDetail"
            component={BookListDetailScreen}
            options={{ title: 'Book List' }}
          />
          <Stack.Screen
            name="CreateBookList"
            component={CreateBookListScreen}
            options={{ title: 'Create Book List' }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

// Error fallback component for Sentry ErrorBoundary
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={resetError}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <Sentry.ErrorBoundary fallback={ErrorFallback}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </Sentry.ErrorBoundary>
    </SafeAreaProvider>
  )
}

// Wrap with Sentry for native crash handling
export default Sentry.wrap(App)

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
