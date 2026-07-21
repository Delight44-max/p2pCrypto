'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { useWalletService } from '@/lib/wallet';


type WalletContextType = ReturnType<typeof useWalletService>;

const WalletContext = createContext<WalletContextType | undefined>(undefined);



const SSR_STUB_WALLET: WalletContextType = {
    connected: false,
    walletAddress: null,
    chainId: null,
    isSupportedNetwork: false,
    provider: null,

    connect: async () => {
        throw new Error('Wallet is initializing. Try again.');
    },

    disconnect: async () => {},

    signMessage: async () => {
        throw new Error('Wallet is initializing. Try again.');
    },

    getBnbBalance: async () => ({
        raw: '0',
        formatted: '0',
    }),

    sendBNB: async () => {
        throw new Error('Wallet is initializing. Try again.');
    },

    usdtAddress: null,
    usdtDecimals: 18,

    getUsdtBalance: async () => ({
        raw: '0',
        formatted: '0',
    }),

    getUsdtAllowance: async () => ({
        raw: '0',
        formatted: '0',
    }),

    approveUSDT: async () => {
        throw new Error('Wallet is initializing. Try again.');
    },

    sendUSDT: async () => {
        throw new Error('Wallet is initializing. Try again.');
    },

    switchNetwork: async () => {},

    open: async () => {},

    close: async () => {},
};



function WalletProviderInner({
                                 children,
                             }: {
    children: ReactNode;
}) {

    const wallet = useWalletService();

    return (
        <WalletContext.Provider value={wallet}>
            {children}
        </WalletContext.Provider>
    );
}



export function WalletProvider({
                                   children,
                               }: {
    children: ReactNode;
}) {

    const [ready, setReady] = useState(false);


    useEffect(() => {

        let active = true;


        async function initializeWallet() {

            try {

                // wait until AppKit module is loaded
                await import('@/lib/wallet/appkit');

                if (active) {
                    setReady(true);
                }

            } catch (error) {

                console.error(
                    'Wallet initialization failed:',
                    error
                );

            }

        }


        initializeWallet();


        return () => {
            active = false;
        };

    }, []);



    if (!ready) {

        return (
            <WalletContext.Provider value={SSR_STUB_WALLET}>
                {children}
            </WalletContext.Provider>
        );

    }



    return (
        <WalletProviderInner>
            {children}
        </WalletProviderInner>
    );
}



export function useWallet(): WalletContextType {

    const context = useContext(WalletContext);


    if (!context) {
        throw new Error(
            'useWallet must be used within WalletProvider'
        );
    }


    return context;
}