package com.detech.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email"),
                @Index(name = "idx_user_phone", columnList = "phone"),
                @Index(name = "idx_user_wallet", columnList = "walletAddress"),
                @Index(name = "idx_user_role", columnList = "role"),
                @Index(name = "idx_user_kyc", columnList = "kycStatus")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @NotBlank(message = "Full name is required")
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String fullName;

    @Email(message = "Invalid email address")
    @NotBlank(message = "Email is required")
    @Size(max = 150)
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 255)
    @Column(nullable = false)
    private String password;

    @Pattern(
            regexp = "^(\\+234|0)[789][01]\\d{8}$",
            message = "Invalid Nigerian phone number"
    )
    @Column(unique = true, length = 15)
    private String phone;

    @Column(unique = true, length = 42)
    private String walletAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private KycStatus kycStatus = KycStatus.PENDING;

    @Builder.Default
    @Column(nullable = false)
    private boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean isEmailVerified = false;

    private LocalDateTime emailVerifiedAt;

    // ===========================
    // Payment Accounts
    // ===========================

    @Column(length = 20)
    private String opayAccount;

    @Column(length = 100)
    private String opayName;

    @Column(length = 20)
    private String palmpayAccount;

    @Column(length = 100)
    private String palmpayName;

    @Column(length = 20)
    private String moniepointAccount;

    @Column(length = 100)
    private String moniepointName;

    // ===========================
    // Statistics
    // ===========================

    @Builder.Default
    @Column(nullable = false)
    private int totalTrades = 0;

    @Builder.Default
    @Column(nullable = false)
    private int completedTrades = 0;

    @Builder.Default
    @Column(nullable = false)
    private int disputedTrades = 0;

    @Builder.Default
    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;

    // ===========================
    // Security
    // ===========================

    private LocalDateTime lastLogin;

    @Builder.Default
    @Column(nullable = false)
    private boolean accountLocked = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean accountExpired = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean credentialsExpired = false;

    // ===========================
    // Audit
    // ===========================

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Boolean walletVerified = false;

    private LocalDateTime walletConnectedAt;

    // ===========================
    // Enums
    // ===========================

    public enum UserRole {
        USER,
        ADMIN
    }

    public enum KycStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }
}