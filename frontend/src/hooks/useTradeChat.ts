'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IMessage, StompSubscription } from '@stomp/stompjs';

import { api } from '@/lib/api';
import { getStompClient } from '@/lib/websocket';

export interface ChatMessage {
    id: string;
    tradeId: string;
    sender: {
        id: string;
        fullName: string;
        email: string;
    };
    message: string;
    messageType: string;
    status: string;
    attachmentUrl: string | null;
    isRead: boolean;
    createdAt: string;
}

export function useTradeChat(tradeId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const subscriptionRef = useRef<StompSubscription | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadMessages() {
            setLoading(true);

            try {
                const response = await api.get<ChatMessage[]>(
                    `/api/trades/${tradeId}/messages`
                );

                if (!cancelled) {
                    setMessages(response.data ?? []);
                }
            } catch (error) {
                console.error('Failed to load chat messages', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadMessages();

        const stomp = getStompClient();

        const subscribe = () => {
            if (subscriptionRef.current) {
                return;
            }

            subscriptionRef.current = stomp.subscribe(
                `/topic/trades/${tradeId}`,
                (message: IMessage) => {
                    const incoming: ChatMessage = JSON.parse(message.body);

                    setMessages((previous) => {
                        const exists = previous.some(
                            (item) => item.id === incoming.id
                        );

                        if (exists) {
                            return previous;
                        }

                        return [...previous, incoming];
                    });
                }
            );
        };

        if (stomp.connected) {
            subscribe();
        } else {
            const interval = setInterval(() => {
                if (stomp.connected) {
                    clearInterval(interval);
                    subscribe();
                }
            }, 200);

            return () => {
                cancelled = true;
                clearInterval(interval);

                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
            };
        }

        return () => {
            cancelled = true;

            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [tradeId]);

    const sendMessage = useCallback(
        async (message: string) => {
            const text = message.trim();

            if (!text) {
                return;
            }

            setSending(true);

            try {
                await api.post(`/api/trades/${tradeId}/messages`, {
                    message: text,
                });
            } catch (error) {
                console.error('Failed to send message', error);
                throw error;
            } finally {
                setSending(false);
            }
        },
        [tradeId]
    );

    return {
        messages,
        loading,
        sending,
        sendMessage,
    };
}