'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {AuthUser} from '@/types';
import { Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthUser>('/api/auth/register', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
      });
        if (!res.success || !res.data) {
            toast.error(res.message || 'Registration failed');
            return;
        }
      login(res.data);
      toast.success('Account created successfully!');
      router.replace('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-hero-pattern opacity-40" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center glow-green">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-responsive-xl font-bold gradient-text">De-tech P2P</span>
          </Link>
          <h1 className="text-responsive-2xl font-bold text-white mt-2">Create your account</h1>
          <p className="text-responsive-sm text-gray-400 mt-1">Start trading crypto securely today</p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Your full name"
                suppressHydrationWarning
                className="input-dark px-4 py-3 min-h-[44px] text-responsive-sm"
              />
            </div>

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
              <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">
                Phone Number <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+234 800 000 0000"
                suppressHydrationWarning
                className="input-dark px-4 py-3 text-responsive-sm"
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
                  placeholder="Min. 8 characters"
                  suppressHydrationWarning
                  className="input-dark px-4 py-3 pr-11 text-responsive-sm"
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

            <div>
              <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password"
                  suppressHydrationWarning
                  className="input-dark px-4 py-3 pr-11 text-responsive-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  suppressHydrationWarning
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 min-h-[44px] text-responsive-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-responsive-xs text-gray-600 text-center mt-4">
            By creating an account you agree to our terms of service.
          </p>

          <div className="mt-5 pt-5 border-t border-gray-800/50 text-center">
            <p className="text-responsive-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
