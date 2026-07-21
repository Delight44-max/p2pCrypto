package com.detech.dto.request;

import com.detech.entity.Trade;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateAdRequest {

    @NotNull
    private Trade.TokenType tokenType;

    @NotNull
    @DecimalMin(value = "0.00000001")
    private BigDecimal amount;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal fiatAmount;

    private String fiatCurrency = "NGN";

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal pricePerUnit;

    @NotNull
    private Trade.PaymentMethod paymentMethod;

    // Optional — if blank, backend falls back to the buyer's saved
    // profile walletAddress.
    private String walletAddress;

    private String note;
}