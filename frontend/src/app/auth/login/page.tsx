'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { AuthUser } from '@/types';
import { Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {

            // Login
            const loginRes = await api.post<AuthUser>('/api/auth/login', form);

            if (!loginRes.success || !loginRes.data) {
                toast.error(loginRes.message || 'Login failed');
                return;
            }

            // Save JWT
            localStorage.setItem('token', loginRes.data.token);


            // Load fresh user from database
            const meRes = await api.get<AuthUser>('/api/auth/me');

            if (!meRes.success || !meRes.data) {
                toast.error('Failed to load user profile');
                return;
            }

            // Keep the JWT
            login({
                ...meRes.data,
                token: loginRes.data.token,
            });

            toast.success('Welcome back!');

            router.replace('/dashboard');

        } catch (err: any) {

            toast.error(
                err.response?.data?.message ||
                err.message ||
                'Login failed'
            );

        } finally {

            setLoading(false);

        }
    };

  return (
    <div className="min-h-screen bg-dark-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-hero-pattern opacity-40" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center glow-green">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-responsive-xl font-bold gradient-text">De-tech P2P</span>
          </Link>
          <h1 className="text-responsive-2xl font-bold text-white mt-2">Welcome back</h1>
          <p className="text-responsive-sm text-gray-400 mt-1">Sign in to your trading account</p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  suppressHydrationWarning
                  className="input-dark px-4 py-3 min-h-[44px] text-responsive-sm"
                />
            </div>

            <div>
              <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  suppressHydrationWarning
                  className="input-dark px-4 py-3 min-h-[44px] pr-11 text-responsive-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

              <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 min-h-[44px] text-responsive-sm mt-2"
                  suppressHydrationWarning
                >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800/50 text-center">
            <p className="text-responsive-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-responsive-xs text-gray-600 mt-6">
          Protected by smart contract escrow on BSC
        </p>
      </div>
    </div>
  );
}
