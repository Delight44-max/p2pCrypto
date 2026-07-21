'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { bsc, bscTestnet } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    throw new Error('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
}

const metadataUrl =
    typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000';

// IMPORTANT: this must be a module-scope `let`, NOT a globalThis property.
// globalThis.__APPKIT_INITIALIZED__ does NOT reliably survive Turbopack Fast
// Refresh — under HMR, Turbopack can re-execute this module in a way that
// re-runs createAppKit() while a stale AppKit instance is still mounted,
// producing duplicate wallet/session state. Wallet reads that depend on
// this instance (chainId, address, connected) then intermittently return
// stale or incorrect values — including chainId, which breaks every
// network-keyed lookup (getEscrowAddress, getUsdtAddress) even when the
// logic in those functions is completely correct. A plain module-scope
// `let` closes over the module's own execution and does not have this
// failure mode.
let appKitInitialized = false;

if (!appKitInitialized) {
    console.log('🔥 Initializing Reown AppKit...');

    createAppKit({
        adapters: [new EthersAdapter()],
        projectId,

        metadata: {
            name: 'De-Tech P2P',
            description: 'Secure Crypto Escrow Platform',
            url: metadataUrl,
            icons: [`${metadataUrl}/logo.png`],
        },

        networks: [bsc, bscTestnet],
        defaultNetwork: bsc,

        features: {
            analytics: false,
        },

        themeMode: 'dark',

        enableWalletGuide: true,

        enableReconnect: false,
    });

    appKitInitialized = true;

    console.log('✅ AppKit initialized');
} else {
    console.log('♻️ AppKit already initialized');
}
