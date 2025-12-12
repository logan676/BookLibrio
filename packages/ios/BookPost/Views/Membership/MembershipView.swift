import SwiftUI

/// MembershipView displays subscription plans and membership benefits
/// Supports multiple plan tiers with in-app purchase integration
struct MembershipView: View {
    @StateObject private var viewModel = MembershipViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Current membership status
                    if viewModel.currentMembership != nil {
                        currentMembershipCard
                    }

                    // Benefits section
                    benefitsSection

                    // Plans section
                    plansSection

                    // Promo banner
                    if viewModel.promoText != nil {
                        promoBanner
                    }

                    // Redeem code section
                    redeemSection

                    // FAQ link
                    faqLink
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("会员中心")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                }
            }
            .task {
                await viewModel.loadPlans()
            }
        }
    }

    // MARK: - Current Membership Card

    private var currentMembershipCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "crown.fill")
                            .foregroundColor(.yellow)
                        Text("当前会员")
                            .font(.headline)
                    }

                    if let membership = viewModel.currentMembership {
                        Text(membership.planName)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("有效期至 \(membership.expiresAt)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Days remaining badge
                if let days = viewModel.daysRemaining {
                    VStack {
                        Text("\(days)")
                            .font(.title)
                            .fontWeight(.bold)
                        Text("天")
                            .font(.caption)
                    }
                    .foregroundColor(.orange)
                }
            }

            // Renewal reminder
            if viewModel.shouldShowRenewalReminder {
                HStack {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.orange)
                    Text("会员即将到期，立即续费享更多优惠")
                        .font(.caption)
                    Spacer()
                    Button("立即续费") {
                        // Scroll to plans
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
                .padding(12)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.2), Color.yellow.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
    }

    // MARK: - Benefits Section

    private var benefitsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("会员权益")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(MembershipBenefit.allBenefits) { benefit in
                    benefitCard(benefit)
                }
            }
        }
    }

    private func benefitCard(_ benefit: MembershipBenefit) -> some View {
        HStack(spacing: 12) {
            Image(systemName: benefit.icon)
                .font(.title2)
                .foregroundColor(benefit.color)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(benefit.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(benefit.subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Plans Section

    private var plansSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("选择套餐")
                .font(.headline)

            VStack(spacing: 12) {
                ForEach(viewModel.plans) { plan in
                    planCard(plan)
                }
            }
        }
    }

    private func planCard(_ plan: MembershipPlan) -> some View {
        let isSelected = viewModel.selectedPlan?.id == plan.id

        return Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                viewModel.selectedPlan = plan
            }
        } label: {
            VStack(spacing: 0) {
                // Badge if recommended
                if plan.isRecommended {
                    Text("推荐")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.orange)
                        .cornerRadius(4, corners: [.topLeft, .topRight])
                }

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(plan.name)
                                .font(.headline)
                                .foregroundColor(.primary)

                            if plan.discount > 0 {
                                Text("\(Int(plan.discount * 100))%OFF")
                                    .font(.caption2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.red)
                                    .cornerRadius(4)
                            }
                        }

                        Text(plan.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text("¥")
                                .font(.subheadline)
                            Text("\(plan.price)")
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        .foregroundColor(isSelected ? .blue : .primary)

                        if let originalPrice = plan.originalPrice {
                            Text("¥\(originalPrice)")
                                .font(.caption)
                                .strikethrough()
                                .foregroundColor(.secondary)
                        }
                    }

                    // Selection indicator
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.title2)
                        .foregroundColor(isSelected ? .blue : .secondary)
                        .padding(.leading, 8)
                }
                .padding()
                .background(Color(.systemBackground))
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Promo Banner

    private var promoBanner: some View {
        HStack {
            Image(systemName: "gift.fill")
                .foregroundColor(.red)

            Text(viewModel.promoText ?? "")
                .font(.subheadline)

            Spacer()

            Text("立即领取")
                .font(.caption)
                .foregroundColor(.blue)
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Redeem Section

    private var redeemSection: some View {
        Button {
            viewModel.showRedeemSheet = true
        } label: {
            HStack {
                Image(systemName: "ticket.fill")
                    .foregroundColor(.blue)

                Text("使用兑换码")
                    .foregroundColor(.primary)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
        .sheet(isPresented: $viewModel.showRedeemSheet) {
            RedeemCodeSheet()
        }
    }

    // MARK: - FAQ Link

    private var faqLink: some View {
        HStack {
            Spacer()
            Button {
                // Open FAQ
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "questionmark.circle")
                    Text("会员常见问题")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            Spacer()
        }
    }
}

// MARK: - Purchase Button (Floating)

struct MembershipPurchaseButton: View {
    let plan: MembershipPlan?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if let plan = plan {
                    Text("立即开通 · ¥\(plan.price)")
                } else {
                    Text("请选择套餐")
                }
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(plan != nil ? Color.blue : Color.gray)
            .cornerRadius(24)
        }
        .disabled(plan == nil)
        .padding()
        .background(.ultraThinMaterial)
    }
}

// MARK: - Redeem Code Sheet

struct RedeemCodeSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var code = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Input field
                VStack(alignment: .leading, spacing: 8) {
                    Text("输入兑换码")
                        .font(.headline)

                    TextField("请输入兑换码", text: $code)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .autocapitalization(.allCharacters)

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }

                // Redeem button
                Button {
                    redeemCode()
                } label: {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("立即兑换")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(code.isEmpty ? Color.gray : Color.blue)
                .cornerRadius(24)
                .disabled(code.isEmpty || isLoading)

                Spacer()

                // Help text
                Text("兑换码可通过活动获得，每个账号仅可使用一次")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .navigationTitle("兑换码")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func redeemCode() {
        isLoading = true
        errorMessage = nil

        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isLoading = false
            // For demo, show error
            errorMessage = "兑换码无效或已使用"
        }
    }
}

