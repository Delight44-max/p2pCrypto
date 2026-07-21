package com.detech.repository;

import com.detech.entity.TradeAd;
import com.detech.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TradeAdRepository extends JpaRepository<TradeAd, UUID> {

    List<TradeAd> findByStatusOrderByCreatedAtDesc(TradeAd.AdStatus status);

    List<TradeAd> findByBuyerOrderByCreatedAtDesc(User buyer);
}