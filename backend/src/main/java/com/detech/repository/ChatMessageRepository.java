package com.detech.repository;

import com.detech.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByTradeIdOrderByCreatedAtAsc(UUID tradeId);

    long countByTradeIdAndReadFalseAndSenderIdNot(UUID tradeId, UUID senderId);

}