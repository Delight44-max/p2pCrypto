package com.detech.repository;

import com.detech.entity.PriceAlert;
import com.detech.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

    // =====================================================
    // User Alerts
    // =====================================================

    List<PriceAlert> findByUserOrderByCreatedAtDesc(User user);

    List<PriceAlert> findByUserId(UUID userId);

    Page<PriceAlert> findByUser(
            User user,
            Pageable pageable
    );

    // =====================================================
    // Active Alerts
    // =====================================================

    List<PriceAlert> findByIsActiveTrueAndIsTriggeredFalse();

    List<PriceAlert> findByUserAndIsActiveTrue(
            User user
    );

    // =====================================================
    // Triggered Alerts
    // =====================================================

    List<PriceAlert> findByUserAndIsTriggeredTrue(
            User user
    );

    // =====================================================
    // Coin
    // =====================================================

    List<PriceAlert> findByCoin(
            PriceAlert.Coin coin
    );

    // =====================================================
    // Condition
    // =====================================================

    List<PriceAlert> findByCondition(
            PriceAlert.AlertCondition condition
    );

    // =====================================================
    // Statistics
    // =====================================================

    long countByUser(User user);

    long countByIsActiveTrue();

    long countByIsTriggeredTrue();

}