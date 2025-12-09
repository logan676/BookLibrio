import SwiftUI

struct BookCoverView: View {
    let coverUrl: String?
    let title: String

    var body: some View {
        if let urlString = coverUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    PlaceholderCover(title: title)
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    PlaceholderCover(title: title)
                @unknown default:
                    PlaceholderCover(title: title)
                }
            }
        } else {
            PlaceholderCover(title: title)
        }
    }
}

struct PlaceholderCover: View {
    let title: String

    var body: some View {
        ZStack {
            Color(.systemGray5)

            VStack {
                Image(systemName: "book.closed")
                    .font(.system(size: 30))
                    .foregroundColor(.secondary)

                Text(title)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
        }
    }
}

struct BookCoverCard: View {
    let title: String
    let coverUrl: String?
    let subtitle: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(coverUrl: coverUrl, title: title)
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    BookCoverCard(
        title: "Sample Book Title",
        coverUrl: nil,
        subtitle: "PDF",
        action: {}
    )
    .frame(width: 140)
    .padding()
}
