package com.detech.dto.response;

import com.detech.entity.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserDTO(

        UUID id,

        String fullName,

        String email,

        String phone,

        String walletAddress,

        String role,

        String kycStatus,

        String opayAccount,
        String opayName,

        String palmpayAccount,
        String palmpayName,

        String moniepointAccount,
        String moniepointName,

        int totalTrades,

        int completedTrades,

        int disputedTrades,

        BigDecimal rating,

        boolean active,

        boolean emailVerified,

        LocalDateTime createdAt

) {

    public static UserDTO from(User user) {

        return new UserDTO(

                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getWalletAddress(),

                user.getRole().name(),
                user.getKycStatus().name(),

                user.getOpayAccount(),
                user.getOpayName(),

                user.getPalmpayAccount(),
                user.getPalmpayName(),

                user.getMoniepointAccount(),
                user.getMoniepointName(),

                user.getTotalTrades(),
                user.getCompletedTrades(),
                user.getDisputedTrades(),

                user.getRating(),

                user.isActive(),
                user.isEmailVerified(),

                user.getCreatedAt()

        );

    }

}