package com.detech.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConnectWalletRequest {

    @NotBlank
    private String walletAddress;

    @NotBlank
    private String message;

    @NotBlank
    private String signature;
}