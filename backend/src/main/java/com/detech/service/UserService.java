package com.detech.service;

import com.detech.dto.request.ChangePasswordRequest;
import com.detech.dto.request.ConnectWalletRequest;
import com.detech.dto.request.UpdateProfileRequest;
import com.detech.dto.response.UserDTO;
import com.detech.entity.User;
import com.detech.exception.BadRequestException;
import com.detech.exception.ResourceNotFoundException;
import com.detech.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SignatureException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private String recoverAddress(String message, String signature) throws SignatureException {

        byte[] msg = message.getBytes(StandardCharsets.UTF_8);

        Sign.SignatureData sig = signatureData(signature);

        BigInteger publicKey = Sign.signedPrefixedMessageToKey(msg, sig);

        return "0x" + Keys.getAddress(publicKey);
    }

    private Sign.SignatureData signatureData(String signature) {

        byte[] sigBytes = Numeric.hexStringToByteArray(signature);

        byte v = sigBytes[64];

        if (v < 27) {
            v += 27;
        }

        return new Sign.SignatureData(
                v,
                java.util.Arrays.copyOfRange(sigBytes,0,32),
                java.util.Arrays.copyOfRange(sigBytes,32,64)
        );
    }

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserDTO getProfile(User user) {
        return UserDTO.from(user);
    }

    @Transactional
    public UserDTO updateProfile(User user, UpdateProfileRequest request) {
        if (request.getWalletAddress() != null) {
            String wallet = request.getWalletAddress().trim();

            if (wallet.isEmpty()) {
                user.setWalletAddress(null);
                user.setWalletVerified(false);
                user.setWalletConnectedAt(null);
            } else if (!wallet.equalsIgnoreCase(user.getWalletAddress())
                    && userRepository.existsByWalletAddress(wallet)) {
                throw new BadRequestException("Wallet address is already linked to another account.");
            } else {
                user.setWalletAddress(wallet);
            }
        }


        if (request.getOpayAccount() != null) {
            user.setOpayAccount(request.getOpayAccount().trim());
        }

        if (request.getOpayName() != null) {
            user.setOpayName(request.getOpayName().trim());
        }

        if (request.getPalmpayAccount() != null) {
            user.setPalmpayAccount(request.getPalmpayAccount().trim());
        }

        if (request.getPalmpayName() != null) {
            user.setPalmpayName(request.getPalmpayName().trim());
        }

        if (request.getMoniepointAccount() != null) {
            user.setMoniepointAccount(request.getMoniepointAccount().trim());
        }

        if (request.getMoniepointName() != null) {
            user.setMoniepointName(request.getMoniepointName().trim());
        }

        user = userRepository.save(user);

        return UserDTO.from(user);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(UserDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void toggleUserStatus(UUID userId, User adminUser) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found.")
                );

        // Prevent admin from disabling their own account
        if (user.getId().equals(adminUser.getId())) {
            throw new BadRequestException("You cannot disable your own account.");
        }

        // If this user is being deactivated, check they are not the last active admin
        if (user.isActive() && user.getRole() == User.UserRole.ADMIN) {
            long activeAdminCount = userRepository.countByRoleAndIsActiveTrue(User.UserRole.ADMIN);
            if (activeAdminCount <= 1) {
                throw new BadRequestException("Cannot disable the last active administrator in the system.");
            }
        }

        user.setActive(!user.isActive());

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {

        return userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found.")
                );
    }

    @Transactional(readOnly = true)
    public User getUserById(UUID userId) {

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found.")
                );
    }
    @Transactional
    public UserDTO connectWallet(
            User user,
            ConnectWalletRequest request
    ) {

        try {

            String recovered = recoverAddress(
                    request.getMessage(),
                    request.getSignature()
            );

            if (!recovered.equalsIgnoreCase(request.getWalletAddress())) {
                throw new BadRequestException("Invalid wallet signature.");
            }

            if (!request.getWalletAddress().equalsIgnoreCase(user.getWalletAddress())
                    && userRepository.existsByWalletAddress(request.getWalletAddress())) {

                throw new BadRequestException(
                        "Wallet already linked to another account."
                );
            }

            user.setWalletAddress(request.getWalletAddress());
            user.setWalletVerified(true);
            user.setWalletConnectedAt(LocalDateTime.now());

            userRepository.save(user);

            return UserDTO.from(user);

        } catch (Exception e) {
            e.printStackTrace();
            throw new BadRequestException(e.getMessage());
        }

    }

    @Transactional
    public UserDTO disconnectWallet(User user) {

        user.setWalletAddress(null);
        user.setWalletVerified(false);
        user.setWalletConnectedAt(null);

        user = userRepository.save(user);

        return UserDTO.from(user);
    }
}