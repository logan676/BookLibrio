import SwiftUI
import AVFoundation

/// Full-screen audio player view for AI-narrated books
/// Supports chapter navigation, playback speed, sleep timer, and voice selection
struct AudioPlayerView: View {
    let bookTitle: String
    let bookId: Int
    let bookType: BookType
    let coverUrl: String?

    @StateObject private var playerState = AudioPlayerState()
    @Environment(\.dismiss) var dismiss

    @State private var showVoiceSelection = false
    @State private var showSleepTimer = false
    @State private var showChapterList = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.2), Color(.systemBackground)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 32) {
                    Spacer()

                    // Cover art
                    coverArtView

                    // Book info
                    bookInfoView

                    // Progress bar
                    progressView

                    // Playback controls
                    playbackControls

                    // Secondary controls
                    secondaryControls

                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.down")
                            .font(.title3)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            showChapterList = true
                        } label: {
                            Label("章节列表", systemImage: "list.bullet")
                        }

                        Button {
                            // Show original text
                        } label: {
                            Label("显示原文", systemImage: "text.alignleft")
                        }

                        Button {
                            // Share
                        } label: {
                            Label("分享", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                    }
                }
            }
            .sheet(isPresented: $showVoiceSelection) {
                VoiceSelectionSheet(selectedVoice: $playerState.selectedVoice)
            }
            .sheet(isPresented: $showSleepTimer) {
                SleepTimerSheet(selectedTimer: $playerState.sleepTimer)
            }
            .sheet(isPresented: $showChapterList) {
                ChapterListSheet(
                    chapters: playerState.chapters,
                    currentChapter: playerState.currentChapter,
                    onSelect: { chapter in
                        playerState.goToChapter(chapter)
                        showChapterList = false
                    }
                )
            }
        }
    }

    // MARK: - Cover Art

    private var coverArtView: some View {
        BookCoverView(coverUrl: coverUrl, title: bookTitle)
            .frame(width: 240, height: 320)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
    }

    // MARK: - Book Info

    private var bookInfoView: some View {
        VStack(spacing: 8) {
            Text(bookTitle)
                .font(.title2)
                .fontWeight(.bold)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text("第\(playerState.currentChapter)章")
                .font(.subheadline)
                .foregroundColor(.secondary)

            // AI Voice indicator
            HStack(spacing: 4) {
                Image(systemName: "waveform")
                    .font(.caption)
                Text("AI 朗读 · \(playerState.selectedVoice.name)")
                    .font(.caption)
            }
            .foregroundColor(.blue)
        }
    }

    // MARK: - Progress View

    private var progressView: some View {
        VStack(spacing: 8) {
            // Progress slider
            Slider(value: $playerState.progress, in: 0...1) { editing in
                if !editing {
                    playerState.seek(to: playerState.progress)
                }
            }
            .accentColor(.blue)

            // Time labels
            HStack {
                Text(formatTime(playerState.currentTime))
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Text(formatTime(playerState.duration))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Playback Controls

    private var playbackControls: some View {
        HStack(spacing: 48) {
            // Previous chapter
            Button {
                playerState.previousChapter()
            } label: {
                Image(systemName: "backward.end.fill")
                    .font(.title)
            }
            .disabled(playerState.currentChapter <= 1)

            // Skip backward 15s
            Button {
                playerState.skipBackward()
            } label: {
                ZStack {
                    Image(systemName: "gobackward.15")
                        .font(.title2)
                }
            }

            // Play/Pause
            Button {
                playerState.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 72, height: 72)

                    Image(systemName: playerState.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title)
                        .foregroundColor(.white)
                }
            }

            // Skip forward 15s
            Button {
                playerState.skipForward()
            } label: {
                Image(systemName: "goforward.15")
                    .font(.title2)
            }

            // Next chapter
            Button {
                playerState.nextChapter()
            } label: {
                Image(systemName: "forward.end.fill")
                    .font(.title)
            }
        }
        .foregroundColor(.primary)
    }

    // MARK: - Secondary Controls

    private var secondaryControls: some View {
        HStack(spacing: 40) {
            // Playback speed
            Button {
                playerState.cyclePlaybackSpeed()
            } label: {
                VStack(spacing: 4) {
                    Text(String(format: "%.1fx", playerState.playbackSpeed))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("倍速")
                        .font(.caption2)
                }
            }

            // Voice selection
            Button {
                showVoiceSelection = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "waveform.circle")
                        .font(.title3)
                    Text("音色")
                        .font(.caption2)
                }
            }

            // Sleep timer
            Button {
                showSleepTimer = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: playerState.sleepTimer != nil ? "moon.fill" : "moon")
                        .font(.title3)
                    Text("定时")
                        .font(.caption2)
                }
            }

            // Chapter list
            Button {
                showChapterList = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "list.bullet")
                        .font(.title3)
                    Text("目录")
                        .font(.caption2)
                }
            }
        }
        .foregroundColor(.secondary)
    }

    private func formatTime(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}

// MARK: - Audio Player State

