package com.detech.dto.response;

import com.detech.entity.ChatMessage;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatDTO(

        UUID id,

        UUID tradeId,

        UserSummary sender,

        String message,

        String messageType,

        String status,

        String attachmentUrl,

        boolean isRead,

        LocalDateTime createdAt

) {

    public static ChatDTO from(ChatMessage chat) {

        return new ChatDTO(

                chat.getId(),

                chat.getTrade().getId(),

                UserSummary.from(chat.getSender()),

                chat.getMessage(),

                chat.getMessageType().name(),

                chat.getStatus().name(),

                chat.getAttachmentUrl(),

                chat.isRead(),

                chat.getCreatedAt()

        );

    }

}