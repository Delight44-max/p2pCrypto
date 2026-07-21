'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';
import { formatDate, shortenAddress } from '@/lib/utils';
import { Users, Search, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { DashboardShell } from '@/app/dashboard/layout';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);

        try {
            const res = await api.get<User[]>('/api/admin/users');

            if (!res.success || !res.data) {
                toast.error(res.message || 'Failed to load users');
                setUsers([]);
                return;
            }

            setUsers(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (userId: string) => {
    setToggling(userId);
    try {
      const res = await api.patch(`/api/admin/users/${userId}/toggle`);
      if (res.success) {
        toast.success('User status updated');
        fetchUsers();
      } else {
        toast.error(res.message || 'Failed to update user status');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setToggling(null); }
  };

  const requestToggle = (user: User) => {
    setConfirmUser(user);
  };

  const confirmToggle = () => {
    if (!confirmUser) return;
    const user = confirmUser;
    setConfirmUser(null);
    handleToggle(user.id);
  };

  const cancelToggle = () => {
    setConfirmUser(null);
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.fullName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.walletAddress || '').toLowerCase().includes(s);
  });

  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-responsive-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-400" />
              Users
            </h1>
            <p className="text-responsive-sm text-gray-400 mt-0.5">{users.length} registered users</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input-dark pl-9 pr-4 py-2.5 text-responsive-sm w-full sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">
                      Loading dashboard...
                  </p>
              </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-dark-500/50 border-b border-gray-800/30">
                  <tr>
                    {['User', 'Wallet', 'Trades', 'Role', 'Joined', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-responsive-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-dark-400/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-responsive-xs font-bold text-brand-400">
                              {u.fullName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-responsive-sm font-medium text-white truncate">{u.fullName}</p>
                            <p className="text-responsive-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-responsive-xs font-mono text-gray-400">
                        {u.walletAddress ? shortenAddress(u.walletAddress) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-responsive-xs text-white">{u.completedTrades}/{u.totalTrades}</p>
                        <p className="text-responsive-xs text-gray-500">completed</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-responsive-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-responsive-xs text-gray-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => requestToggle(u)}
                          disabled={toggling === u.id}
                          className={`flex items-center gap-1.5 text-responsive-xs px-2.5 py-1 rounded-lg transition-all ${
                            (u as any).isActive !== false
                              ? 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
                              : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          {(u as any).isActive !== false
                            ? <ToggleRight className="w-3.5 h-3.5" />
                            : <ToggleLeft className="w-3.5 h-3.5" />
                          }
                          {toggling === u.id ? '...' : (u as any).isActive !== false ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Toast Dialog */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-responsive-sm font-semibold text-white">Confirm Action</h3>
                <p className="text-responsive-xs text-gray-400">
                  {confirmUser.role === 'ADMIN' ? 'Administrator account' : 'User account'}
                </p>
              </div>
            </div>
            <p className="text-responsive-sm text-gray-300 mb-6">
              Are you sure you want to <strong className="text-white">{confirmUser.isActive !== false ? 'disable' : 'enable'}</strong>{' '}
              <strong className="text-brand-400">{confirmUser.fullName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelToggle}
                disabled={toggling === confirmUser.id}
                className="flex-1 px-4 py-2.5 rounded-xl text-responsive-sm font-medium text-gray-300 bg-dark-500 hover:bg-dark-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                disabled={toggling === confirmUser.id}
                className={`flex-1 px-4 py-2.5 rounded-xl text-responsive-sm font-medium text-white transition-all disabled:opacity-50 ${
                  confirmUser.isActive !== false
                    ? 'bg-red-500/80 hover:bg-red-500'
                    : 'bg-brand-500/80 hover:bg-brand-500'
                }`}
              >
                {toggling === confirmUser.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {confirmUser.isActive !== false ? 'Disabling...' : 'Enabling...'}
                  </span>
                ) : (
                  confirmUser.isActive !== false ? 'Yes, Disable' : 'Yes, Enable'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
