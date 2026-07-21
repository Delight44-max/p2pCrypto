package com.detech.controller;

import com.detech.dto.request.CreateAdRequest;
import com.detech.dto.response.AdDTO;
import com.detech.dto.response.ApiResponse;
import com.detech.entity.User;
import com.detech.service.TradeAdService;
import com.detech.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ads")
@RequiredArgsConstructor
public class TradeAdController {

    private final TradeAdService tradeAdService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<AdDTO>> createAd(
            @Valid @RequestBody CreateAdRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User buyer = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success("Ad posted successfully.", tradeAdService.createAd(request, buyer))
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdDTO>>> getOpenAds() {
        return ResponseEntity.ok(ApiResponse.success(tradeAdService.getOpenAds()));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<AdDTO>>> getMyAds(
            @AuthenticationPrincipal UserDetails userDetails) {

        User buyer = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(ApiResponse.success(tradeAdService.getMyAds(buyer)));
    }

    @GetMapping("/{adId}")
    public ResponseEntity<ApiResponse<AdDTO>> getAd(@PathVariable UUID adId) {
        return ResponseEntity.ok(ApiResponse.success(tradeAdService.getAd(adId)));
    }

    @PostMapping("/{adId}/cancel")
    public ResponseEntity<ApiResponse<AdDTO>> cancelAd(
            @PathVariable UUID adId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User buyer = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success("Ad cancelled.", tradeAdService.cancelAd(adId, buyer))
        );
    }

    @PostMapping("/{adId}/interested")
    public ResponseEntity<ApiResponse<AdDTO>> expressInterest(
            @PathVariable UUID adId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User seller = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success("Buyer has been notified.", tradeAdService.expressInterest(adId, seller))
        );
    }

    public record FulfillRequest(UUID tradeId) {}

    @PostMapping("/{adId}/fulfill")
    public ResponseEntity<ApiResponse<Void>> fulfillAd(
            @PathVariable UUID adId,
            @RequestBody FulfillRequest request) {

        tradeAdService.markFulfilled(adId, request.tradeId());

        return ResponseEntity.ok(ApiResponse.success("Ad marked fulfilled.", null));
    }
}