@MainActor
class AudioPlayerState: ObservableObject {
    @Published var isPlaying = false
    @Published var progress: Double = 0
    @Published var currentTime: TimeInterval = 0
    @Published var duration: TimeInterval = 300 // 5 min sample
    @Published var currentChapter = 1
    @Published var totalChapters = 10
    @Published var playbackSpeed: Double = 1.0
    @Published var selectedVoice: AIVoice = .defaultVoice
    @Published var sleepTimer: SleepTimerOption?
    @Published var chapters: [ChapterInfo] = []

    init() {
        // Sample chapters
        chapters = (1...10).map { ChapterInfo(number: $0, title: "第\($0)章", duration: 300) }
    }

    func togglePlayPause() {
        isPlaying.toggle()
    }

    func skipForward() {
        let newTime = min(currentTime + 15, duration)
        currentTime = newTime
        progress = newTime / duration
    }

    func skipBackward() {
        let newTime = max(currentTime - 15, 0)
        currentTime = newTime
        progress = newTime / duration
    }

    func seek(to progress: Double) {
        currentTime = duration * progress
    }

    func previousChapter() {
        if currentChapter > 1 {
            currentChapter -= 1
            currentTime = 0
            progress = 0
        }
    }

    func nextChapter() {
        if currentChapter < totalChapters {
            currentChapter += 1
            currentTime = 0
            progress = 0
        }
    }

    func goToChapter(_ chapter: ChapterInfo) {
        currentChapter = chapter.number
        currentTime = 0
        progress = 0
    }

    func cyclePlaybackSpeed() {
        let speeds: [Double] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
        if let currentIndex = speeds.firstIndex(of: playbackSpeed) {
            let nextIndex = (currentIndex + 1) % speeds.count
            playbackSpeed = speeds[nextIndex]
        } else {
            playbackSpeed = 1.0
        }
    }
}

// MARK: - Supporting Types

struct AIVoice: Identifiable, Hashable {
    let id: String
    let name: String
    let gender: String
    let description: String

    static let defaultVoice = AIVoice(id: "default", name: "默认女声", gender: "female", description: "温柔知性")

    static let allVoices: [AIVoice] = [
        AIVoice(id: "female1", name: "温柔女声", gender: "female", description: "温柔知性"),
        AIVoice(id: "female2", name: "活力女声", gender: "female", description: "年轻活泼"),
        AIVoice(id: "male1", name: "磁性男声", gender: "male", description: "低沉磁性"),
        AIVoice(id: "male2", name: "青年男声", gender: "male", description: "年轻阳光"),
        AIVoice(id: "child", name: "童声", gender: "neutral", description: "可爱童趣")
    ]
}

struct ChapterInfo: Identifiable {
    var id: Int { number }
    let number: Int
    let title: String
    let duration: TimeInterval
}

enum SleepTimerOption: String, CaseIterable, Identifiable {
    case min15 = "15分钟"
    case min30 = "30分钟"
    case min45 = "45分钟"
    case min60 = "60分钟"
    case endOfChapter = "播完本章"

    var id: String { rawValue }
}

// MARK: - Voice Selection Sheet

struct VoiceSelectionSheet: View {
    @Binding var selectedVoice: AIVoice
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(AIVoice.allVoices) { voice in
                    Button {
                        selectedVoice = voice
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(voice.name)
                                    .font(.headline)
                                    .foregroundColor(.primary)

                                Text(voice.description)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if selectedVoice.id == voice.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }

                            // Preview button
                            Button {
                                // Play preview
                            } label: {
                                Image(systemName: "play.circle")
                                    .font(.title2)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            }
            .navigationTitle("选择音色")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Sleep Timer Sheet

struct SleepTimerSheet: View {
    @Binding var selectedTimer: SleepTimerOption?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Current timer status
                if let timer = selectedTimer {
                    Section {
                        HStack {
                            Image(systemName: "moon.fill")
                                .foregroundColor(.blue)
                            Text("定时 \(timer.rawValue)")
                            Spacer()
                            Button("取消") {
                                selectedTimer = nil
                            }
                            .foregroundColor(.red)
                        }
                    }
                }

                Section("设置定时关闭") {
                    ForEach(SleepTimerOption.allCases) { option in
                        Button {
                            selectedTimer = option
                            dismiss()
                        } label: {
                            HStack {
                                Text(option.rawValue)
                                    .foregroundColor(.primary)

                                Spacer()

                                if selectedTimer == option {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("定时关闭")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Chapter List Sheet

struct ChapterListSheet: View {
    let chapters: [ChapterInfo]
    let currentChapter: Int
    let onSelect: (ChapterInfo) -> Void

    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(chapters) { chapter in
                    Button {
                        onSelect(chapter)
                    } label: {
                        HStack {
                            Text(chapter.title)
                                .foregroundColor(chapter.number == currentChapter ? .blue : .primary)
                                .fontWeight(chapter.number == currentChapter ? .semibold : .regular)

                            Spacer()

                            if chapter.number == currentChapter {
                                Image(systemName: "speaker.wave.2.fill")
                                    .foregroundColor(.blue)
                            }

                            Text(formatDuration(chapter.duration))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("章节目录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let minutes = Int(seconds) / 60
        return "\(minutes)分钟"
    }
}

#Preview {
    AudioPlayerView(
        bookTitle: "人类简史",
        bookId: 1,
        bookType: .ebook,
        coverUrl: nil
    )
}
