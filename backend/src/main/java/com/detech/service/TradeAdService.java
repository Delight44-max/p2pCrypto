package com.detech.service;

import com.detech.dto.request.CreateAdRequest;
import com.detech.dto.response.AdDTO;
import com.detech.entity.TradeAd;
import com.detech.entity.User;
import com.detech.exception.BadRequestException;
import com.detech.exception.ResourceNotFoundException;
import com.detech.repository.TradeAdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeAdService {

    private final TradeAdRepository tradeAdRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public AdDTO createAd(CreateAdRequest request, User buyer) {

        String walletAddress = (request.getWalletAddress() != null && !request.getWalletAddress().isBlank())
                ? request.getWalletAddress()
                : buyer.getWalletAddress();

        if (walletAddress == null || walletAddress.isBlank()) {
            throw new BadRequestException(
                    "No wallet address provided and none saved on your profile."
            );
        }

        BigDecimal feeAmount = request.getAmount()
                .multiply(BigDecimal.valueOf(0.01))
                .setScale(8, RoundingMode.HALF_UP);

        BigDecimal netAmount = request.getAmount().subtract(feeAmount);

        TradeAd ad = TradeAd.builder()
                .buyer(buyer)
                .tokenType(request.getTokenType())
                .amount(request.getAmount())
                .feeAmount(feeAmount)
                .netAmount(netAmount)
                .fiatAmount(request.getFiatAmount())
                .fiatCurrency(request.getFiatCurrency() != null ? request.getFiatCurrency() : "NGN")
                .pricePerUnit(request.getPricePerUnit())
                .paymentMethod(request.getPaymentMethod())
                .walletAddress(walletAddress)
                .note(request.getNote())
                .status(TradeAd.AdStatus.OPEN)
                .build();

        ad = tradeAdRepository.save(ad);

        log.info("Ad {} posted by {}", ad.getId(), buyer.getEmail());

        return AdDTO.from(ad);
    }

    @Transactional(readOnly = true)
    public List<AdDTO> getOpenAds() {
        return tradeAdRepository.findByStatusOrderByCreatedAtDesc(TradeAd.AdStatus.OPEN)
                .stream()
                .map(AdDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdDTO> getMyAds(User buyer) {
        return tradeAdRepository.findByBuyerOrderByCreatedAtDesc(buyer)
                .stream()
                .map(AdDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdDTO cancelAd(UUID adId, User currentUser) {

        TradeAd ad = tradeAdRepository.findById(adId)
                .orElseThrow(() -> new ResourceNotFoundException("Ad not found."));

        if (!ad.getBuyer().getId().equals(currentUser.getId())) {
            throw new BadRequestException("You can only cancel your own ads.");
        }

        if (ad.getStatus() == TradeAd.AdStatus.FULFILLED) {
            throw new BadRequestException("This ad already resulted in a trade and cannot be cancelled.");
        }

        ad.setStatus(TradeAd.AdStatus.CLOSED);
        ad = tradeAdRepository.save(ad);

        log.info("Ad {} cancelled by {}", ad.getId(), currentUser.getEmail());

        return AdDTO.from(ad);
    }

    @Transactional
    public AdDTO expressInterest(UUID adId, User seller) {

        TradeAd ad = tradeAdRepository.findById(adId)
                .orElseThrow(() -> new ResourceNotFoundException("Ad not found."));

        if (ad.getBuyer().getId().equals(seller.getId())) {
            throw new BadRequestException("You cannot express interest in your own ad.");
        }

        if (ad.getStatus() != TradeAd.AdStatus.OPEN) {
            throw new BadRequestException("This ad is no longer open.");
        }

        ad.setStatus(TradeAd.AdStatus.INTERESTED);
        ad.setInterestedSeller(seller);
        ad = tradeAdRepository.save(ad);

        messagingTemplate.convertAndSendToUser(
                ad.getBuyer().getEmail(),
                "/queue/notifications",
                Map.of(
                        "type", "AD_INTEREST",
                        "adId", ad.getId(),
                        "message", seller.getFullName() + " is interested in your ad. Check the ad to create the trade."
                )
        );

        log.info("Seller {} expressed interest in ad {}", seller.getEmail(), ad.getId());

        return AdDTO.from(ad);
    }

    /**
     * Called by TradeService after a Trade is successfully created from an ad,
     * so the ad shows as FULFILLED instead of lingering as INTERESTED.
     */
    @Transactional
    public void markFulfilled(UUID adId, UUID tradeId) {
        TradeAd ad = tradeAdRepository.findById(adId)
                .orElseThrow(() -> new ResourceNotFoundException("Ad not found."));

        ad.setStatus(TradeAd.AdStatus.FULFILLED);
        ad.setResultingTradeId(tradeId);
        tradeAdRepository.save(ad);
    }

    @Transactional(readOnly = true)
    public AdDTO getAd(UUID adId) {
        TradeAd ad = tradeAdRepository.findById(adId)
                .orElseThrow(() -> new ResourceNotFoundException("Ad not found."));
        return AdDTO.from(ad);
    }
}