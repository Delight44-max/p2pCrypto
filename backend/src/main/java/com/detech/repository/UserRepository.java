package com.detech.repository;

import com.detech.entity.User;
import com.detech.entity.User.KycStatus;
import com.detech.entity.User.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // =====================================================
    // Authentication
    // =====================================================

    Optional<User> findByEmail(String email);

    Optional<User> findByWalletAddress(String walletAddress);

    Optional<User> findByPhone(String phone);

    Optional<User> findByIdAndIsActiveTrue(UUID id);

    // =====================================================
    // Exists
    // =====================================================

    boolean existsByEmail(String email);

    boolean existsByWalletAddress(String walletAddress);

    boolean existsByPhone(String phone);

    boolean existsByRole(UserRole role);

    // =====================================================
    // User Status
    // =====================================================

    List<User> findByIsActiveTrue();

    List<User> findByIsActiveFalse();

    Page<User> findByRole(UserRole role, Pageable pageable);

    Page<User> findByKycStatus(KycStatus status, Pageable pageable);

    // =====================================================
    // Search
    // =====================================================

    Page<User> findByFullNameContainingIgnoreCase(
            String keyword,
            Pageable pageable
    );

    Page<User> findByEmailContainingIgnoreCase(
            String keyword,
            Pageable pageable
    );

    // =====================================================
    // Statistics
    // =====================================================

    long countByRole(UserRole role);

    long countByKycStatus(KycStatus status);

    long countByRoleAndIsActiveTrue(UserRole role);

    long countByIsActiveTrue();

    long countByIsEmailVerifiedTrue();
}