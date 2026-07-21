package com.detech.service;

import com.detech.dto.request.CreateAlertRequest;
import com.detech.dto.response.PriceDTO;
import com.detech.entity.PriceAlert;
import com.detech.entity.User;
import com.detech.exception.BadRequestException;
import com.detech.exception.ResourceNotFoundException;
import com.detech.repository.PriceAlertRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceService {

    @Value("${coingecko.api.url}")
    private String coingeckoUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SimpMessagingTemplate messagingTemplate;
    private final PriceAlertRepository priceAlertRepository;

    // In-memory price cache
    private final Map<String, BigDecimal> priceCache = new HashMap<>();
    private final Map<String, BigDecimal> change24hCache = new HashMap<>();
    private LocalDateTime lastUpdated;

    // Coin IDs for CoinGecko
    private static final Map<String, String> COIN_IDS = Map.of(
            "BNB", "binancecoin",
            "USDT", "tether"
    );

    @Scheduled(fixedRate = 30000) // every 30 seconds
    public void fetchAndBroadcastPrices() {
        try {
            String ids = String.join(",", COIN_IDS.values());
            String url = coingeckoUrl + "/simple/price?ids=" + ids +
                    "&vs_currencies=ngn,usd&include_24hr_change=true";

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            List<PriceDTO> prices = new ArrayList<>();

            // BNB/NGN
            if (root.has("binancecoin")) {
                JsonNode bnb = root.get("binancecoin");
                BigDecimal bnbNgn = BigDecimal.valueOf(bnb.get("ngn").asDouble()).setScale(2, RoundingMode.HALF_UP);
                BigDecimal bnbChange = BigDecimal.valueOf(bnb.has("ngn_24h_change") ? bnb.get("ngn_24h_change").asDouble() : 0).setScale(2, RoundingMode.HALF_UP);
                priceCache.put("BNB_NGN", bnbNgn);
                change24hCache.put("BNB_NGN", bnbChange);
                prices.add(new PriceDTO("BNB", "NGN", bnbNgn, bnbChange, LocalDateTime.now()));

                // BNB/USD
                BigDecimal bnbUsd = BigDecimal.valueOf(bnb.get("usd").asDouble()).setScale(2, RoundingMode.HALF_UP);
                priceCache.put("BNB_USD", bnbUsd);
                prices.add(new PriceDTO("BNB", "USD", bnbUsd, bnbChange, LocalDateTime.now()));
            }

            // USDT/NGN
            if (root.has("tether")) {
                JsonNode usdt = root.get("tether");
                BigDecimal usdtNgn = BigDecimal.valueOf(usdt.get("ngn").asDouble()).setScale(2, RoundingMode.HALF_UP);
                BigDecimal usdtChange = BigDecimal.valueOf(usdt.has("ngn_24h_change") ? usdt.get("ngn_24h_change").asDouble() : 0).setScale(2, RoundingMode.HALF_UP);
                priceCache.put("USDT_NGN", usdtNgn);
                change24hCache.put("USDT_NGN", usdtChange);
                prices.add(new PriceDTO("USDT", "NGN", usdtNgn, usdtChange, LocalDateTime.now()));
            }

            lastUpdated = LocalDateTime.now();

            // Broadcast to all subscribers
            messagingTemplate.convertAndSend("/topic/prices", prices);

            // Check price alerts
            checkPriceAlerts();

            log.info("Prices updated: {}", priceCache);

        } catch (Exception e) {
            log.error("Failed to fetch prices: {}", e.getMessage());
        }
    }

    private void checkPriceAlerts() {
        List<PriceAlert> activeAlerts = priceAlertRepository.findByIsActiveTrueAndIsTriggeredFalse();
        for (PriceAlert alert : activeAlerts) {
            String key = alert.getCoin() + "_" + alert.getCurrency();
            BigDecimal currentPrice = priceCache.get(key);
            if (currentPrice == null) continue;

            boolean triggered = false;
            if (alert.getCondition() == PriceAlert.AlertCondition.ABOVE
                    && currentPrice.compareTo(alert.getTargetPrice()) >= 0) {
                triggered = true;
            } else if (alert.getCondition() == PriceAlert.AlertCondition.BELOW
                    && currentPrice.compareTo(alert.getTargetPrice()) <= 0) {
                triggered = true;
            }

            if (triggered) {
                alert.setTriggered(true);
                alert.setTriggeredAt(LocalDateTime.now());
                alert.setActive(false);
                priceAlertRepository.save(alert);

                // Send notification via WebSocket
                messagingTemplate.convertAndSendToUser(
                        alert.getUser().getEmail(),
                        "/queue/alerts",
                        Map.of(
                                "type", "PRICE_ALERT",
                                "coin", alert.getCoin(),
                                "currency", alert.getCurrency(),
                                "targetPrice", alert.getTargetPrice(),
                                "currentPrice", currentPrice,
                                "condition", alert.getCondition().name()
                        )
                );
            }
        }
    }

    public List<PriceDTO> getCurrentPrices() {

        List<PriceDTO> prices = new ArrayList<>();

        priceCache.forEach((key, price) -> {

            String[] parts = key.split("_");

            if (parts.length == 2) {

                prices.add(new PriceDTO(
                        parts[0],
                        parts[1],
                        price,
                        change24hCache.getOrDefault(key, BigDecimal.ZERO),
                        lastUpdated != null ? lastUpdated : LocalDateTime.now()
                ));

            }

        });

        return prices;
    }

    public BigDecimal getPrice(String coin, String currency) {
        return priceCache.getOrDefault(coin + "_" + currency, BigDecimal.ZERO);
    }

    public PriceAlert createAlert(User user, CreateAlertRequest request) {

        PriceAlert alert = PriceAlert.builder()
                .user(user)
                .coin(request.getCoin())
                .currency(request.getCurrency())
                .targetPrice(request.getTargetPrice())
                .condition(
                        PriceAlert.AlertCondition.valueOf(
                                String.valueOf(request.getCondition())
                        )
                )
                .build();

        return priceAlertRepository.save(alert);
    }

    public List<PriceAlert> getUserAlerts(User user) {
        return priceAlertRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public void deleteAlert(UUID id, User user) {
        PriceAlert alert = priceAlertRepository.findById(id)
                .orElseThrow(() -> new com.detech.exception.ResourceNotFoundException("Alert not found"));
        if (!alert.getUser().getId().equals(user.getId())) {
            throw new com.detech.exception.BadRequestException("Not your alert");
        }
        priceAlertRepository.delete(alert);
    }
}
