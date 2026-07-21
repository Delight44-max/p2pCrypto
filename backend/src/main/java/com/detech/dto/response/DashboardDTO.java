package com.detech.dto.response;

public record DashboardDTO(

        long totalTrades,

        long activeTrades,

        long completedTrades,

        long disputedTrades,

        long cancelledTrades,

        long totalUsers,

        long verifiedUsers,

        long pendingKyc,

        long totalPriceAlerts

) {
}