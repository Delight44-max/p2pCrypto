package com.detech.repository;

import com.detech.entity.Trade;
import com.detech.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TradeRepository extends JpaRepository<Trade, UUID> {


    // =====================================================
    // Find by IDs
    // =====================================================

    Optional<Trade> findByOnChainTradeId(Long onChainTradeId);

    Optional<Trade> findByTradeReference(String tradeReference);



    // =====================================================
    // User Trades
    // =====================================================

    List<Trade> findBySellerOrBuyerOrderByCreatedAtDesc(
            User seller,
            User buyer
    );


    List<Trade> findBySellerOrderByCreatedAtDesc(
            User seller
    );


    List<Trade> findByBuyerOrderByCreatedAtDesc(
            User buyer
    );


    Page<Trade> findBySeller(
            User seller,
            Pageable pageable
    );


    Page<Trade> findByBuyer(
            User buyer,
            Pageable pageable
    );


    @Query("""
            SELECT t
            FROM Trade t
            WHERE t.seller = :user
               OR t.buyer = :user
            ORDER BY t.createdAt DESC
            """)
    Page<Trade> findAllUserTrades(
            @Param("user") User user,
            Pageable pageable
    );
    @Query(value = "SELECT nextval('onchain_trade_id_seq')", nativeQuery = true)
    Long getNextOnChainTradeId();


    List<Trade> findAllByOrderByCreatedAtDesc();




    // =====================================================
    // Status
    // =====================================================

    List<Trade> findByStatusOrderByCreatedAtDesc(
            Trade.TradeStatus status
    );


    Page<Trade> findByStatus(
            Trade.TradeStatus status,
            Pageable pageable
    );


    Page<Trade> findBySellerAndStatus(
            User seller,
            Trade.TradeStatus status,
            Pageable pageable
    );


    Page<Trade> findByBuyerAndStatus(
            User buyer,
            Trade.TradeStatus status,
            Pageable pageable
    );




    // =====================================================
    // Payment
    // =====================================================

    Page<Trade> findByPaymentMethod(
            Trade.PaymentMethod paymentMethod,
            Pageable pageable
    );




    // =====================================================
    // Token
    // =====================================================

    Page<Trade> findByTokenType(
            Trade.TokenType tokenType,
            Pageable pageable
    );




    // =====================================================
    // Expired Trades
    // =====================================================

    List<Trade> findByExpiresAtBeforeAndStatus(
            LocalDateTime now,
            Trade.TradeStatus status
    );




    // =====================================================
    // Statistics
    // =====================================================

    long countByStatus(
            Trade.TradeStatus status
    );


    long countBySellerOrBuyer(
            User seller,
            User buyer
    );


    long countBySeller(
            User seller
    );


    long countByBuyer(
            User buyer
    );


    long countBySellerAndStatus(
            User seller,
            Trade.TradeStatus status
    );


    long countByBuyerAndStatus(
            User buyer,
            Trade.TradeStatus status
    );




    // =====================================================
    // Recent Trades
    // =====================================================

    List<Trade> findTop10ByOrderByCreatedAtDesc();

}