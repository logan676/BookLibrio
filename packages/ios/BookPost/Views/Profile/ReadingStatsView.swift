/**
 * Reading Stats View
 * Displays reading statistics with multiple dimensions
 */

import SwiftUI

struct ReadingStatsView: View {
    @StateObject private var viewModel = ReadingStatsViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Dimension selector
                dimensionPicker

                // Date navigation (except for total)
                if viewModel.selectedDimension != .total {
                    dateNavigator
                }

                // Content based on dimension
                Group {
                    switch viewModel.selectedDimension {
                    case .week:
                        weekStatsView
                    case .month:
                        monthStatsView
                    case .year:
                        yearStatsView
                    case .total:
                        totalStatsView
                    case .calendar:
                        calendarStatsView
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Reading Stats")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadStats()
        }
        .onChange(of: viewModel.selectedDimension) { _, _ in
            Task { await viewModel.loadStats() }
        }
        .refreshable {
            await viewModel.loadStats()
        }
    }

    // MARK: - Dimension Picker
    private var dimensionPicker: some View {
        Picker("Time Period", selection: $viewModel.selectedDimension) {
            ForEach(StatsDimension.allCases, id: \.self) { dimension in
                Text(dimension.displayName).tag(dimension)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Date Navigator
    private var dateNavigator: some View {
        HStack {
            Button {
                viewModel.goToPreviousPeriod()
            } label: {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Text(dateRangeText)
                .font(.headline)

            Spacer()

            Button {
                viewModel.goToNextPeriod()
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .padding(.horizontal)
    }

    private var dateRangeText: String {
        let formatter = DateFormatter()

        switch viewModel.selectedDimension {
        case .week:
            if let stats = viewModel.weekStats {
                return "\(stats.dateRange.start) - \(stats.dateRange.end)"
            }
            return "This Week"
        case .month, .calendar:
            formatter.dateFormat = "MMMM yyyy"
            return formatter.string(from: viewModel.selectedDate)
        case .year:
            return "\(viewModel.currentYear)"
        case .total:
            return "All Time"
        }
    }

    // MARK: - Week Stats View
    private var weekStatsView: some View {
        Group {
            if let stats = viewModel.weekStats {
                VStack(spacing: 16) {
                    // Summary card
                    summaryCard(
                        title: "This Week",
                        duration: stats.summary.formattedTotalDuration,
                        average: "Daily avg: \(stats.summary.formattedDailyAverage)",
                        change: stats.summary.comparisonChangeText,
                        ranking: stats.summary.friendRanking.map { "Friends rank #\($0)" }
                    )

                    // Duration chart
                    durationChart(data: stats.durationByDay)

                    // Reading records
                    recordsCard(records: stats.readingRecords)
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Month Stats View
    private var monthStatsView: some View {
        Group {
            if let stats = viewModel.monthStats {
                VStack(spacing: 16) {
                    summaryCard(
                        title: "This Month",
                        duration: stats.summary.formattedTotalDuration,
                        average: "Daily avg: \(stats.summary.formattedDailyAverage)",
                        change: stats.summary.comparisonChangeText,
                        ranking: nil
                    )

                    recordsCard(records: stats.readingRecords)
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Year Stats View
    private var yearStatsView: some View {
        Group {
            if let stats = viewModel.yearStats {
                VStack(spacing: 16) {
                    // Year summary
                    VStack(spacing: 8) {
                        Text("\(stats.summary.totalDuration / 3600) hours read this year")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("\(stats.summary.totalReadingDays) days with reading activity")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)

                    // Monthly chart
                    monthlyChart(data: stats.durationByMonth)
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Total Stats View
    private var totalStatsView: some View {
        Group {
            if let stats = viewModel.totalStats {
                VStack(spacing: 16) {
                    // Total duration
                    statCard(
                        title: "Total Reading Time",
                        value: "\(stats.summary.totalDuration / 3600)",
                        unit: "hours",
                        icon: "clock.fill"
                    )

                    HStack(spacing: 12) {
                        statCard(
                            title: "Days Read",
                            value: "\(stats.summary.totalDays)",
                            unit: "days",
                            icon: "calendar"
                        )

                        statCard(
                            title: "Current Streak",
                            value: "\(stats.summary.currentStreak)",
                            unit: "days",
                            icon: "flame.fill"
                        )
                    }

                    HStack(spacing: 12) {
                        statCard(
                            title: "Longest Streak",
                            value: "\(stats.summary.longestStreak)",
                            unit: "days",
                            icon: "trophy.fill"
                        )

                        statCard(
                            title: "Books Finished",
                            value: "\(stats.summary.booksFinished)",
                            unit: "books",
                            icon: "book.closed.fill"
                        )
                    }
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Calendar Stats View
    private var calendarStatsView: some View {
        Group {
            if let stats = viewModel.calendarStats {
                VStack(spacing: 16) {
                    // Calendar grid
                    calendarGrid(days: stats.calendarDays)

                    // Milestones
                    if !stats.milestones.isEmpty {
                        milestonesSection(milestones: stats.milestones)
                    }
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Reusable Components

    private func summaryCard(
        title: String,
        duration: String,
        average: String,
        change: String,
        ranking: String?
    ) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(duration)
                        .font(.system(size: 32, weight: .bold))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(change)
                        .font(.caption)
                        .foregroundColor(change.contains("↑") ? .green : .red)

                    if let ranking = ranking {
                        Text(ranking)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Text(average)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    private func durationChart(data: [DayDuration]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Reading Time Distribution")
                .font(.headline)

            HStack(alignment: .bottom, spacing: 8) {
                ForEach(data) { day in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(day.duration > 0 ? Color.orange : Color.gray.opacity(0.3))
                            .frame(width: 36, height: barHeight(for: day.duration, in: data))

                        Text(String(day.dayOfWeek.prefix(1)))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(height: 120)
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func barHeight(for duration: Int, in data: [DayDuration]) -> CGFloat {
        let maxDuration = data.map(\.duration).max() ?? 1
        guard maxDuration > 0 else { return 4 }
        let ratio = CGFloat(duration) / CGFloat(maxDuration)
        return max(4, ratio * 100)
    }

    private func recordsCard(records: ReadingRecords) -> some View {
        HStack {
            recordItem(value: "\(records.booksRead)", label: "阅读书籍", icon: "book")
            Divider()
            recordItem(value: "\(records.readingDays)", label: "阅读天数", icon: "calendar")
            Divider()
            recordItem(value: "\(records.highlightsCount)", label: "划线", icon: "highlighter")
            Divider()
            recordItem(value: "\(records.notesCount)", label: "想法", icon: "note.text")
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func recordItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(.orange)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func statCard(title: String, value: String, unit: String, icon: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.orange)

            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title)
                    .fontWeight(.bold)
                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func monthlyChart(data: [MonthDuration]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Reading Trend")
                .font(.headline)

            HStack(alignment: .bottom, spacing: 4) {
                ForEach(data) { month in
                    VStack(spacing: 2) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(month.duration > 0 ? Color.orange : Color.gray.opacity(0.3))
                            .frame(width: 20, height: monthBarHeight(for: month.duration, in: data))

                        Text("\(month.month)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(height: 100)
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func monthBarHeight(for duration: Int, in data: [MonthDuration]) -> CGFloat {
        let maxDuration = data.map(\.duration).max() ?? 1
        guard maxDuration > 0 else { return 4 }
        let ratio = CGFloat(duration) / CGFloat(maxDuration)
        return max(4, ratio * 80)
    }

    private func calendarGrid(days: [CalendarDay]) -> some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

        return VStack(alignment: .leading, spacing: 8) {
            // Week day headers
            HStack {
                ForEach(["一", "二", "三", "四", "五", "六", "日"], id: \.self) { day in
                    Text(day)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(days) { day in
                    ZStack {
                        Circle()
                            .fill(day.hasReading ? Color.orange : Color.gray.opacity(0.2))
                            .frame(width: 32, height: 32)

                        Text(dayNumber(from: day.date))
                            .font(.caption)
                            .foregroundColor(day.hasReading ? .white : .primary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private func dayNumber(from dateString: String) -> String {
        let parts = dateString.split(separator: "-")
        if parts.count == 3 {
            return String(Int(parts[2]) ?? 0)
        }
        return ""
    }

    private func milestonesSection(milestones: [ReadingMilestone]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Milestones This Month")
                .font(.headline)

            ForEach(milestones) { milestone in
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 8, height: 8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(milestone.title)
                            .font(.subheadline)

                        if let date = milestone.date {
                            Text(date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

#Preview {
    NavigationStack {
        ReadingStatsView()
    }
}