// MARK: - Models

struct MembershipPlan: Identifiable {
    let id: String
    let name: String
    let description: String
    let price: Int
    let originalPrice: Int?
    let duration: Int // days
    let discount: Double
    let isRecommended: Bool
    let isAutoRenewal: Bool

    static let allPlans: [MembershipPlan] = [
        MembershipPlan(
            id: "monthly_auto",
            name: "连续包月",
            description: "首月特惠，自动续费可随时取消",
            price: 19,
            originalPrice: 30,
            duration: 30,
            discount: 0.37,
            isRecommended: true,
            isAutoRenewal: true
        ),
        MembershipPlan(
            id: "monthly",
            name: "月卡",
            description: "单月会员",
            price: 30,
            originalPrice: nil,
            duration: 30,
            discount: 0,
            isRecommended: false,
            isAutoRenewal: false
        ),
        MembershipPlan(
            id: "quarterly",
            name: "季卡",
            description: "3个月会员",
            price: 68,
            originalPrice: 90,
            duration: 90,
            discount: 0.24,
            isRecommended: false,
            isAutoRenewal: false
        ),
        MembershipPlan(
            id: "yearly",
            name: "年卡",
            description: "12个月会员，超值推荐",
            price: 198,
            originalPrice: 360,
            duration: 365,
            discount: 0.45,
            isRecommended: false,
            isAutoRenewal: false
        )
    ]
}

struct MembershipStatus {
    let planName: String
    let expiresAt: String
    let isActive: Bool
}

struct MembershipBenefit: Identifiable {
    let id: String
    let icon: String
    let title: String
    let subtitle: String
    let color: Color

    static let allBenefits: [MembershipBenefit] = [
        MembershipBenefit(id: "1", icon: "book.fill", title: "无限阅读", subtitle: "海量书籍免费读", color: .blue),
        MembershipBenefit(id: "2", icon: "waveform", title: "AI有声书", subtitle: "智能朗读全部书籍", color: .purple),
        MembershipBenefit(id: "3", icon: "sparkles", title: "AI问书", subtitle: "智能问答无限次", color: .orange),
        MembershipBenefit(id: "4", icon: "arrow.down.circle.fill", title: "离线下载", subtitle: "无网络也能阅读", color: .green),
        MembershipBenefit(id: "5", icon: "gift.fill", title: "专属活动", subtitle: "会员专享福利", color: .red),
        MembershipBenefit(id: "6", icon: "crown.fill", title: "身份标识", subtitle: "彰显尊贵身份", color: .yellow)
    ]
}

// MARK: - ViewModel

@MainActor
class MembershipViewModel: ObservableObject {
    @Published var plans: [MembershipPlan] = []
    @Published var selectedPlan: MembershipPlan?
    @Published var currentMembership: MembershipStatus?
    @Published var promoText: String? = "新用户首月仅需9.9元"
    @Published var showRedeemSheet = false
    @Published var isLoading = false

    var daysRemaining: Int? {
        // Calculate from currentMembership.expiresAt
        return 15
    }

    var shouldShowRenewalReminder: Bool {
        guard let days = daysRemaining else { return false }
        return days <= 7
    }

    func loadPlans() async {
        isLoading = true
        // Simulate API call
        try? await Task.sleep(nanoseconds: 500_000_000)
        plans = MembershipPlan.allPlans
        selectedPlan = plans.first { $0.isRecommended }
        isLoading = false
    }

    func purchase() async {
        guard let plan = selectedPlan else { return }
        // Implement StoreKit purchase
        print("Purchasing plan: \(plan.name)")
    }
}

#Preview {
    MembershipView()
}
