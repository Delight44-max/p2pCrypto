// components/NotificationBell.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationBell() {
    const { notifications, unreadCount, clear } = useNotifications();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative p-2 rounded-xl hover:bg-dark-500/50 transition-colors"
            >
                <Bell className="w-5 h-5 text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 glass-card rounded-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
                        <h4 className="text-responsive-sm font-semibold text-white">Notifications</h4>
                        {notifications.length > 0 && (
                            <button onClick={clear} className="text-responsive-xs text-gray-500 hover:text-gray-300">
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-responsive-xs text-gray-500 text-center py-8">
                                No notifications yet
                            </p>
                        ) : (
                            notifications.map((n, i) => (
                                <Link
                                    key={i}
                                    href={`/trade/${n.tradeId}`}
                                    onClick={() => setOpen(false)}
                                    className="block px-4 py-3 hover:bg-dark-400/40 border-b border-gray-800/30 last:border-0"
                                >
                                    <p className="text-responsive-xs text-gray-300">{n.message}</p>
                                    <p className="text-[10px] text-gray-600 mt-1">
                                        {n.tradeReference} · {new Date(n.receivedAt).toLocaleTimeString()}
                                    </p>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}