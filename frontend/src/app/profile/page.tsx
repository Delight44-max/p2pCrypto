'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { shortenAddress, formatDate } from '@/lib/utils';
import { User, Wallet, CreditCard, Save, CheckCircle, Eye, EyeOff, Lock, Trash2, RefreshCw } from 'lucide-react';
import { DashboardShell } from '@/app/dashboard/layout';
import toast from 'react-hot-toast';
import { AuthUser } from '@/types';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import { useWallet } from '@/context/WalletContext';

type ProfileFormState = {
    fullName: string;
    phone: string;
    walletAddress: string;
    opayAccount: string;
    opayName: string;
    palmpayAccount: string;
    palmpayName: string;
    moniepointAccount: string;
    moniepointName: string;
};

type PaymentProviderKey = 'opay' | 'palmpay' | 'moniepoint';

const BSC_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function clearWalletLocalStorage() {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            const lower = key.toLowerCase();
            if (
                lower.includes('walletconnect') ||
                lower.includes('wagmi') ||
                lower.includes('appkit') ||
                lower.includes('w3m') ||
                lower.includes('wallet')
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (err) {
        console.error('Failed to clear wallet local storage:', err);
    }
}

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const { walletAddress, connected, disconnect } = useWallet() as {
        walletAddress: string | null;
        connected: boolean;
        disconnect?: () => void | Promise<void>;
    };
    const savedWallet = user?.walletAddress ?? null;

    // FIX: this used to gate on savedWallet matching, which is circular on a
    // brand new connection (nothing saved yet => isCurrentWallet always false
    // => auto-fill effect never ran). "Connected" now only depends on the
    // live wallet state, not on whether the DB already has a match.
    const isConnectedToSavedWallet =
        connected &&
        !!walletAddress &&
        !!savedWallet &&
        walletAddress.toLowerCase() === savedWallet.toLowerCase();

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [updatingWallet, setUpdatingWallet] = useState(false);
    const [deletingWallet, setDeletingWallet] = useState(false);

    const [profile, setProfile] = useState<ProfileFormState>({
        fullName: '',
        phone: '',
        walletAddress: '',
        opayAccount: '',
        opayName: '',
        palmpayAccount: '',
        palmpayName: '',
        moniepointAccount: '',
        moniepointName: '',
    });

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Prevents re-triggering auto-save for the same address repeatedly.
    const autoSavedAddressRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setProfile((prev) => ({
            ...prev,
            fullName: user.fullName ?? '',
            phone: user.phone ?? '',
            walletAddress: user.walletAddress ?? '',
            opayAccount: user.opayAccount ?? '',
            opayName: user.opayName ?? '',
            palmpayAccount: user.palmpayAccount ?? '',
            palmpayName: user.palmpayName ?? '',
            moniepointAccount: user.moniepointAccount ?? '',
            moniepointName: user.moniepointName ?? '',
        }));

        api
            .get<AuthUser>('/api/users/profile')
            .then((res) => {
                if (!res.success || !res.data) return;
                const p = res.data;
                setProfile((prev) => ({
                    ...prev,
                    fullName: p.fullName ?? '',
                    phone: p.phone ?? '',
                    walletAddress: p.walletAddress ?? '',
                    opayAccount: p.opayAccount ?? '',
                    opayName: p.opayName ?? '',
                    palmpayAccount: p.palmpayAccount ?? '',
                    palmpayName: p.palmpayName ?? '',
                    moniepointAccount: p.moniepointAccount ?? '',
                    moniepointName: p.moniepointName ?? '',
                }));
            })
            .catch((err) => {
                console.error(err);
                toast.error('Failed to load profile');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // FIX: fires on ANY connected wallet address (new or matching saved one),
    // fills the form field immediately, and — if it's a NEW address — also
    // auto-saves it to the backend so "connected" state reflects reality
    // without waiting on the Save Profile / Update Wallet buttons.
    useEffect(() => {
        if (!connected || !walletAddress) return;

        // Always reflect the live connected address in the form immediately.
        setProfile((prev) => {
            if (prev.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
                return prev;
            }
            return { ...prev, walletAddress };
        });

        // If it matches what's already saved, nothing more to do.
        if (savedWallet && walletAddress.toLowerCase() === savedWallet.toLowerCase()) {
            return;
        }

        // Avoid re-firing the save for the same address repeatedly.
        if (autoSavedAddressRef.current === walletAddress.toLowerCase()) {
            return;
        }

        autoSavedAddressRef.current = walletAddress.toLowerCase();

        (async () => {
            try {
                const res = await api.put<Partial<AuthUser>>('/api/users/profile', {
                    walletAddress,
                });

                if (!res.success || !res.data) {
                    toast.error(res.message || 'Failed to save connected wallet');
                    return;
                }

                const updatedUser = res.data;
                updateUser(updatedUser as AuthUser);
                setProfile((prev) => ({
                    ...prev,
                    walletAddress: (updatedUser as AuthUser).walletAddress ?? walletAddress,
                }));

                toast.success('Wallet connected and saved!');
            } catch (err: any) {
                const message = err.response?.data?.message || err.message || 'Failed to save connected wallet';
                toast.error(message);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, walletAddress, savedWallet]);

    const handleUpdateWallet = async () => {
        const trimmed = profile.walletAddress.trim();

        if (trimmed !== '' && !BSC_ADDRESS_REGEX.test(trimmed)) {
            toast.error('Please enter a valid BSC wallet address, or clear the field to remove it.');
            return;
        }

        setUpdatingWallet(true);

        try {
            const res = await api.put<Partial<AuthUser>>('/api/users/profile', {
                walletAddress: trimmed,
            });

            if (!res.success) {
                toast.error(res.message || 'Failed to update wallet');
                return;
            }

            const updatedUser = res.data ?? { ...user, walletAddress: trimmed || null };
            updateUser(updatedUser as AuthUser);

            setProfile((prev) => ({
                ...prev,
                walletAddress: (updatedUser as AuthUser).walletAddress ?? '',
            }));

            if (trimmed === '') {
                clearWalletLocalStorage();
                autoSavedAddressRef.current = null;
                toast.success('Wallet removed.');
            } else {
                toast.success('Wallet updated!');
            }
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Failed to update wallet';
            toast.error(message);
        } finally {
            setUpdatingWallet(false);
        }
    };

    const handleDeleteWallet = async () => {
        setDeletingWallet(true);

        try {
            const res = await api.delete<Partial<AuthUser>>('/api/users/wallet');

            if (!res.success) {
                toast.error(res.message || 'Failed to delete wallet');
                return;
            }

            try {
                await disconnect?.();
            } catch (err) {
                console.error('Wallet disconnect error:', err);
            }

            clearWalletLocalStorage();
            autoSavedAddressRef.current = null;

            updateUser({ ...(user as AuthUser), walletAddress: null, walletVerified: false } as AuthUser);
            setProfile((prev) => ({ ...prev, walletAddress: '' }));

            toast.success('Wallet deleted.');
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Failed to delete wallet';
            toast.error(message);
        } finally {
            setDeletingWallet(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (profile.walletAddress.trim() !== '' && !BSC_ADDRESS_REGEX.test(profile.walletAddress)) {
            toast.error('Please enter a valid BSC wallet address.');
            return;
        }

        setSaving(true);

        try {
            const res = await api.put<Partial<AuthUser>>('/api/users/profile', profile);

            if (!res.success || !res.data) {
                toast.error(res.message || 'Failed to update profile');
                return;
            }

            const updatedUser = res.data;

            updateUser(updatedUser);
            setProfile(prev => ({
                ...prev,
                fullName: updatedUser.fullName ?? prev.fullName,
                phone: updatedUser.phone ?? prev.phone,
                walletAddress: updatedUser.walletAddress ?? '',
                opayAccount: updatedUser.opayAccount ?? prev.opayAccount,
                opayName: updatedUser.opayName ?? prev.opayName,
                palmpayAccount: updatedUser.palmpayAccount ?? prev.palmpayAccount,
                palmpayName: updatedUser.palmpayName ?? prev.palmpayName,
                moniepointAccount: updatedUser.moniepointAccount ?? prev.moniepointAccount,
                moniepointName: updatedUser.moniepointName ?? prev.moniepointName,
            }));

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            toast.success('Profile updated!');
        } catch (err: any) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Failed to save profile';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setPwSaving(true);
        try {
            await api.patch<null>('/api/users/password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            toast.success('Password changed successfully!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            const message = err.response?.data?.message || err.message || 'Failed to change password';
            toast.error(message);
        } finally {
            setPwSaving(false);
        }
    };

    const paymentProviders: { name: string; key: PaymentProviderKey }[] = [
        { name: 'OPay', key: 'opay' },
        { name: 'PalmPay', key: 'palmpay' },
        { name: 'Moniepoint', key: 'moniepoint' },
    ];

    return (
        <DashboardShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-responsive-2xl font-bold text-white">Profile</h1>
                    <p className="text-responsive-sm text-gray-400 mt-0.5">Manage your account and payment details</p>
                </div>

                <div className="glass-card rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="text-responsive-2xl font-bold text-brand-400">
                                {user?.fullName?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-responsive-lg font-bold text-white truncate">{user?.fullName}</h2>
                            <p className="text-responsive-sm text-gray-400 truncate">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-responsive-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                                    {user?.role === 'ADMIN' ? 'Admin' : 'Trader'}
                                </span>
                                {user?.walletAddress && (
                                    <span className="text-responsive-xs text-gray-500 font-mono">
                                        {shortenAddress(user.walletAddress)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-800/30">
                            <User className="w-4 h-4 text-brand-400" />
                            <h2 className="text-responsive-base font-semibold text-white">Personal Info</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-responsive-sm text-gray-400 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={profile.fullName}
                                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                                    className="input-dark px-4 py-2.5 text-responsive-sm w-full"
                                    placeholder="Your full name"
                                />
                            </div>
                            <div>
                                <label className="block text-responsive-sm text-gray-400 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                                    className="input-dark px-4 py-2.5 text-responsive-sm w-full"
                                    placeholder="+234 800 000 0000"
                                />
                            </div>
                        </div>
                    </div>

                <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-800/30">
                        <Wallet className="w-4 h-4 text-brand-400" />
                        <h2 className="text-responsive-base font-semibold text-white">BSC Wallet</h2>
                    </div>

                        <div className="space-y-1">
                            <p className="text-sm text-gray-400">Wallet Status</p>
                            <p
                                className={`font-semibold ${
                                    connected && walletAddress
                                        ? 'text-green-400'
                                        : profile.walletAddress
                                            ? 'text-yellow-400'
                                            : 'text-red-400'
                                }`}
                            >
                                {connected && walletAddress
                                    ? '🟢 Connected'
                                    : profile.walletAddress
                                        ? '🟡 Saved'
                                        : '🔴 Not Connected'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-stretch gap-3">
                            <ConnectWalletButton />

                            {profile.walletAddress && (
                                <button
                                    type="button"
                                    onClick={handleDeleteWallet}
                                    disabled={deletingWallet}
                                    className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap px-4 py-2.5 text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {deletingWallet ? 'Deleting...' : 'Delete Wallet'}
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-responsive-sm text-gray-400 mb-1.5">Wallet Address</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={profile.walletAddress}
                                    disabled={saving || updatingWallet}
                                    onChange={(e) =>
                                        setProfile((prev) => ({
                                            ...prev,
                                            walletAddress: e.target.value,
                                        }))
                                    }
                                    className="input-dark px-4 py-2.5 text-responsive-sm font-mono w-full disabled:opacity-50"
                                    placeholder="0x..."
                                />
                                <button
                                    type="button"
                                    onClick={handleUpdateWallet}
                                    disabled={updatingWallet}
                                    className="btn-primary px-4 py-2.5 text-responsive-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {updatingWallet ? 'Updating...' : 'Update Wallet'}
                                </button>
                            </div>
                            <p className="text-responsive-xs text-gray-500 mt-1">
                                Connect your wallet with AppKit to automatically fill and save your wallet address, or
                                paste a BSC address and click Update Wallet. Clearing this field and clicking Update
                                Wallet removes the saved wallet from your account entirely.
                            </p>
                            {profile.walletAddress && (
                                <p className="text-responsive-sm text-gray-400 mt-2 font-mono">
                                    Saved Wallet: <span className="text-brand-400">{shortenAddress(profile.walletAddress)}</span>
                                </p>
                            )}
                        </div>
                    </div>

                <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-800/30">
                        <CreditCard className="w-4 h-4 text-brand-400" />
                        <h2 className="text-responsive-base font-semibold text-white">Payment Accounts</h2>
                    </div>
                        <p className="text-responsive-xs text-gray-500">
                            Add your fiat payment accounts so buyers can send you payment during trades.
                        </p>

                        {paymentProviders.map(({ name, key }) => {
                            const accountKey = `${key}Account` as keyof ProfileFormState;
                            const nameKey = `${key}Name` as keyof ProfileFormState;

                            return (
                                <div key={key}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="text-responsive-sm font-medium text-gray-300">{name}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-responsive-xs text-gray-500 mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                value={profile[accountKey]}
                                                onChange={(e) => setProfile((p) => ({ ...p, [accountKey]: e.target.value }))}
                                                className="input-dark px-3 py-2 text-responsive-sm font-mono w-full"
                                                placeholder="0000000000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-responsive-xs text-gray-500 mb-1">Account Name</label>
                                            <input
                                                type="text"
                                                value={profile[nameKey]}
                                                onChange={(e) => setProfile((p) => ({ ...p, [nameKey]: e.target.value }))}
                                                className="input-dark px-3 py-2 text-responsive-sm w-full"
                                                placeholder="Your name on account"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary px-6 py-2.5 text-responsive-sm flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                        {saved && (
                            <span className="flex items-center gap-1.5 text-responsive-sm text-brand-400">
                                <CheckCircle className="w-4 h-4" />
                                Saved!
                            </span>
                        )}
                    </div>
                </form>

                <form onSubmit={handleChangePassword} className="glass-card rounded-2xl p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-800/30">
                        <Lock className="w-4 h-4 text-brand-400" />
                        <h2 className="text-responsive-base font-semibold text-white">Change Password</h2>
                    </div>
                    <div>
                        <label className="block text-responsive-sm text-gray-400 mb-1.5">Current Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                                className="input-dark px-4 py-2.5 pr-10 text-responsive-sm w-full"
                                placeholder="Enter current password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-responsive-sm text-gray-400 mb-1.5">New Password</label>
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                                className="input-dark px-4 py-2.5 text-responsive-sm w-full"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-responsive-sm text-gray-400 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPw ? 'text' : 'password'}
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                                    className="input-dark px-4 py-2.5 pr-10 text-responsive-sm w-full"
                                    placeholder="Repeat new password"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={pwSaving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                        className="btn-secondary px-6 py-2.5 text-responsive-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <Lock className="w-4 h-4" />
                        {pwSaving ? 'Updating...' : 'Update Password'}
                    </button>
                </form>

                <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                    <h2 className="text-responsive-base font-semibold text-white">Account Info</h2>
                    {[
                        { label: 'Email', value: user?.email },
                        { label: 'Role', value: user?.role === 'ADMIN' ? 'Administrator' : 'Trader' },
                        { label: 'Member since', value: user ? formatDate((user as any).createdAt || new Date().toISOString()) : '' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-responsive-sm">
                            <span className="text-gray-500">{label}</span>
                            <span className="text-gray-200">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardShell>
    );
}