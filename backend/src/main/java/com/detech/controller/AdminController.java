package com.detech.controller;

import com.detech.dto.request.ResolveRequest;
import com.detech.dto.response.ApiResponse;
import com.detech.dto.response.DashboardDTO;
import com.detech.dto.response.TradeDTO;
import com.detech.dto.response.UserDTO;
import com.detech.entity.User;
import com.detech.service.TradeService;
import com.detech.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final TradeService tradeService;
    private final UserService userService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardDTO>> getDashboard() {
        return ResponseEntity.ok(
                ApiResponse.success(tradeService.getDashboardStats())
        );
    }

    @GetMapping("/trades")
    public ResponseEntity<ApiResponse<List<TradeDTO>>> getAllTrades(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                ApiResponse.success(tradeService.getAllTrades(status))
        );
    }

    @PostMapping("/trades/{id}/resolve")
    public ResponseEntity<ApiResponse<TradeDTO>> resolveDispute(
            @PathVariable UUID id,
            @RequestBody ResolveRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Dispute resolved",
                        tradeService.resolveDispute(
                                id,
                                request.winnerId(),
                                user
                        )
                )
        );
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {

        return ResponseEntity.ok(
                ApiResponse.success(userService.getAllUsers())
        );
    }

    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<ApiResponse<Void>> toggleUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User admin = userService.getUserByEmail(userDetails.getUsername());
        userService.toggleUserStatus(id, admin);

        return ResponseEntity.ok(
                ApiResponse.success("User status updated", null)
        );
    }


}