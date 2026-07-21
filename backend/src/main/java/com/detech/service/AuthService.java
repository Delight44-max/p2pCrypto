package com.detech.service;

import com.detech.dto.request.LoginRequest;
import com.detech.dto.request.RegisterRequest;
import com.detech.dto.response.AuthResponse;
import com.detech.entity.User;
import com.detech.exception.BadRequestException;
import com.detech.repository.UserRepository;
import com.detech.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    /**
     * Register a new user.
     * The first registered user becomes the ADMIN.
     */
    public AuthResponse register(RegisterRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered.");
        }

        User.UserRole role = userRepository.existsByRole(User.UserRole.ADMIN)
                ? User.UserRole.USER
                : User.UserRole.ADMIN;

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .build();

        user = userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("fullName", user.getFullName());
        claims.put("role", user.getRole().name());
        claims.put("walletAddress", user.getWalletAddress());

        String token = jwtUtil.generateToken(claims, userDetails);

        return AuthResponse.from(user, token);
    }

    /**
     * Authenticate an existing user.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("fullName", user.getFullName());
        claims.put("role", user.getRole().name());
        claims.put("walletAddress", user.getWalletAddress());

        String token = jwtUtil.generateToken(claims, userDetails);

        return AuthResponse.from(user, token);
    }

}