package com.detech.config;

import com.detech.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {

                String token = authHeader.substring(BEARER_PREFIX.length()).trim();

                try {

                    String username = jwtUtil.extractUsername(token);

                    if (username != null) {

                        UserDetails userDetails =
                                userDetailsService.loadUserByUsername(username);

                        if (jwtUtil.isTokenValid(token, userDetails)) {

                            Principal principal = () -> username;

                            accessor.setUser(principal);

                            log.debug("Authenticated STOMP user: {}", username);
                        }
                    }

                } catch (Exception e) {
                    log.warn("STOMP authentication failed: {}", e.getMessage());
                }
            }
        }

        return message;
    }
}