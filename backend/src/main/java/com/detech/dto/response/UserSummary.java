package com.detech.dto.response;

import com.detech.entity.User;

import java.math.BigDecimal;
import java.util.UUID;

public record UserSummary(

        UUID id,

        String fullName,

        String walletAddress,

        int completedTrades,

        BigDecimal rating

) {

    public static UserSummary from(User user) {
        if (user == null) {
            return null;
        }

        return new UserSummary(
                user.getId(),
                user.getFullName(),
                user.getWalletAddress(),
                user.getCompletedTrades(),
                user.getRating()
        );
    }
}