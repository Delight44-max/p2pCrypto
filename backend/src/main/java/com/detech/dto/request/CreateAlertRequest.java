package com.detech.dto.request;

import com.detech.entity.PriceAlert;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateAlertRequest {

    @NotNull
    private PriceAlert.Coin coin;

    @NotNull
    private PriceAlert.Currency currency;

    @NotNull
    private BigDecimal targetPrice;

    @NotNull
    private PriceAlert.AlertCondition condition;

}