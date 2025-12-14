package com.bookpost.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Newspaper
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Newspaper
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.bookpost.R
import com.bookpost.ui.screen.auth.LoginScreen
import com.bookpost.ui.screen.auth.RegisterScreen
import com.bookpost.ui.screen.books.BooksScreen
import com.bookpost.ui.screen.ebooks.EbookDetailScreen
import com.bookpost.ui.screen.ebooks.EbooksScreen
import com.bookpost.ui.screen.home.HomeScreen
import com.bookpost.ui.screen.magazines.MagazineDetailScreen
import com.bookpost.ui.screen.magazines.MagazinesScreen
import com.bookpost.ui.screen.profile.ProfileScreen
import com.bookpost.ui.screen.reader.EpubReaderScreen
import com.bookpost.ui.screen.reader.PdfReaderScreen
import com.bookpost.ui.screen.goals.DailyGoalsScreen
import com.bookpost.ui.screen.badges.BadgesScreen
import com.bookpost.ui.screen.stats.ReadingStatsScreen
import com.bookpost.ui.screen.booklists.BookListsScreen
import com.bookpost.ui.screen.booklists.BookListDetailScreen
import com.bookpost.ui.screen.booklists.CreateBookListScreen

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object Home : Screen("home")
    data object Ebooks : Screen("ebooks")
    data object EbookDetail : Screen("ebook/{id}") {
        fun createRoute(id: Int) = "ebook/$id"
    }
    data object Magazines : Screen("magazines")
    data object MagazineDetail : Screen("magazine/{id}") {
        fun createRoute(id: Int) = "magazine/$id"
    }
    data object Books : Screen("books")
    data object Profile : Screen("profile")
    data object PdfReader : Screen("pdf_reader/{type}/{id}") {
        fun createRoute(type: String, id: Int) = "pdf_reader/$type/$id"
    }
    data object EpubReader : Screen("epub_reader/{id}") {
        fun createRoute(id: Int) = "epub_reader/$id"
    }
    data object DailyGoals : Screen("daily_goals")
    data object Badges : Screen("badges")
    data object ReadingStats : Screen("reading_stats")
    data object BookLists : Screen("book_lists")
    data object BookListDetail : Screen("book_list/{id}") {
        fun createRoute(id: Int) = "book_list/$id"
    }
    data object CreateBookList : Screen("create_book_list")
}

data class BottomNavItem(
    val route: String,
    val titleResId: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(
        route = Screen.Home.route,
        titleResId = R.string.nav_home,
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    ),
    BottomNavItem(
        route = Screen.Ebooks.route,
        titleResId = R.string.nav_ebooks,
        selectedIcon = Icons.Filled.MenuBook,
        unselectedIcon = Icons.Outlined.MenuBook
    ),
    BottomNavItem(
        route = Screen.Magazines.route,
        titleResId = R.string.nav_magazines,
        selectedIcon = Icons.Filled.Newspaper,
        unselectedIcon = Icons.Outlined.Newspaper
    ),
    BottomNavItem(
        route = Screen.Books.route,
        titleResId = R.string.nav_books,
        selectedIcon = Icons.Filled.Book,
        unselectedIcon = Icons.Outlined.Book
    ),
    BottomNavItem(
        route = Screen.Profile.route,
        titleResId = R.string.nav_profile,
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person
    )
)

@Composable
fun BookPostNavigation(
    isLoggedIn: Boolean,
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val showBottomBar = bottomNavItems.any { it.route == currentDestination?.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = stringResource(item.titleResId)
                                )
                            },
                            label = { Text(stringResource(item.titleResId)) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = if (isLoggedIn) Screen.Home.route else Screen.Login.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = {
                        navController.navigate(Screen.Register.route)
                    }
                )
            }

            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    onEbookClick = { id ->
                        navController.navigate(Screen.EbookDetail.createRoute(id))
                    },
                    onMagazineClick = { id ->
                        navController.navigate(Screen.MagazineDetail.createRoute(id))
                    }
                )
            }

            composable(Screen.Ebooks.route) {
                EbooksScreen(
                    onEbookClick = { id ->
                        navController.navigate(Screen.EbookDetail.createRoute(id))
                    }
                )
            }

            composable(
                route = Screen.EbookDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val ebookId = backStackEntry.arguments?.getInt("id") ?: return@composable
                EbookDetailScreen(
                    ebookId = ebookId,
                    onNavigateBack = { navController.popBackStack() },
                    onReadClick = { id, isPdf ->
                        if (isPdf) {
                            navController.navigate(Screen.PdfReader.createRoute("ebook", id))
                        } else {
                            navController.navigate(Screen.EpubReader.createRoute(id))
                        }
                    }
                )
            }

            composable(Screen.Magazines.route) {
                MagazinesScreen(
                    onMagazineClick = { id ->
                        navController.navigate(Screen.MagazineDetail.createRoute(id))
                    }
                )
            }

            composable(
                route = Screen.MagazineDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val magazineId = backStackEntry.arguments?.getInt("id") ?: return@composable
                MagazineDetailScreen(
                    magazineId = magazineId,
                    onNavigateBack = { navController.popBackStack() },
                    onReadClick = { id ->
                        navController.navigate(Screen.PdfReader.createRoute("magazine", id))
                    }
                )
            }

            composable(Screen.Books.route) {
                BooksScreen()
            }

            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateToGoals = {
                        navController.navigate(Screen.DailyGoals.route)
                    },
                    onNavigateToBadges = {
                        navController.navigate(Screen.Badges.route)
                    },
                    onNavigateToStats = {
                        navController.navigate(Screen.ReadingStats.route)
                    },
                    onNavigateToBookLists = {
                        navController.navigate(Screen.BookLists.route)
                    }
                )
            }

            composable(
                route = Screen.PdfReader.route,
                arguments = listOf(
                    navArgument("type") { type = NavType.StringType },
                    navArgument("id") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val type = backStackEntry.arguments?.getString("type") ?: return@composable
                val id = backStackEntry.arguments?.getInt("id") ?: return@composable
                PdfReaderScreen(
                    type = type,
                    id = id,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.EpubReader.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val ebookId = backStackEntry.arguments?.getInt("id") ?: return@composable
                EpubReaderScreen(
                    ebookId = ebookId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.DailyGoals.route) {
                DailyGoalsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Badges.route) {
                BadgesScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.ReadingStats.route) {
                ReadingStatsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.BookLists.route) {
                BookListsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onListClick = { id ->
                        navController.navigate(Screen.BookListDetail.createRoute(id))
                    },
                    onCreateClick = {
                        navController.navigate(Screen.CreateBookList.route)
                    }
                )
            }

            composable(
                route = Screen.BookListDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { backStackEntry ->
                val listId = backStackEntry.arguments?.getInt("id") ?: return@composable
                BookListDetailScreen(
                    listId = listId,
                    onNavigateBack = { navController.popBackStack() },
                    onBookClick = { bookId, bookType ->
                        if (bookType == "ebook") {
                            navController.navigate(Screen.EbookDetail.createRoute(bookId))
                        } else {
                            navController.navigate(Screen.MagazineDetail.createRoute(bookId))
                        }
                    }
                )
            }

            composable(Screen.CreateBookList.route) {
                CreateBookListScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onCreated = { newListId ->
                        navController.navigate(Screen.BookListDetail.createRoute(newListId)) {
                            popUpTo(Screen.BookLists.route)
                        }
                    }
                )
            }
        }
    }
}
