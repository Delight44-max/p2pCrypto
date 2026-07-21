package com.detech.controller;

import com.detech.dto.request.CreateAlertRequest;
import com.detech.dto.response.ApiResponse;
import com.detech.dto.response.PriceDTO;
import com.detech.entity.PriceAlert;
import com.detech.entity.User;
import com.detech.service.PriceService;
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
@RequestMapping("/api/prices")
@RequiredArgsConstructor
public class PriceController {

    private final PriceService priceService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PriceDTO>>> getPrices() {

        return ResponseEntity.ok(
                ApiResponse.success(priceService.getCurrentPrices())
        );
    }

    @PostMapping("/alerts")
    public ResponseEntity<ApiResponse<PriceAlert>> createAlert(
            @Valid @RequestBody CreateAlertRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Alert created successfully.",
                        priceService.createAlert(user, request)
                )
        );
    }

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<PriceAlert>>> getAlerts(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        priceService.getUserAlerts(user)
                )
        );
    }

    @DeleteMapping("/alerts/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        priceService.deleteAlert(id, user);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Alert deleted successfully.",
                        null
                )
        );
    }
}