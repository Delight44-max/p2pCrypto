'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adService } from '@/services/ad.service';
import { priceService } from '@/services/price.service';
import { Price } from '@/types';
import { formatNaira, formatCrypto } from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import { ArrowLeft, Info, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const TOKENS: {
    value: 'USDT' | 'BNB';
    label: string;
    icon: string;
    desc: string;
}[] = [
    {
        value: 'USDT',
        label: 'USDT',
        icon: '💵',
        desc: 'Tether USD (BEP-20)',
    },
    {
        value: 'BNB',
        label: 'BNB',
        icon: '🟡',
        desc: 'Binance Coin',
    },
];

const PAYMENT_METHODS: {
    value: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
    label: string;
    emoji: string;
}[] = [
    {
        value: 'OPAY',
        label: 'OPay',
        emoji: '',
    },
    {
        value: 'PALMPAY',
        label: 'PalmPay',
        emoji: '',
    },
    {
        value: 'MONIEPOINT',
        label: 'Moniepoint',
        emoji: '',
    },
];

export default function NewAdPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [prices, setPrices] = useState<Price[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        tokenType: 'USDT' as 'USDT' | 'BNB',
        amount: '',
        paymentMethod: 'OPAY' as 'OPAY' | 'PALMPAY' | 'MONIEPOINT',
        walletAddress: '',
        note: '',
    });

    useEffect(() => {
        priceService
            .getPrices()
            .then((res) => {
                if (res) {
                    setPrices(res.data ?? []);
                }
            })
            .catch(console.error);
    }, []);

    const currentPrice = prices.find(
        p => p.coin === form.tokenType && p.currency === 'NGN'
    );

    const rawAmount = parseFloat(form.amount) || 0;
    const fiatAmount = currentPrice && rawAmount > 0
        ? rawAmount * currentPrice.price
        : 0;
    const feeAmount = rawAmount * 0.01;
    const netAmount = rawAmount - feeAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.amount || rawAmount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        if (!currentPrice) {
            toast.error('Unable to fetch current market price.');
            return;
        }

        setLoading(true);

        try {
            const res = await adService.createAd({
                tokenType: form.tokenType,
                amount: rawAmount,
                fiatAmount,
                fiatCurrency: 'NGN',
                pricePerUnit: currentPrice.price,
                paymentMethod: form.paymentMethod,
                walletAddress: form.walletAddress.trim() || undefined,
                note: form.note.trim() || undefined,
            });

            if (!res.success || !res.data) {
                toast.error(res.message || 'Failed to post ad');
                return;
            }

            toast.success('Buy ad posted successfully! Sellers can now see and respond to your ad.');
            router.push('/ads');
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to post ad'
            );
        } finally {
            setLoading(false);
        }
    };

    const savedWallet = user?.walletAddress ?? '';

    return (
        <DashboardShell>
            <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-responsive-2xl font-bold text-white">I Want to Buy Crypto</h1>
                    <p className="text-responsive-sm text-gray-400 mt-0.5">
                        Post your intent — sellers will see your ad and respond
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="glass-card rounded-2xl p-4 border border-brand-500/20 bg-brand-500/5">
                <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                    <p className="text-responsive-xs text-gray-400 leading-relaxed">
                        As the <strong className="text-white">buyer</strong>, you post your intent to buy crypto.
                        Sellers will see your ad and can express interest.
                        When a seller is interested, you'll be notified and they can create a trade with you using the
                        wallet address you provide. A <strong className="text-brand-400">1% platform fee</strong> applies.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

                {/* Token Selection */}
                <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
                    <h2 className="text-responsive-base font-semibold text-white">Select Token</h2>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {TOKENS.map(({ value, label, icon, desc }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, tokenType: value }))}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                                    form.tokenType === value
                                        ? 'border-brand-500 bg-brand-500/10'
                                        : 'border-gray-800/50 bg-dark-400/30 hover:border-gray-700'
                                }`}
                            >
                                <span className="text-2xl flex-shrink-0">{icon}</span>
                                <div className="min-w-0">
                                    <p className="text-responsive-sm font-bold text-white">{label}</p>
                                    <p className="text-responsive-xs text-gray-400 truncate">{desc}</p>
                                    {currentPrice && value === form.tokenType && (
                                        <p className="text-responsive-xs text-brand-400 font-mono mt-0.5">
                                            {formatNaira(currentPrice.price)}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                    <h2 className="text-responsive-base font-semibold text-white">Amount</h2>

                    <div>
                        <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">
                            Amount ({form.tokenType}) — How much do you want to buy?
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.000001"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder="0.00"
                            className="input-dark px-4 py-3 text-responsive-sm font-mono"
                        />
                        {fiatAmount > 0 && (
                            <p className="text-responsive-xs text-brand-400 mt-1.5 font-mono">
                                ≈ {formatNaira(fiatAmount)} at current rate
                            </p>
                        )}
                    </div>
                </div>

                {/* Wallet Address */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                    <h2 className="text-responsive-base font-semibold text-white">Your Wallet Address</h2>
                    <p className="text-responsive-xs text-gray-400">
                        Where should the seller send the crypto? If left blank, your saved wallet address will be used.
                    </p>
                    <div>
                        <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">
                            BSC Wallet Address (optional)
                        </label>
                        <div className="relative">
                            <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={form.walletAddress}
                                onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                                placeholder={savedWallet ? `${savedWallet.slice(0, 6)}...${savedWallet.slice(-4)} (your saved wallet)` : '0x... (optional)'}
                                className="input-dark pl-11 pr-4 py-3 text-responsive-sm font-mono"
                            />
                        </div>
                        {savedWallet && (
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, walletAddress: savedWallet }))}
                                className="text-responsive-xs text-brand-400 hover:text-brand-300 mt-1.5 transition-colors"
                            >
                                Use my saved wallet address
                            </button>
                        )}
                    </div>
                </div>

                {/* Payment Method */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                    <h2 className="text-responsive-base font-semibold text-white">Payment Method</h2>
                    <p className="text-responsive-xs text-gray-400">
                        How will you pay the seller? (via bank transfer / mobile money)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        {PAYMENT_METHODS.map(({ value, label, emoji }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, paymentMethod: value }))}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                                    form.paymentMethod === value
                                        ? 'border-brand-500 bg-brand-500/10'
                                        : 'border-gray-800/50 bg-dark-400/30 hover:border-gray-700'
                                }`}
                            >
                                <span className="text-xl">{emoji}</span>
                                <span className="text-responsive-sm font-medium text-white">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Note (optional) */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                    <h2 className="text-responsive-base font-semibold text-white">Note (optional)</h2>
                    <textarea
                        value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Any special instructions for sellers..."
                        rows={3}
                        className="input-dark px-4 py-3 text-responsive-sm resize-none w-full"
                    />
                </div>

                {/* Summary */}
                {rawAmount > 0 && (
                    <div className="glass-card rounded-2xl p-5 space-y-3">
                        <h2 className="text-responsive-base font-semibold text-white">Ad Summary</h2>
                        <div className="space-y-2">
                            {[
                                { label: 'You want to buy', value: `${rawAmount.toFixed(6)} ${form.tokenType}` },
                                { label: 'At price', value: currentPrice ? formatNaira(currentPrice.price) : '---' },
                                { label: 'Approx. fiat value', value: fiatAmount > 0 ? formatNaira(fiatAmount) : '---' },
                                { label: 'Platform fee (1%)', value: `${formatCrypto(feeAmount)} ${form.tokenType}` },
                                { label: 'You will receive (~net)', value: `${formatCrypto(netAmount)} ${form.tokenType}` },
                                { label: 'Payment via', value: PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.label || '' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center justify-between text-responsive-sm">
                                    <span className="text-gray-400">{label}</span>
                                    <span className="text-white font-mono text-right ml-4">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 sm:py-4 text-responsive-base"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Posting Ad...
                        </span>
                    ) : 'Post Buy Ad — I Want to Buy Crypto'}
                </button>
            </form>
        </div>
        </DashboardShell>
    );
}
