package com.detech.dto.response;

import com.detech.entity.Trade;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TradeDTO(

        UUID id,

        Long onChainTradeId,

        String tradeReference,

        UserSummary seller,

        UserSummary buyer,

        String tokenType,

        BigDecimal amount,

        BigDecimal feeAmount,

        BigDecimal fiatAmount,

        String fiatCurrency,

        BigDecimal pricePerUnit,

        String paymentMethod,

        String status,

        String txHash,

        String disputeReason,

        String resolvedBy,

        LocalDateTime resolvedAt,

        LocalDateTime expiresAt,

        LocalDateTime completedAt,

        LocalDateTime cancelledAt,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {

    public static TradeDTO from(Trade trade) {

        return new TradeDTO(

                trade.getId(),

                trade.getOnChainTradeId(),

                trade.getTradeReference(),

                UserSummary.from(trade.getSeller()),

                UserSummary.from(trade.getBuyer()),

                trade.getTokenType().name(),

                trade.getAmount(),

                trade.getFeeAmount(),

                trade.getFiatAmount(),

                trade.getFiatCurrency(),

                trade.getPricePerUnit(),

                trade.getPaymentMethod().name(),

                trade.getStatus().name(),

                trade.getTxHash(),

                trade.getDisputeReason(),

                trade.getResolvedBy(),

                trade.getResolvedAt(),

                trade.getExpiresAt(),

                trade.getCompletedAt(),

                trade.getCancelledAt(),

                trade.getCreatedAt(),

                trade.getUpdatedAt()

        );

    }

}