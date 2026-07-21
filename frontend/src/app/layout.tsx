import type { Metadata } from 'next';
import './globals.css';

import { AuthProvider } from '@/lib/auth-context';
import { WalletProviders } from '@/components/providers/WalletProviders';
import { PriceProvider } from '@/providers/PriceProvider';

import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'De-tech P2P — Crypto Escrow',
    description:
        "Trade USDT and BNB securely with smart contract escrow. De-tech P2P — Nigeria's trusted crypto trading platform.",
    keywords: ['crypto', 'P2P', 'escrow', 'USDT', 'BNB', 'BSC', 'Nigeria', 'trading'],
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        <AuthProvider>
            <WalletProviders>
                <PriceProvider>
                        {children}

                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: '#1a1a2e',
                                color: '#f1f5f9',
                                border: '1px solid rgba(34,197,94,0.2)',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#22c55e',
                                    secondary: '#0d1117',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#0d1117',
                                },
                            },
                        }}
                    />
                </PriceProvider>
            </WalletProviders>

        </AuthProvider>
        </body>
        </html>
    );
}