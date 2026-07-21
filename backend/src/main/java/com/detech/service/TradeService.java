package com.detech.service;

import com.detech.dto.response.DashboardDTO;
import com.detech.entity.Trade;
import com.detech.entity.User;
import com.detech.dto.request.CreateTradeRequest;
import com.detech.dto.response.TradeDTO;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.detech.exception.BadRequestException;
import com.detech.exception.ResourceNotFoundException;
import com.detech.repository.PriceAlertRepository;
import com.detech.repository.TradeRepository;
import com.detech.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeService {

    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public TradeDTO createTrade(CreateTradeRequest request, User seller) {
        Long onChainTradeId = tradeRepository.getNextOnChainTradeId();

        User buyer = userRepository.findByWalletAddress(request.getBuyerWalletAddress())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Buyer wallet not found. The buyer must register first."
                        ));

        if (buyer.getId().equals(seller.getId())) {
            throw new BadRequestException("You cannot create a trade with yourself.");
        }

        BigDecimal feeAmount = request.getAmount()
                .multiply(BigDecimal.valueOf(0.01))
                .setScale(8, RoundingMode.HALF_UP);

        Trade trade = Trade.builder()
                .onChainTradeId(onChainTradeId)
                .seller(seller)
                .buyer(buyer)
                .tokenType(request.getTokenType())
                .amount(request.getAmount())
                .feeAmount(feeAmount)
                .fiatAmount(request.getFiatAmount())
                .fiatCurrency(request.getFiatCurrency())
                .pricePerUnit(request.getPricePerUnit())
                .paymentMethod(request.getPaymentMethod())
                .status(Trade.TradeStatus.PENDING)
                .tradeReference(UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        trade = tradeRepository.save(trade);

        messagingTemplate.convertAndSendToUser(
                buyer.getEmail(),
                "/queue/notifications",
                Map.of(
                        "type", "TRADE_CREATED",
                        "tradeId", trade.getId(),
                        "tradeReference", trade.getTradeReference(),
                        "message", "You have received a new trade request from " + seller.getFullName()
                )
        );

        log.info(
                "Trade {} created successfully between {} and {}",
                trade.getTradeReference(),
                seller.getEmail(),
                buyer.getEmail()
        );

        return TradeDTO.from(trade);
    }

    @Transactional
    public TradeDTO updateTradeStatus(
            UUID tradeId,
            Trade.TradeStatus newStatus,
            String txHash,
            User currentUser
    ) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        validateStatusTransition(trade, newStatus, currentUser);

        trade.setStatus(newStatus);

        if (txHash != null && !txHash.isBlank()) {
            trade.setTxHash(txHash);
        }

        switch (newStatus) {

            case COMPLETED -> {
                trade.setCompletedAt(LocalDateTime.now());

                updateUserStats(trade.getSeller(), true);
                updateUserStats(trade.getBuyer(), true);
            }

            case CANCELLED -> trade.setCancelledAt(LocalDateTime.now());

            case RESOLVED -> trade.setResolvedAt(LocalDateTime.now());

            default -> {
                // No timestamp update required
            }
        }

        trade = tradeRepository.save(trade);

        User otherParty = currentUser.getId().equals(trade.getSeller().getId())
                ? trade.getBuyer()
                : trade.getSeller();

        if (otherParty != null) {

            messagingTemplate.convertAndSendToUser(
                    otherParty.getEmail(),
                    "/queue/notifications",
                    Map.of(
                            "type", "TRADE_STATUS_UPDATED",
                            "tradeId", trade.getId(),
                            "tradeReference", trade.getTradeReference(),
                            "status", trade.getStatus().name(),
                            "message", "Trade status changed to " + trade.getStatus().name()
                    )
            );
        }

        log.info(
                "Trade {} status changed to {}",
                trade.getTradeReference(),
                trade.getStatus()
        );

        return TradeDTO.from(trade);
    }

    @Transactional
    public TradeDTO openDispute(
            UUID tradeId,
            String reason,
            User currentUser
    ) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        boolean participant =
                trade.getSeller().getId().equals(currentUser.getId()) ||
                        (trade.getBuyer() != null &&
                                trade.getBuyer().getId().equals(currentUser.getId()));

        if (!participant) {
            throw new BadRequestException("You are not a participant in this trade.");
        }

        if (trade.getStatus() != Trade.TradeStatus.FUNDED &&
                trade.getStatus() != Trade.TradeStatus.PAYMENT_SENT) {

            throw new BadRequestException(
                    "Only FUNDED or PAYMENT_SENT trades can be disputed."
            );
        }

        trade.setStatus(Trade.TradeStatus.DISPUTED);
        trade.setDisputeReason(reason);

        trade = tradeRepository.save(trade);

        User otherParty = currentUser.getId().equals(trade.getSeller().getId())
                ? trade.getBuyer()
                : trade.getSeller();

        if (otherParty != null) {
            messagingTemplate.convertAndSendToUser(
                    otherParty.getEmail(),
                    "/queue/notifications",
                    Map.of(
                            "type", "TRADE_DISPUTED",
                            "tradeId", trade.getId(),
                            "tradeReference", trade.getTradeReference(),
                            "message", "A dispute has been opened for this trade."
                    )
            );
        }

        log.info(
                "Trade {} disputed by {}",
                trade.getTradeReference(),
                currentUser.getEmail()
        );

        return TradeDTO.from(trade);
    }

    @Transactional
    public TradeDTO resolveDispute(
            UUID tradeId,
            UUID winnerId,
            User admin
    ) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        if (trade.getStatus() != Trade.TradeStatus.DISPUTED) {
            throw new BadRequestException("Trade is not under dispute.");
        }

        User winner = userRepository.findById(winnerId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Winning user not found.")
                );

        if (!winner.getId().equals(trade.getSeller().getId()) &&
                (trade.getBuyer() == null ||
                        !winner.getId().equals(trade.getBuyer().getId()))) {

            throw new BadRequestException(
                    "Winner must be either the buyer or the seller."
            );
        }

        trade.setStatus(Trade.TradeStatus.RESOLVED);
        trade.setResolvedBy(admin.getEmail());
        trade.setResolvedAt(LocalDateTime.now());

        trade = tradeRepository.save(trade);

        messagingTemplate.convertAndSendToUser(
                trade.getSeller().getEmail(),
                "/queue/notifications",
                Map.of(
                        "type", "DISPUTE_RESOLVED",
                        "tradeId", trade.getId(),
                        "tradeReference", trade.getTradeReference(),
                        "winner", winner.getFullName(),
                        "message", "The dispute has been resolved."
                )
        );

        if (trade.getBuyer() != null) {
            messagingTemplate.convertAndSendToUser(
                    trade.getBuyer().getEmail(),
                    "/queue/notifications",
                    Map.of(
                            "type", "DISPUTE_RESOLVED",
                            "tradeId", trade.getId(),
                            "tradeReference", trade.getTradeReference(),
                            "winner", winner.getFullName(),
                            "message", "The dispute has been resolved."
                    )
            );
        }

        log.info(
                "Trade {} dispute resolved by {}. Winner: {}",
                trade.getTradeReference(),
                admin.getEmail(),
                winner.getEmail()
        );

        return TradeDTO.from(trade);
    }

    @Transactional(readOnly = true)
    public List<TradeDTO> getUserTrades(User user) {

        Pageable pageable = PageRequest.of(
                0,
                100
        );

        return tradeRepository.findAllUserTrades(
                        user,
                        pageable
                )
                .getContent()
                .stream()
                .map(TradeDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TradeDTO getTradeById(UUID tradeId, User currentUser) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        boolean isParticipant =
                trade.getSeller().getId().equals(currentUser.getId()) ||
                        (trade.getBuyer() != null &&
                                trade.getBuyer().getId().equals(currentUser.getId()));

        if (!isParticipant &&
                currentUser.getRole() != User.UserRole.ADMIN) {

            throw new BadRequestException(
                    "You are not authorized to view this trade."
            );
        }

        return TradeDTO.from(trade);
    }

    @Transactional(readOnly = true)
    public List<TradeDTO> getAllTrades(String status) {

        List<Trade> trades;

        if (status == null || status.isBlank()) {

            trades = tradeRepository.findAllByOrderByCreatedAtDesc();

        } else {

            Trade.TradeStatus tradeStatus;

            try {
                tradeStatus = Trade.TradeStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid trade status.");
            }

            trades = tradeRepository.findByStatusOrderByCreatedAtDesc(tradeStatus);
        }

        return trades.stream()
                .map(TradeDTO::from)
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public DashboardDTO getDashboardStats() {

        long pendingTrades = tradeRepository.countByStatus(Trade.TradeStatus.PENDING);
        long fundedTrades = tradeRepository.countByStatus(Trade.TradeStatus.FUNDED);
        long paymentSentTrades = tradeRepository.countByStatus(Trade.TradeStatus.PAYMENT_SENT);
        long completedTrades = tradeRepository.countByStatus(Trade.TradeStatus.COMPLETED);
        long disputedTrades = tradeRepository.countByStatus(Trade.TradeStatus.DISPUTED);
        long cancelledTrades = tradeRepository.countByStatus(Trade.TradeStatus.CANCELLED);
        long resolvedTrades = tradeRepository.countByStatus(Trade.TradeStatus.RESOLVED);

        long activeTrades = pendingTrades + fundedTrades + paymentSentTrades;

        long verifiedUsers = userRepository.countByKycStatus(User.KycStatus.VERIFIED);
        long pendingKyc = userRepository.countByKycStatus(User.KycStatus.PENDING);

        return new DashboardDTO(
                tradeRepository.count(),   // totalTrades
                activeTrades,
                completedTrades,
                disputedTrades,
                cancelledTrades,
                userRepository.count(),    // totalUsers
                verifiedUsers,
                pendingKyc,
                priceAlertRepository.count()  // totalPriceAlerts
        );
    }

    private void validateStatusTransition(
            Trade trade,
            Trade.TradeStatus newStatus,
            User currentUser
    ) {

        boolean isSeller = trade.getSeller().getId().equals(currentUser.getId());

        boolean isBuyer =
                trade.getBuyer() != null &&
                        trade.getBuyer().getId().equals(currentUser.getId());

        switch (newStatus) {

            case FUNDED -> {

                if (!isSeller) {
                    throw new BadRequestException(
                            "Only the seller can fund this trade."
                    );
                }

                if (trade.getStatus() != Trade.TradeStatus.PENDING) {
                    throw new BadRequestException(
                            "Only pending trades can be funded."
                    );
                }
            }

            case PAYMENT_SENT -> {

                if (!isBuyer) {
                    throw new BadRequestException(
                            "Only the buyer can mark payment as sent."
                    );
                }

                if (trade.getStatus() != Trade.TradeStatus.FUNDED) {
                    throw new BadRequestException(
                            "Trade must be funded first."
                    );
                }
            }

            case COMPLETED -> {

                if (!isSeller) {
                    throw new BadRequestException(
                            "Only the seller can release escrow."
                    );
                }

                if (trade.getStatus() != Trade.TradeStatus.PAYMENT_SENT) {
                    throw new BadRequestException(
                            "Buyer must mark payment as sent first."
                    );
                }
            }

            case CANCELLED -> {

                if (!isSeller && !isBuyer) {
                    throw new BadRequestException(
                            "You are not a participant in this trade."
                    );
                }

                if (trade.getStatus() == Trade.TradeStatus.COMPLETED ||
                        trade.getStatus() == Trade.TradeStatus.CANCELLED ||
                        trade.getStatus() == Trade.TradeStatus.RESOLVED) {

                    throw new BadRequestException(
                            "This trade has already been finalized."
                    );
                }
            }

            default -> {
                // Valid transition
            }
        }
    }

    private void updateUserStats(User user, boolean completed) {

        user.setTotalTrades(user.getTotalTrades() + 1);

        if (completed) {
            user.setCompletedTrades(user.getCompletedTrades() + 1);
        }

        double rating = 5.0;

        if (user.getCompletedTrades() > 0) {
            rating = Math.min(
                    5.0,
                    4.5 + (user.getCompletedTrades() * 0.02)
            );
        }

        user.setRating(BigDecimal.valueOf(rating));

        userRepository.save(user);
    }
}
