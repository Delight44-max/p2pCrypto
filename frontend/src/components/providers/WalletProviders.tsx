'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { WalletProvider } from '@/context/WalletContext';

export function WalletProviders({
                                    children,
                                }: {
    children: ReactNode;
}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function initWallet() {
            await import('@/lib/wallet/appkit');
            setReady(true);
        }

        initWallet();
    }, []);

    if (!ready) {
        return (
            <WalletProvider>
                {children}
            </WalletProvider>
        );
    }

    return (
        <WalletProvider>
            {children}
        </WalletProvider>
    );
}