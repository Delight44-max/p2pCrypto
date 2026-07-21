'use client';

import { useMemo, useEffect, useRef } from 'react';
import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import {
    useAppKit,
    useAppKitAccount,
    useAppKitProvider,
    useAppKitNetwork,
    useDisconnect,
} from '@reown/appkit/react';
import { bsc, bscTestnet } from '@reown/appkit/networks';

import { ERC20_ABI } from './erc20-abi';
import {
    ADD_CHAIN_PARAMS,
    BSC_MAINNET_CHAIN_ID,
    BSC_TESTNET_CHAIN_ID,
    getUsdtAddress,
    getUsdtDecimals,
    isSupportedChain,
    type SupportedChainId,
} from './networks';
import { checkGasBalance, handleBlockchainError } from './errors';
import toast from 'react-hot-toast';
import {api} from "@/lib/api";

type EIP1193Provider = {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
};

export type TargetNetwork = 'mainnet' | 'testnet';

// Reown AppKit can hand back chainId as a plain number (97), a decimal
// string ("97"), a hex string ("0x61"), or a CAIP-2 string ("eip155:97")
// depending on version/wallet/connector. A bare Number(chainId) silently
// returns NaN for the CAIP-2 form, which then falls back to null and
// breaks every network-keyed lookup (getEscrowAddress, getUsdtAddress,
// isSupportedNetwork) even when the wallet is genuinely on the right
// chain. This parses all four shapes explicitly.
function parseChainId(raw: unknown): number | null {
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;

    if (typeof raw === 'string') {
        // CAIP-2 format: "eip155:97"
        const caipMatch = raw.match(/:(\d+)$/);
        if (caipMatch) return Number(caipMatch[1]);

        // Decimal or 0x-prefixed hex — Number() handles both natively.
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return null;
}

export function useWalletService() {
    const { open, close } = useAppKit();

    const {
        address,
        isConnected,
        status,
    } = useAppKitAccount();

    const {
        chainId,
        switchNetwork: appKitSwitchNetwork,
    } = useAppKitNetwork();

    const { walletProvider } = useAppKitProvider('eip155') as {
        walletProvider: EIP1193Provider | null;
    };

    const { disconnect } = useDisconnect();

    // Guards against concurrent connect() calls (e.g. Fast Refresh spamming
    // in development) and automatically adds the BSC Mainnet chain to MetaMask
    // before opening the AppKit modal, preventing the "Unrecognized chain ID"
    // error and the related MetaMask content-script crash (e.forEach).
    const connectingRef = useRef(false);

    useEffect(() => {
        console.log('========== APPKIT STATE ==========');
        console.log({
            status,
            isConnected,
            address,
            chainId,
            chainIdType: typeof chainId,
            walletProvider,
        });
        console.log('==================================');
    }, [
        status,
        isConnected,
        address,
        chainId,
        walletProvider,
    ]);

    useEffect(() => {
        if (!isConnected || !address) return;

        const syncWallet = async () => {
            try {
                const message = 'Connect wallet to De-Tech P2P';

                const signature = await signMessage(message);

                await api.post('/api/users/wallet/connect', {
                    walletAddress: address,
                    message,
                    signature,
                });


            } catch (error: any) {
                if (
                    error?.code === 4001 ||
                    error?.message?.toLowerCase().includes('user rejected') ||
                    error?.message?.toLowerCase().includes('user denied') ||
                    error?.message?.toLowerCase().includes('cancelled')
                ) {
                    console.log('User cancelled wallet signature.');
                    return;
                }

                console.error('Failed to sync wallet:', error);

            }
        };

        void syncWallet();
    }, [isConnected, address]);

    const provider = useMemo(() => {
        if (!walletProvider) return null;
        return new BrowserProvider(walletProvider);
    }, [walletProvider]);

    const numericChainId = parseChainId(chainId);

    const usdtAddress = getUsdtAddress(numericChainId);
    const usdtDecimals = getUsdtDecimals(numericChainId);

    async function getSigner() {
        if (!provider) {
            throw new Error('Wallet not connected');
        }

        return provider.getSigner();
    }

    function getUsdtContract(
        signerOrProvider:
            | Awaited<ReturnType<typeof getSigner>>
            | BrowserProvider
    ) {
        if (!usdtAddress) {
            throw new Error(
                'USDT is not configured for the current network.'
            );
        }

        return new Contract(
            usdtAddress,
            ERC20_ABI,
            signerOrProvider
        );
    }

    async function connect() {
        // Guard against concurrent calls (e.g. Fast Refresh, multiple click events)
        if (connectingRef.current) return;
        connectingRef.current = true;

        try {
            // Before opening AppKit, ensure BSC Mainnet exists in MetaMask.
            // Proactively adding the chain here avoids "Unrecognized chain ID"
            // error and MetaMask content-script crash under rapid re-renders.
            const globalEth = (typeof window !== 'undefined')
                ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
                : undefined;

            if (globalEth) {
                // Try to switch first (chain already exists → fast path)
                try {
                    await globalEth.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: ADD_CHAIN_PARAMS[BSC_MAINNET_CHAIN_ID].chainId }],
                    });
                } catch (switchErr) {
                    const code = (switchErr as { code?: number })?.code;
                    // 4902 = chain not found; add it
                    if (code === 4902) {
                        try {
                            await globalEth.request({
                                method: 'wallet_addEthereumChain',
                                params: [ADD_CHAIN_PARAMS[BSC_MAINNET_CHAIN_ID]],
                            });
                        } catch (addErr) {
                            console.error('User rejected adding BSC Mainnet:', addErr);
                        }
                    }
                }
            }

            await open({
                view: 'Connect',
                namespace: 'eip155',
            });
        } catch (error) {
            console.error(error);
            throw new Error('Unable to connect wallet');
        } finally {
            connectingRef.current = false;
        }
    }

    async function disconnectWallet() {
        try {
            await disconnect();

            localStorage.removeItem('wc@2:client:0.3//session');
            localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');

        } catch (err) {
            console.error(err);
        }
    }

    async function signMessage(message: string) {
        const signer = await getSigner();
        return signer.signMessage(message);
    }

    async function getBnbBalance() {
        if (!provider || !address) {
            return {
                raw: '0',
                formatted: '0',
            };
        }

        const balance = await provider.getBalance(address);

        return {
            raw: balance.toString(),
            formatted: formatEther(balance),
        };
    }

    async function sendBNB(
        to: string,
        amount: string
    ) {
        const gasMsg = await checkGasBalance(provider, address, numericChainId, amount);
        if (gasMsg !== null) {
            toast.error(gasMsg);
            throw new Error(gasMsg);
        }

        const signer = await getSigner();

        try {
            const tx = await signer.sendTransaction({
                to,
                value: parseEther(amount),
            });
            await tx.wait();
            return tx.hash;
        } catch (err) {
            handleBlockchainError(err, numericChainId);
            throw err;
        }
    }

    async function getUsdtBalance() {
        if (!provider || !address || !usdtAddress) {
            return {
                raw: '0',
                formatted: '0',
            };
        }

        const contract = getUsdtContract(provider);

        const raw: bigint =
            await contract.balanceOf(address);

        return {
            raw: raw.toString(),
            formatted: formatUnits(
                raw,
                usdtDecimals
            ),
        };
    }

    async function getUsdtAllowance(
        spender: string
    ) {
        if (!provider || !address || !usdtAddress) {
            return {
                raw: '0',
                formatted: '0',
            };
        }

        const contract = getUsdtContract(provider);

        const raw: bigint =
            await contract.allowance(
                address,
                spender
            );

        return {
            raw: raw.toString(),
            formatted: formatUnits(
                raw,
                usdtDecimals
            ),
        };
    }

    async function approveUSDT(
        spender: string,
        amount: string
    ) {
        const gasMsg = await checkGasBalance(provider, address, numericChainId);
        if (gasMsg !== null) {
            toast.error(gasMsg);
            throw new Error(gasMsg);
        }

        const signer = await getSigner();

        const contract = getUsdtContract(signer);

        const value = parseUnits(
            amount,
            usdtDecimals
        );

        try {
            const tx = await contract.approve(
                spender,
                value
            );
            await tx.wait();
            return tx.hash as string;
        } catch (err) {
            handleBlockchainError(err, numericChainId);
            throw err;
        }
    }

    async function sendUSDT(
        to: string,
        amount: string
    ) {
        const gasMsg = await checkGasBalance(provider, address, numericChainId);
        if (gasMsg !== null) {
            toast.error(gasMsg);
            throw new Error(gasMsg);
        }

        const signer = await getSigner();

        const contract = getUsdtContract(signer);

        const value = parseUnits(
            amount,
            usdtDecimals
        );

        try {
            const tx = await contract.transfer(
                to,
                value
            );
            await tx.wait();
            return tx.hash as string;
        } catch (err) {
            handleBlockchainError(err, numericChainId);
            throw err;
        }
    }

    async function switchNetwork(
        target: TargetNetwork
    ) {
        const network =
            target === 'mainnet'
                ? bsc
                : bscTestnet;

        const targetChainId: SupportedChainId =
            target === 'mainnet'
                ? BSC_MAINNET_CHAIN_ID
                : BSC_TESTNET_CHAIN_ID;

        try {
            await appKitSwitchNetwork(network);
            return;
        } catch {}

        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }

        try {
            await walletProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [
                    {
                        chainId:
                        ADD_CHAIN_PARAMS[
                            targetChainId
                            ].chainId,
                    },
                ],
            });
        } catch (switchErr: unknown) {
            const code = (switchErr as { code?: number })
                ?.code;

            if (code === 4902) {
                await walletProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        ADD_CHAIN_PARAMS[
                            targetChainId
                            ],
                    ],
                });
            } else {
                throw switchErr;
            }
        }
    }

    return {
        connected:
            isConnected &&
            !!address,

        walletAddress:
            address ?? null,

        chainId:
        numericChainId,

        isSupportedNetwork:
            isSupportedChain(
                numericChainId
            ),

        provider,

        connect,
        disconnect:
        disconnectWallet,

        signMessage,

        getBnbBalance,
        sendBNB,

        usdtAddress,
        usdtDecimals,

        getUsdtBalance,
        getUsdtAllowance,
        approveUSDT,
        sendUSDT,

        switchNetwork,

        open,
        close,
    };
}