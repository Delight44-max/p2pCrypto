package com.detech.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "price_alerts",
        indexes = {
                @Index(name = "idx_alert_user", columnList = "user_id"),
                @Index(name = "idx_alert_coin", columnList = "coin"),
                @Index(name = "idx_alert_condition", columnList = "condition"),
                @Index(name = "idx_alert_active", columnList = "isActive"),
                @Index(name = "idx_alert_triggered", columnList = "isTriggered")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @NotNull
    private Coin coin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Currency currency = Currency.NGN;

    @NotNull
    @DecimalMin(value = "0.01", message = "Target price must be greater than zero")
    @Column(nullable = false, precision = 36, scale = 2)
    private BigDecimal targetPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @NotNull
    private AlertCondition condition;

    @Builder.Default
    @Column(nullable = false)
    private boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean isTriggered = false;

    private LocalDateTime triggeredAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // =====================================================
    // ENUMS
    // =====================================================

    public enum Coin {
        BNB,
        USDT
    }

    public enum Currency {
        NGN
    }

    public enum AlertCondition {
        ABOVE,
        BELOW
    }
}