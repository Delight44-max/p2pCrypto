export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;

export type SupportedChainId =
    | typeof BSC_MAINNET_CHAIN_ID
    | typeof BSC_TESTNET_CHAIN_ID;

export function isSupportedChain(chainId: number | null | undefined): chainId is SupportedChainId {
    return chainId === BSC_MAINNET_CHAIN_ID || chainId === BSC_TESTNET_CHAIN_ID;
}

// Verified: https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955
// Decimals confirmed as 18 (unlike Ethereum USDT, which uses 6).
const USDT_MAINNET_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// Our own MockUSDT, deployed to BSC Testnet alongside P2PEscrow.
// See p2pContracts/contracts/MockUSDT.sol — has an open faucet() for test funds.
const USDT_TESTNET_ADDRESS =
    process.env.NEXT_PUBLIC_USDT_ADDRESS ||
    '0x71F49C1b07D670Bb77f084e17F0633F54B117202';

export const USDT_ADDRESSES: Record<SupportedChainId, string> = {
    [BSC_MAINNET_CHAIN_ID]: USDT_MAINNET_ADDRESS,
    [BSC_TESTNET_CHAIN_ID]: USDT_TESTNET_ADDRESS,
};

// Both real BSC USDT and our MockUSDT use 18 decimals.
export const USDT_DECIMALS: Record<SupportedChainId, number> = {
    [BSC_MAINNET_CHAIN_ID]: 18,
    [BSC_TESTNET_CHAIN_ID]: 18,
};

// P2PEscrow contract addresses.
const ESCROW_TESTNET_ADDRESS =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    '0x438F82c04405A0a0CD97393A3c2121A5f435F1D9';

const ESCROW_MAINNET_ADDRESS =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET ||
    '0x71F49C1b07D670Bb77f084e17F0633F54B117202'; // Deployed mainnet address

export const ESCROW_ADDRESSES: Partial<Record<SupportedChainId, string>> = {
    [BSC_TESTNET_CHAIN_ID]: ESCROW_TESTNET_ADDRESS,
    [BSC_MAINNET_CHAIN_ID]: ESCROW_MAINNET_ADDRESS,
};

// Used for the wallet_addEthereumChain fallback when a wallet doesn't
// already have BSC configured (very common for first-time MetaMask users).
export const ADD_CHAIN_PARAMS: Record<SupportedChainId, {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
}> = {
    [BSC_MAINNET_CHAIN_ID]: {
        chainId: '0x38', // 56
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org'],
        blockExplorerUrls: ['https://bscscan.com'],
    },
    [BSC_TESTNET_CHAIN_ID]: {
        chainId: '0x61', // 97
        chainName: 'BNB Smart Chain Testnet',
        nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
        blockExplorerUrls: ['https://testnet.bscscan.com'],
    },
};

export function getUsdtAddress(chainId: number | null | undefined): string | null {
    if (!isSupportedChain(chainId)) return null;
    return USDT_ADDRESSES[chainId];
}

export function getUsdtDecimals(chainId: number | null | undefined): number {
    if (!isSupportedChain(chainId)) return 18;
    return USDT_DECIMALS[chainId];
}

export function getEscrowAddress(chainId: number | null | undefined): string | null {
    if (!isSupportedChain(chainId)) return null;
    return ESCROW_ADDRESSES[chainId] ?? null;
}