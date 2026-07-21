package com.detech.controller;

import com.detech.dto.request.ChatRequest;
import com.detech.dto.request.CreateTradeRequest;
import com.detech.dto.response.ApiResponse;
import com.detech.dto.response.ChatDTO;
import com.detech.dto.response.TradeDTO;
import com.detech.entity.Trade;
import com.detech.entity.User;
import com.detech.service.ChatService;
import com.detech.service.TradeService;
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
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final ChatService chatService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<TradeDTO>> createTrade(
            @Valid @RequestBody CreateTradeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User seller = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Trade created successfully.",
                        tradeService.createTrade(request, seller)
                )
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TradeDTO>>> getMyTrades(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        tradeService.getUserTrades(user)
                )
        );
    }

    @GetMapping("/{tradeId}")
    public ResponseEntity<ApiResponse<TradeDTO>> getTrade(
            @PathVariable UUID tradeId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        tradeService.getTradeById(tradeId, user)
                )
        );
    }

    @PatchMapping("/{tradeId}/status")
    public ResponseEntity<ApiResponse<TradeDTO>> updateTradeStatus(
            @PathVariable UUID tradeId,
            @RequestBody StatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Trade status updated successfully.",
                        tradeService.updateTradeStatus(
                                tradeId,
                                Trade.TradeStatus.valueOf(request.status().toUpperCase()),
                                request.txHash(),
                                user
                        )
                )
        );
    }

    @PostMapping("/{tradeId}/dispute")
    public ResponseEntity<ApiResponse<TradeDTO>> openDispute(
            @PathVariable UUID tradeId,
            @RequestBody DisputeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Dispute opened successfully.",
                        tradeService.openDispute(
                                tradeId,
                                request.reason(),
                                user
                        )
                )
        );
    }

    @GetMapping("/{tradeId}/messages")
    public ResponseEntity<ApiResponse<List<ChatDTO>>> getTradeMessages(
            @PathVariable UUID tradeId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        chatService.getTradeMessages(tradeId, user)
                )
        );
    }

    @PostMapping("/{tradeId}/messages")
    public ResponseEntity<ApiResponse<ChatDTO>> sendMessage(
            @PathVariable UUID tradeId,
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Message sent successfully.",
                        chatService.sendMessage(
                                tradeId,
                                request.getMessage(),
                                user
                        )
                )
        );
    }

    public record StatusRequest(
            String status,
            String txHash
    ) {
    }

    public record DisputeRequest(
            String reason
    ) {
    }

}