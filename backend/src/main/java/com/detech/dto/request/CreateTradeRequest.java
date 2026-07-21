package com.detech.dto.request;

import com.detech.entity.Trade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateTradeRequest {

    @NotBlank
    private String buyerWalletAddress;

    @NotNull
    private BigDecimal amount;

    @NotNull
    private Trade.TokenType tokenType;

    @NotNull
    private Trade.PaymentMethod paymentMethod;

    @NotNull
    private BigDecimal fiatAmount;

    @NotNull
    private BigDecimal pricePerUnit;

    private String fiatCurrency = "NGN";

}