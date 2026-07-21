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
        name = "trade_ads",
        indexes = {
                @Index(name = "idx_ad_status", columnList = "status"),
                @Index(name = "idx_ad_buyer", columnList = "buyer_id"),
                @Index(name = "idx_ad_created", columnList = "createdAt")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeAd {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @NotNull
    private Trade.TokenType tokenType;

    // Gross amount the buyer wants — what the seller will fund the escrow with.
    @NotNull
    @DecimalMin(value = "0.00000001")
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal amount;

    // 1% of amount, precomputed at post time so the buyer sees it up front.
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal feeAmount;

    // amount - feeAmount — what the buyer will actually receive on release.
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal netAmount;

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
    private Trade.PaymentMethod paymentMethod;

    // Where the seller should send funds. Defaults to buyer.walletAddress
    // but stored separately in case the buyer wants a different receiving
    // address for this specific ad.
    @Column(nullable = false, length = 100)
    private String walletAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AdStatus status = AdStatus.OPEN;

    // Seller who clicked "Interested" — null until someone does.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "interested_seller_id")
    private User interestedSeller;

    // Set once a real Trade has been created from this ad.
    private UUID resultingTradeId;

    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum AdStatus {
        OPEN,        // visible to all sellers
        INTERESTED,  // a seller has claimed it, waiting for trade creation
        FULFILLED,   // a Trade was created from this ad
        CLOSED       // buyer cancelled it manually
    }
}