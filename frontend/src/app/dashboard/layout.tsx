'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatNaira } from '@/lib/utils';
import { usePrices } from '@/providers/PriceProvider';
import {
    LayoutDashboard, ArrowLeftRight, Bell, User,
    Shield, LogOut, Menu, X, ChevronRight,
    TrendingUp, TrendingDown, Settings, Users,
    Copy, Check, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';

const userNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/ads', label: 'Buy Ads', icon: Megaphone },
    { href: '/trade', label: 'Trades', icon: ArrowLeftRight },
    { href: '/alerts', label: 'Price Alerts', icon: Bell },
    { href: '/profile', label: 'Profile', icon: User },
];

const adminOnlyNav = [
    { href: '/admin', label: 'Admin Panel', icon: Settings },
    { href: '/admin/users', label: 'Users', icon: Users },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { prices } = usePrices();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/auth/login');
        }
    }, [loading, user, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-dark-500 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = user.role === 'ADMIN';

    const handleLogout = () => {
        logout();
    };

    const handleCopyWallet = async () => {
        if (!user.walletAddress) return;
        try {
            await navigator.clipboard.writeText(user.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard not available — silently ignore
        }
    };

    const findPrice = (coin: string) => prices.find((p) => p.coin === coin && p.currency === 'NGN');
    const bnbNgn = findPrice('BNB');
    const usdtNgn = findPrice('USDT');
    const btcNgn = findPrice('BTC');
    const ethNgn = findPrice('ETH');

    const tickerItems = [
        { label: 'BNB', data: bnbNgn },
        { label: 'USDT', data: usdtNgn },
        { label: 'BTC', data: btcNgn },
        { label: 'ETH', data: ethNgn },
    ].filter((item) => item.data);

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 18) return 'Good Afternoon';
        return 'Good Evening';
    })();

    const shortenAddress = (addr: string) =>
        addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

    return (
        <div className="min-h-screen bg-dark-500 flex">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-30 w-64 sm:w-72 bg-dark-400/90 backdrop-blur-xl border-r border-gray-800/50 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static shadow-2xl lg:shadow-none',
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <div className="flex items-center gap-3 px-4 sm:px-5 h-16 sm:h-20 border-b border-gray-800/50 flex-shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_-2px_rgba(16,185,129,0.6)] flex-shrink-0">
                        <Shield className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-responsive-sm font-bold gradient-text leading-tight">De-Tech P2P</p>
                        <p className="text-[10px] text-gray-500 truncate">Secure Crypto Escrow Platform</p>
                    </div>
                    <button
                        className="ml-auto lg:hidden text-gray-500 hover:text-gray-300 transition-colors"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mx-3 mt-4 mb-2 p-3.5 rounded-2xl glass-card border border-gray-800/60">
                    <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400/30 to-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                                <span className="text-responsive-sm font-bold text-brand-400">
                                    {user.fullName?.[0]?.toUpperCase() ?? 'U'}
                                </span>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-dark-400 animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-responsive-sm font-semibold text-gray-100 truncate">{user.fullName}</p>
                            <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium border',
                                    isAdmin
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                        : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                                )}
                            >
                                {isAdmin ? '🟣 Admin' : '🟢 Trader'}
                            </span>
                        </div>
                    </div>

                    {user.walletAddress && (
                        <button
                            onClick={handleCopyWallet}
                            className="mt-3 w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-dark-500/60 border border-gray-800/50 hover:border-brand-500/30 transition-colors"
                        >
                            <span className="text-[11px] font-mono text-gray-400 truncate">
                                {shortenAddress(user.walletAddress)}
                            </span>
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            )}
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {userNav.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-responsive-sm',
                                    active
                                        ? 'bg-gradient-to-r from-brand-500/15 to-brand-500/5 text-brand-400 border border-brand-500/20 shadow-[0_0_20px_-4px_rgba(16,185,129,0.35)]'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-100 border border-transparent'
                                )}
                            >
                                {active && (
                                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-400" />
                                )}
                                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110', active && 'text-brand-400')} />
                                <span className="truncate">{label}</span>
                                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400" />}
                            </Link>
                        );
                    })}

                    {isAdmin && (
                        <>
                            <div className="pt-4 pb-1.5 px-3.5">
                                <span className="text-[10px] font-semibold tracking-widest text-purple-400/70 uppercase">
                                    Admin
                                </span>
                            </div>
                            {adminOnlyNav.map(({ href, label, icon: Icon }) => {
                                const active = pathname === href || pathname.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-responsive-sm',
                                            active
                                                ? 'bg-gradient-to-r from-purple-500/15 to-purple-500/5 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_-4px_rgba(168,85,247,0.35)]'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100 border border-transparent'
                                        )}
                                    >
                                        {active && (
                                            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-purple-400" />
                                        )}
                                        <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110', active && 'text-purple-400')} />
                                        <span className="truncate">{label}</span>
                                        {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-purple-400" />}
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>

                <div className="px-3 py-3 border-t border-gray-800/30 space-y-2">
                    {bnbNgn && (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-dark-500/60 border border-gray-800/40">
                            <span className="flex items-center gap-2 text-responsive-xs text-gray-400">
                                <span className="text-base">🟡</span> BNB
                            </span>
                            <span className="text-responsive-xs font-mono font-semibold text-brand-400">{formatNaira(bnbNgn.price)}</span>
                        </div>
                    )}
                    {usdtNgn && (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-dark-500/60 border border-gray-800/40">
                            <span className="flex items-center gap-2 text-responsive-xs text-gray-400">
                                <span className="text-base">💵</span> USDT
                            </span>
                            <span className="text-responsive-xs font-mono font-semibold text-brand-400">{formatNaira(usdtNgn.price)}</span>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-800/50 flex-shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl text-responsive-sm font-medium text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 hover:border-red-500/25 transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-dark-400/70 border-b border-gray-800/50 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0 sticky top-0 z-10 backdrop-blur-xl">
                    <button
                        className="lg:hidden text-gray-400 hover:text-gray-200 transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden md:block min-w-0">
                        <p className="text-responsive-sm font-semibold text-white truncate">
                            {greeting}, {user.fullName?.split(' ')[0]}
                        </p>
                        <p className="text-[11px] text-gray-500">Welcome back to De-Tech</p>
                    </div>

                    <div className="hidden lg:flex items-center gap-5 flex-1 justify-center overflow-hidden px-4">
                        {tickerItems.map(({ label, data }) => {
                            if (!data) return null;
                            const positive = Number(data.change24h) >= 0;
                            return (
                                <span key={label} className="flex items-center gap-2 text-responsive-xs whitespace-nowrap">
                                    <span className="text-gray-500 font-medium">{label}</span>
                                    <span className="text-white font-mono">{formatNaira(Number(data.price))}</span>
                                    <span
                                        className={cn(
                                            'flex items-center gap-0.5 font-medium',
                                            positive ? 'text-brand-400' : 'text-red-400'
                                        )}
                                    >
                                        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(Number(data.change24h)).toFixed(2)}%
                                    </span>
                                </span>
                            );
                        })}
                    </div>

                    <div className="ml-auto flex items-center gap-3 sm:gap-4">
                        <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[11px] text-brand-400 font-medium">Live</span>
                        </span>

                        <NotificationBell />

                        <span className="hidden sm:block text-responsive-xs text-gray-500 truncate max-w-40">
                            {user.email}
                        </span>

                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400/30 to-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-responsive-xs font-bold text-brand-400">
                                {user.fullName?.[0]?.toUpperCase() ?? 'U'}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <DashboardShell>{children}</DashboardShell>;
}