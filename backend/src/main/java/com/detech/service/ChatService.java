package com.detech.service;

import com.detech.dto.response.ChatDTO;
import com.detech.entity.ChatMessage;
import com.detech.entity.Trade;
import com.detech.entity.User;
import com.detech.exception.BadRequestException;
import com.detech.exception.ResourceNotFoundException;
import com.detech.repository.ChatMessageRepository;
import com.detech.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final TradeRepository tradeRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ChatDTO sendMessage(UUID tradeId, String message, User sender) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        boolean isParticipant =
                trade.getSeller().getId().equals(sender.getId()) ||
                        (trade.getBuyer() != null &&
                                trade.getBuyer().getId().equals(sender.getId()));

        if (!isParticipant) {
            throw new BadRequestException(
                    "You are not a participant in this trade."
            );
        }

        ChatMessage chatMessage = ChatMessage.builder()
                .trade(trade)
                .sender(sender)
                .message(message.trim())
                .messageType(ChatMessage.MessageType.TEXT)
                .status(ChatMessage.MessageStatus.SENT)
                .read(false)
                .build();

        chatMessage = chatMessageRepository.save(chatMessage);

        ChatDTO chatDTO = ChatDTO.from(chatMessage);

        // Broadcast message to everyone subscribed to this trade
        messagingTemplate.convertAndSend(
                "/topic/trades/" + tradeId,
                chatDTO
        );

        return chatDTO;
    }

    @Transactional(readOnly = true)
    public List<ChatDTO> getTradeMessages(UUID tradeId, User currentUser) {

        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Trade not found.")
                );

        boolean isParticipant =
                trade.getSeller().getId().equals(currentUser.getId()) ||
                        (trade.getBuyer() != null &&
                                trade.getBuyer().getId().equals(currentUser.getId()));

        if (!isParticipant && currentUser.getRole() != User.UserRole.ADMIN) {
            throw new BadRequestException("Access denied.");
        }

        return chatMessageRepository.findByTradeIdOrderByCreatedAtAsc(tradeId)
                .stream()
                .map(ChatDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markMessageAsRead(UUID messageId) {

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Message not found.")
                );

        message.setRead(true);
        message.setStatus(ChatMessage.MessageStatus.READ);

        chatMessageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public long getUnreadMessageCount(UUID tradeId, UUID userId) {

        return chatMessageRepository.countByTradeIdAndReadFalseAndSenderIdNot(
                tradeId,
                userId
        );
    }
}