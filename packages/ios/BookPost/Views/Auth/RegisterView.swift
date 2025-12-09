import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var localError: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Text("创建新账号")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.blue)

            Spacer()

            VStack(spacing: 16) {
                // Username
                HStack {
                    Image(systemName: "person")
                        .foregroundColor(.secondary)
                    TextField("用户名", text: $username)
                        .autocapitalization(.none)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Email
                HStack {
                    Image(systemName: "envelope")
                        .foregroundColor(.secondary)
                    TextField("邮箱", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Password
                HStack {
                    Image(systemName: "lock")
                        .foregroundColor(.secondary)

                    if showPassword {
                        TextField("密码", text: $password)
                    } else {
                        SecureField("密码", text: $password)
                    }

                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye" : "eye.slash")
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Confirm password
                HStack {
                    Image(systemName: "lock")
                        .foregroundColor(.secondary)

                    if showPassword {
                        TextField("确认密码", text: $confirmPassword)
                    } else {
                        SecureField("确认密码", text: $confirmPassword)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }

            // Error message
            if let error = localError ?? authManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // Register button
            Button(action: register) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("注册")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authManager.isLoading || !isFormValid)

            // Login link
            Button(action: { dismiss() }) {
                Text("已有账号? 登录")
                    .font(.subheadline)
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var isFormValid: Bool {
        !username.isEmpty && !email.isEmpty && !password.isEmpty && !confirmPassword.isEmpty
    }

    private func register() {
        localError = nil

        guard password == confirmPassword else {
            localError = "两次输入的密码不一致"
            return
        }

        guard password.count >= 6 else {
            localError = "密码长度至少6位"
            return
        }

        Task {
            await authManager.register(username: username, email: email, password: password)
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(AuthManager.shared)
    }
}
