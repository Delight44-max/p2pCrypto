'use client';

import { useEffect, useRef, useState } from 'react';
import type { IMessage, StompSubscription } from '@stomp/stompjs';

import { getStompClient } from '@/lib/websocket';

export interface TradeNotification {
    type:
        | 'TRADE_CREATED'
        | 'TRADE_STATUS_UPDATED'
        | 'TRADE_DISPUTED'
        | 'DISPUTE_RESOLVED';
    tradeId: string;
    tradeReference: string;
    status?: string;
    message: string;
    receivedAt: number;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<TradeNotification[]>([]);

    const subscriptionRef = useRef<StompSubscription | null>(null);

    useEffect(() => {
        const stomp = getStompClient();

        const subscribe = () => {
            if (subscriptionRef.current) {
                return;
            }

            subscriptionRef.current = stomp.subscribe(
                '/user/queue/notifications',
                (message: IMessage) => {
                    try {
                        const payload = JSON.parse(message.body);

                        setNotifications((previous) =>
                            [
                                {
                                    ...payload,
                                    receivedAt: Date.now(),
                                },
                                ...previous,
                            ].slice(0, 50)
                        );
                    } catch (error) {
                        console.error('Failed to parse notification', error);
                    }
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
                clearInterval(interval);

                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
            };
        }

        return () => {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, []);

    const unreadCount = notifications.length;

    const clear = () => {
        setNotifications([]);
    };

    const removeNotification = (tradeId: string) => {
        setNotifications((previous) =>
            previous.filter((notification) => notification.tradeId !== tradeId)
        );
    };

    return {
        notifications,
        unreadCount,
        clear,
        removeNotification,
    };
}