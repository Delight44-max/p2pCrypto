'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Price } from '@/types';
import { formatNaira, formatUSD } from '@/lib/utils';
import {
    Shield, Zap, Lock, ChevronRight, Star,
    ArrowUpRight, ArrowDownRight, Globe, Users, TrendingUp, Menu, X
} from 'lucide-react';

const PAYMENT_METHODS = [
    { name: 'OPay', logo: '/payment-logos/opay.svg', desc: 'Instant bank transfers via OPay' },
    { name: 'PalmPay', logo: '/payment-logos/palmpay.svg', desc: 'Send & receive via PalmPay wallet' },
    { name: 'Moniepoint', logo: '/payment-logos/moniepoint.svg', desc: 'Business & personal transfers' },
];

/**
 * Smoothly animates a numeric price toward its latest real value and
 * flashes green/red on change, so the UI feels "live" instead of the
 * number silently jumping every 30s when a new fetch lands.
 */
function useAnimatedPrice(target: number | undefined, durationMs = 900) {
    const [displayValue, setDisplayValue] = useState<number | undefined>(target);
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const fromRef = useRef<number | undefined>(target);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (target === undefined) return;
        const from = fromRef.current ?? target;

        if (from === target) {
            setDisplayValue(target);
            return;
        }

        setFlash(target > from ? 'up' : 'down');
        const flashTimeout = setTimeout(() => setFlash(null), 1200);

        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / durationMs, 1);
            // ease-out cubic, so movement settles rather than ticking linearly
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + (target - from) * eased;
            setDisplayValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                fromRef.current = target;
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            clearTimeout(flashTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    return { displayValue, flash };
}

function LivePriceValue({
                            price,
                            fmt,
                            className = '',
                        }: {
    price: number | undefined;
    fmt: (n: number) => string;
    className?: string;
}) {
    const { displayValue, flash } = useAnimatedPrice(price);

    if (displayValue === undefined) {
        return <span className={className}>---</span>;
    }

    return (
        <span
            className={`${className} transition-colors duration-500 rounded px-1 -mx-1 ${
                flash === 'up' ? 'bg-brand-500/20 text-brand-300' : flash === 'down' ? 'bg-red-500/20 text-red-300' : ''
            }`}
        >
            {fmt(displayValue)}
        </span>
    );
}

