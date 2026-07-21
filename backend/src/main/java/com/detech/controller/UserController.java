package com.detech.controller;

import com.detech.dto.request.ChangePasswordRequest;
import com.detech.dto.request.UpdateProfileRequest;
import com.detech.dto.response.ApiResponse;
import com.detech.dto.response.UserDTO;
import com.detech.entity.User;
import com.detech.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.detech.dto.request.ConnectWalletRequest;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(userService.getProfile(user))
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Profile updated successfully.",
                        userService.updateProfile(user, request)
                )
        );
    }

    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        userService.changePassword(user, request);

        return ResponseEntity.ok(
                ApiResponse.<Void>success("Password changed successfully.", null)
        );
    }
    @PostMapping("/wallet/connect")
    public ResponseEntity<ApiResponse<UserDTO>> connectWallet(
            @Valid @RequestBody ConnectWalletRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    )

    {
        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Wallet connected successfully.",
                        userService.connectWallet(user, request)
                )
        );
    }

    @DeleteMapping("/wallet")
    public ResponseEntity<ApiResponse<UserDTO>> disconnectWallet(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserByEmail(userDetails.getUsername());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Wallet deleted successfully.",
                        userService.disconnectWallet(user)
                )
        );
    }
}