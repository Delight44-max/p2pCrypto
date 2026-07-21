package com.detech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PriceDTO(

        String coin,

        String currency,

        BigDecimal price,

        BigDecimal change24h,

        LocalDateTime updatedAt

) {
}