export default function LandingPage() {
    const [prices, setPrices] = useState<Price[]>([]);
    const [pulse, setPulse] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchPrices = () => {
            api.get<Price[]>('/api/prices')
                .then(r => {
                    if (Array.isArray(r.data)) {
                        setPrices(r.data);
                        // brief "live" heartbeat pulse each time fresh data lands,
                        // independent of whether any individual price moved
                        setPulse(true);
                        setTimeout(() => setPulse(false), 600);
                    }
                })
                .catch(() => {});
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, []);

    const getBNBNGN = () => prices?.find(p => p.coin === 'BNB' && p.currency === 'NGN');
    const getUSDTNGN = () => prices?.find(p => p.coin === 'USDT' && p.currency === 'NGN');
    const getBNBUSD = () => prices?.find(p => p.coin === 'BNB' && p.currency === 'USD');

    return (
        <div className="min-h-screen bg-dark-500 overflow-x-hidden">

            {/* ── Price Ticker ── */}
            <div className="bg-dark-400/80 border-b border-gray-800/50 py-2 overflow-hidden">
                <div className="ticker-wrap">
                    <div className="ticker-track">
                        {[...Array(3)].map((_, i) => (
                            <span key={i} className="inline-flex items-center gap-6 px-4">
              {[
                  { label: 'BNB/NGN', data: getBNBNGN(), fmt: formatNaira },
                  { label: 'USDT/NGN', data: getUSDTNGN(), fmt: formatNaira },
                  { label: 'BNB/USD', data: getBNBUSD(), fmt: formatUSD },
              ].map(({ label, data, fmt }) => (
                  <span key={label} className="inline-flex items-center gap-2 text-responsive-xs whitespace-nowrap">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white font-mono font-medium">
                    <LivePriceValue price={data?.price} fmt={fmt} />
                  </span>
                      {data ? (
                          <span className={`flex items-center gap-0.5 ${data.change24h >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                      {data.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(data.change24h).toFixed(2)}%
                    </span>
                      ) : null}
                      <span className="text-gray-700 mx-4">•</span>
                </span>
              ))}
            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 glass border-b border-gray-800/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center glow-green flex-shrink-0">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-responsive-base font-bold gradient-text">De-tech P2P</span>
                        </div>

                        {/* Desktop nav links */}
                        <div className="hidden md:flex items-center gap-6">
                            {['How it Works', 'Features', 'Tokens', 'FAQ'].map(item => (
                                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                   className="text-responsive-sm text-gray-400 hover:text-brand-400 transition-colors">
                                    {item}
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Mobile hamburger */}
                            <button
                                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="hidden sm:flex items-center gap-3">
                                <Link href="/auth/login"
                                      className="text-responsive-sm text-gray-300 hover:text-white transition-colors px-3 py-2">
                                    Sign In
                                </Link>
                                <Link href="/auth/register"
                                      className="btn-primary text-responsive-sm px-4 py-2">
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-gray-800/30 py-4 space-y-2">
                            {['How it Works', 'Features', 'Tokens', 'FAQ'].map(item => (
                                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                   onClick={() => setMobileMenuOpen(false)}
                                   className="block px-3 py-2.5 text-responsive-sm text-gray-400 hover:text-brand-400 hover:bg-white/5 rounded-xl transition-colors">
                                    {item}
                                </a>
                            ))}
                            <div className="pt-2 px-3 flex flex-col gap-2">
                                <Link href="/auth/login"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="w-full text-center px-4 py-2.5 text-responsive-sm text-gray-300 border border-gray-700/50 rounded-xl hover:bg-white/5 transition-colors">
                                    Sign In
                                </Link>
                                <Link href="/auth/register"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="w-full text-center btn-primary px-4 py-2.5 text-responsive-sm">
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative pt-16 sm:pt-20 pb-24 sm:pb-32 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-hero-pattern opacity-60" />
                <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 text-responsive-xs text-brand-400">
                        <span className={`w-2 h-2 bg-brand-400 rounded-full ${pulse ? 'animate-ping' : 'animate-pulse-slow'}`} />
                        Smart Contract Secured Escrow
                    </div>

                    <h1 className="text-responsive-5xl font-extrabold mb-6 leading-tight">
                        Trade Crypto
                        <span className="gradient-text block">Safely & Instantly</span>
                    </h1>

                    <p className="text-responsive-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Buy and sell <strong className="text-white">USDT</strong> and <strong className="text-white">BNB</strong> with
                        confidence. Smart contract escrow protects every trade. Pay with{' '}
                        <strong className="text-white">Opay, PalmPay, or Moniepoint</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link href="/auth/register"
                              className="btn-primary text-responsive-base px-8 py-4 flex items-center gap-2 w-full sm:w-auto justify-center">
                            Start Trading
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <a href="#how-it-works"
                           className="btn-secondary text-responsive-base px-8 py-4 flex items-center gap-2 w-full sm:w-auto justify-center">
                            How It Works
                        </a>
                    </div>

                    {/* Live Price Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
                        {[
                            { label: 'BNB/NGN', data: getBNBNGN(), fmt: formatNaira, icon: '🟡' },
                            { label: 'USDT/NGN', data: getUSDTNGN(), fmt: formatNaira, icon: '💵' },
                            { label: 'BNB/USD', data: getBNBUSD(), fmt: formatUSD, icon: '🟡' },
                        ].map(({ label, data, fmt, icon }) => (
                            <div key={label} className="glass-card rounded-2xl p-4 text-left relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-responsive-xs text-gray-400 flex items-center gap-1.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                                        </span>
                                        {label}
                                    </span>
                                    <span className="text-lg">{icon}</span>
                                </div>
                                <p className="text-responsive-xl font-bold font-mono text-white">
                                    <LivePriceValue price={data?.price} fmt={fmt} />
                                </p>
                                {data ? (
                                    <span className={`text-responsive-xs flex items-center gap-1 mt-1 ${data.change24h >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                    {data.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(data.change24h).toFixed(2)}% 24h
                  </span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section className="py-12 border-y border-gray-800/30">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
                        {[
                            { label: 'Secured Trades', value: '1,000+', icon: <Shield className="w-5 h-5" /> },
                            { label: 'Active Users', value: '500+', icon: <Users className="w-5 h-5" /> },
                            { label: 'Volume Traded', value: '$250K+', icon: <TrendingUp className="w-5 h-5" /> },
                            { label: 'Countries', value: '1', icon: <Globe className="w-5 h-5" /> },
                        ].map(({ label, value, icon }) => (
                            <div key={label} className="space-y-2">
                                <div className="flex justify-center text-brand-400">{icon}</div>
                                <p className="text-responsive-2xl font-bold gradient-text">{value}</p>
                                <p className="text-responsive-xs text-gray-500">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section id="how-it-works" className="py-16 sm:py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-responsive-4xl font-bold mb-4">How It <span className="gradient-text">Works</span></h2>
                        <p className="text-responsive-base text-gray-400 max-w-xl mx-auto">
                            Three simple steps to complete a secure P2P trade
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                        {[
                            {
                                step: '01', icon: <Lock className="w-6 h-6" />,
                                title: 'Seller Deposits to Escrow',
                                desc: 'Seller locks crypto in our smart contract. Funds are secured on-chain — no one can touch them until the trade completes.',
                                color: 'text-brand-400',
                            },
                            {
                                step: '02', icon: <Zap className="w-6 h-6" />,
                                title: 'Buyer Sends Fiat Payment',
                                desc: 'Buyer transfers naira via Opay, PalmPay, or Moniepoint directly to the seller\'s account.',
                                color: 'text-cyan-400',
                            },
                            {
                                step: '03', icon: <Shield className="w-6 h-6" />,
                                title: 'Seller Releases Crypto',
                                desc: 'After confirming payment, seller releases the crypto. Smart contract sends it directly to buyer\'s wallet instantly.',
                                color: 'text-purple-400',
                            },
                        ].map(({ step, icon, title, desc, color }) => (
                            <div key={step} className="relative glass-card rounded-2xl p-6">
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-dark-500 border border-gray-700 rounded-lg flex items-center justify-center text-responsive-xs font-bold text-gray-500">
                                    {step}
                                </div>
                                <div className={`${color} mb-4 mt-2`}>{icon}</div>
                                <h3 className="text-responsive-base font-semibold text-white mb-2">{title}</h3>
                                <p className="text-responsive-sm text-gray-400 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-16 sm:py-24 px-4 bg-dark-400/30">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-responsive-4xl font-bold mb-4">Why <span className="gradient-text">De-tech P2P</span></h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { icon: '🔐', title: 'Smart Contract Escrow', desc: 'Funds locked in audited smart contract. No human holds your crypto.' },
                            { icon: '⚡', title: 'Instant Settlement', desc: 'Once payment confirmed, crypto releases instantly to your wallet.' },
                            { icon: '💬', title: 'Built-in Trade Chat', desc: 'Communicate directly with your trading partner in our secure chat.' },
                            { icon: '🛡️', title: 'Dispute Protection', desc: 'Admin mediates any disputed trades. Your funds are always safe.' },
                            { icon: '📊', title: 'Live Price Alerts', desc: 'Set alerts for BNB/NGN, USDT/NGN and get notified instantly.' },
                            { icon: '🇳🇬', title: 'Nigerian Payment Methods', desc: 'Opay, PalmPay, and Moniepoint. Pay the way you already do.' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="glass-card rounded-2xl p-5 hover:border-brand-500/20 transition-all duration-300">
                                <span className="text-2xl mb-3 block">{icon}</span>
                                <h3 className="text-responsive-base font-semibold text-white mb-2">{title}</h3>
                                <p className="text-responsive-sm text-gray-400 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Tokens ── */}
            <section id="tokens" className="py-16 sm:py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-responsive-4xl font-bold mb-4">Supported <span className="gradient-text">Tokens</span></h2>
                        <p className="text-responsive-base text-gray-400">Trade the most popular BEP-20 tokens</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                        {[
                            { icon: '💵', name: 'USDT', full: 'Tether USD', desc: 'Stable, reliable, pegged to US Dollar. Perfect for everyday P2P trading.', color: '#26a17b', data: getUSDTNGN(), fmt: formatNaira },
                            { icon: '🟡', name: 'BNB', full: 'Binance Coin', desc: 'Native token of Binance Smart Chain. Fast transactions, low gas fees.', color: '#f3ba2f', data: getBNBNGN(), fmt: formatNaira },
                        ].map(({ icon, name, full, desc, color, data, fmt }) => (
                            <div key={name} className="glass-card rounded-2xl p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-4xl">{icon}</span>
                                    <div>
                                        <h3 className="text-responsive-xl font-bold text-white">{name}</h3>
                                        <p className="text-responsive-xs text-gray-400">{full}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-responsive-base font-mono font-bold text-white">
                                            <LivePriceValue price={data?.price} fmt={fmt} />
                                        </p>
                                        {data ? (
                                            <span className={`text-responsive-xs ${data.change24h >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                        {data.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(2)}%
                      </span>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-responsive-sm text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Payment Methods ── */}
            <section className="py-12 sm:py-16 px-4 bg-dark-400/30">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-responsive-3xl font-bold mb-3">Accepted <span className="gradient-text">Payment Methods</span></h2>
                    <p className="text-responsive-sm text-gray-400 mb-10">Pay with your favourite Nigerian fintech apps</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        {PAYMENT_METHODS.map(({ name, logo, desc }) => (
                            <div key={name} className="glass-card rounded-2xl p-5">
                                <div className="w-full h-12 flex items-center justify-center mb-3">
                                    <Image
                                        src={logo}
                                        alt={`${name} logo`}
                                        width={120}
                                        height={40}
                                        className="h-10 w-auto object-contain"
                                    />
                                </div>
                                <h3 className="text-responsive-base font-bold text-white mb-1">{name}</h3>
                                <p className="text-responsive-xs text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section id="faq" className="py-16 sm:py-24 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-responsive-4xl font-bold mb-4">Frequently Asked <span className="gradient-text">Questions</span></h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { q: 'Is my crypto safe?', a: 'Yes. Funds are locked in a smart contract on BSC. No one — not even De-tech P2P — can access your funds without completing the trade correctly.' },
                            { q: 'What is the fee?', a: 'We charge 1% per completed trade. This fee is automatically deducted from the trade amount by the smart contract.' },
                            { q: 'What if there is a dispute?', a: 'Open a dispute from the trade page. Our admin team will review both sides and resolve it fairly, typically within 24 hours.' },
                            { q: 'Which wallets are supported?', a: 'Any BSC-compatible wallet: MetaMask, Trust Wallet, Binance Web3 Wallet, or any WalletConnect-compatible wallet.' },
                            { q: 'How long does a trade take?', a: 'Typically 5-15 minutes. The buyer sends fiat, seller confirms receipt, and releases crypto. Settlement is instant on-chain.' },
                        ].map(({ q, a }) => (
                            <details key={q} className="glass-card rounded-xl group">
                                <summary className="flex items-center justify-between p-5 cursor-pointer text-responsive-sm font-medium text-white select-none">
                                    {q}
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <p className="px-5 pb-5 text-responsive-sm text-gray-400 leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-16 sm:py-24 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-16 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-radial from-brand-500/10 to-transparent" />
                        <div className="relative">
                            <h2 className="text-responsive-4xl font-bold mb-4">
                                Ready to Trade <span className="gradient-text">Safely?</span>
                            </h2>
                            <p className="text-responsive-base text-gray-400 mb-8">
                                Join hundreds of Nigerians already trading crypto securely on De-tech P2P.
                            </p>
                            <Link href="/auth/register"
                                  className="btn-primary text-responsive-base px-10 py-4 inline-flex items-center gap-2">
                                Create Free Account
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-gray-800/50 py-8 sm:py-10 px-4 safe-pb">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-responsive-sm font-bold gradient-text">De-tech P2P</span>
                    </div>
                    <p className="text-responsive-xs text-gray-500 text-center">
                        Smart contract secured P2P crypto trading on Binance Smart Chain.
                    </p>
                    <div className="flex items-center gap-4 text-responsive-xs text-gray-500">
                        <Link href="/auth/login" className="hover:text-brand-400 transition-colors">Sign In</Link>
                        <Link href="/auth/register" className="hover:text-brand-400 transition-colors">Register</Link>
                    </div>
                </div>
                <p className="text-center text-responsive-xs text-gray-700 mt-4 sm:mt-6">
                    © 2025 De-tech P2P. Trade responsibly. Crypto involves risk.
                </p>
            </footer>
        </div>
    );
}