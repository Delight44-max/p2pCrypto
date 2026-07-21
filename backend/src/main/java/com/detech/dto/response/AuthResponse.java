package com.detech.dto.response;

import com.detech.entity.User;

import java.util.UUID;

public record AuthResponse(

        String token,

        UUID id,

        String fullName,

        String email,

        String phone,

        String role,

        String walletAddress,

        String kycStatus,

        String opayAccount,

        String opayName,

        String palmpayAccount,

        String palmpayName,

        String moniepointAccount,

        String moniepointName

) {

    public static AuthResponse from(User user, String token) {

        return new AuthResponse(

                token,

                user.getId(),

                user.getFullName(),

                user.getEmail(),

                user.getPhone(),

                user.getRole().name(),

                user.getWalletAddress(),

                user.getKycStatus().name(),

                user.getOpayAccount(),

                user.getOpayName(),

                user.getPalmpayAccount(),

                user.getPalmpayName(),

                user.getMoniepointAccount(),

                user.getMoniepointName()
        );
    }
}