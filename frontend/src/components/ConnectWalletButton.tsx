'use client';

import { Wallet, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

function shortenAddress(addr: string) {
    return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function ConnectWalletButton() {
    const { connected, connect, disconnect, open } = useWallet();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // A saved walletAddress on the user's profile is NOT the same as an
    // active AppKit session. Someone can have an address on file (typed
    // manually, or connected in a past session) without a live signer
    // right now — on-chain actions (fund/release escrow) still require
    // actually connecting, so we show both states distinctly rather than
    // pretending a saved address means "connected".
    const hasSavedAddress = !!user?.walletAddress;

    async function handleConnect() {
        try {
            setLoading(true);
            await connect();
        } catch (error) {
            console.error('Wallet connection failed:', error);
            toast.error('Failed to connect wallet. Please unlock your wallet and try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDisconnect() {
        try {
            setLoading(true);
            await disconnect();
            toast.success('Wallet disconnected');
        } catch (error) {
            console.error('Wallet disconnect failed:', error);
            toast.error('Failed to disconnect wallet.');
        } finally {
            setLoading(false);
        }
    }

    if (connected) {
        return (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                    type="button"
                    onClick={handleConnect}
                    disabled={loading}
                    className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap px-4 py-2.5"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Switch Wallet
                </button>

                <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap px-4 py-2.5"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Disconnect
                </button>
            </div>
        );
    }

    // Not connected right now, but there IS a saved address on the profile
    // (e.g. typed in manually, or from a past session). Show that clearly
    // instead of just a bare "Connect Wallet" button with no context.
    if (hasSavedAddress) {
        return (
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <div className="flex items-center gap-2 text-responsive-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    <span>
                        Saved: <span className="font-mono text-gray-400">{shortenAddress(user!.walletAddress!)}</span>
                        {' '}(not connected)
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleConnect}
                    disabled={loading}
                    className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 px-4 py-2.5"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {loading ? 'Connecting...' : 'Connect to Transact'}
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 px-4 py-2.5"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
    );
}