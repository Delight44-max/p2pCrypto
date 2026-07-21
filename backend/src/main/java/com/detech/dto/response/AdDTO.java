package com.detech.dto.response;

import com.detech.entity.TradeAd;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record AdDTO(
        UUID id,
        UserSummary buyer,
        String tokenType,
        BigDecimal amount,
        BigDecimal feeAmount,
        BigDecimal netAmount,
        BigDecimal fiatAmount,
        String fiatCurrency,
        BigDecimal pricePerUnit,
        String paymentMethod,
        String walletAddress,
        String status,
        UserSummary interestedSeller,
        UUID resultingTradeId,
        String note,
        LocalDateTime createdAt
) {
    public static AdDTO from(TradeAd ad) {
        return new AdDTO(
                ad.getId(),
                UserSummary.from(ad.getBuyer()),
                ad.getTokenType().name(),
                ad.getAmount(),
                ad.getFeeAmount(),
                ad.getNetAmount(),
                ad.getFiatAmount(),
                ad.getFiatCurrency(),
                ad.getPricePerUnit(),
                ad.getPaymentMethod().name(),
                ad.getWalletAddress(),
                ad.getStatus().name(),
                ad.getInterestedSeller() != null ? UserSummary.from(ad.getInterestedSeller()) : null,
                ad.getResultingTradeId(),
                ad.getNote(),
                ad.getCreatedAt()
        );
    }
}