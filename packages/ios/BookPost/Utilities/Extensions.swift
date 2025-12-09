import Foundation

extension Int64 {
    var formattedFileSize: String {
        let kb: Int64 = 1024
        let mb = kb * 1024
        let gb = mb * 1024

        if self >= gb {
            return String(format: "%.2f GB", Double(self) / Double(gb))
        } else if self >= mb {
            return String(format: "%.2f MB", Double(self) / Double(mb))
        } else if self >= kb {
            return String(format: "%.2f KB", Double(self) / Double(kb))
        } else {
            return "\(self) B"
        }
    }
}

extension String {
    var toDisplayDate: String {
        let inputFormatter = ISO8601DateFormatter()
        inputFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = inputFormatter.date(from: self) else {
            return self
        }

        let outputFormatter = DateFormatter()
        outputFormatter.locale = Locale(identifier: "zh_CN")
        outputFormatter.dateFormat = "yyyy年MM月dd日"

        return outputFormatter.string(from: date)
    }

    var toRelativeTime: String {
        let inputFormatter = ISO8601DateFormatter()
        inputFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = inputFormatter.date(from: self) else {
            return self
        }

        let now = Date()
        let diff = now.timeIntervalSince(date)

        let minutes = diff / 60
        let hours = minutes / 60
        let days = hours / 24

        if days > 30 {
            return toDisplayDate
        } else if days >= 1 {
            return "\(Int(days))天前"
        } else if hours >= 1 {
            return "\(Int(hours))小时前"
        } else if minutes >= 1 {
            return "\(Int(minutes))分钟前"
        } else {
            return "刚刚"
        }
    }
}

extension Optional where Wrapped == String {
    var orEmpty: String {
        self ?? ""
    }
}
