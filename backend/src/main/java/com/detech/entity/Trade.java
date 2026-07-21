package com.detech.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "trades",
        indexes = {
                @Index(name = "idx_trade_status", columnList = "status"),
                @Index(name = "idx_trade_seller", columnList = "seller_id"),
                @Index(name = "idx_trade_buyer", columnList = "buyer_id"),
                @Index(name = "idx_trade_created", columnList = "createdAt"),
                @Index(name = "idx_trade_chain", columnList = "onChainTradeId"),
                @Index(name = "idx_trade_payment", columnList = "paymentMethod")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    private Long version;

    @Column(unique = true)
    private Long onChainTradeId;

    @Column(unique = true, nullable = false, length = 30)
    private String tradeReference;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @NotNull
    private TokenType tokenType;

    @NotNull
    @DecimalMin(value = "0.00000001")
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal amount;

    @Builder.Default
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @NotNull
    @DecimalMin(value = "0.01")
    @Column(nullable = false, precision = 36, scale = 2)
    private BigDecimal fiatAmount;

    @Builder.Default
    @Column(nullable = false, length = 5)
    private String fiatCurrency = "NGN";

    @NotNull
    @DecimalMin(value = "0.01")
    @Column(nullable = false, precision = 36, scale = 2)
    private BigDecimal pricePerUnit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @NotNull
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TradeStatus status = TradeStatus.PENDING;

    @Column(length = 66)
    private String txHash;

    @Column(columnDefinition = "TEXT")
    private String disputeReason;

    @Column(length = 100)
    private String resolvedBy;

    private LocalDateTime resolvedAt;

    private LocalDateTime completedAt;

    private LocalDateTime cancelledAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(length = 500)
    private String sellerNote;

    @Column(length = 500)
    private String buyerNote;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum TokenType {
        BNB,
        USDT
    }

    public enum PaymentMethod {
        OPAY,
        PALMPAY,
        MONIEPOINT
    }

    public enum TradeStatus {
        PENDING,
        FUNDED,
        PAYMENT_SENT,
        COMPLETED,
        CANCELLED,
        DISPUTED,
        RESOLVED,
        EXPIRED
    }
}