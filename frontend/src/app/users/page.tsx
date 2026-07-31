'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  Search, 
  ShieldCheck, 
  UserMinus, 
  AlertTriangle, 
  X, 
  CheckCircle, 
  Clock, 
  Link as LinkIcon 
} from 'lucide-react';

interface User {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  status: 'ACTIVE' | 'BANNED' | 'FLAGGED';
  referralCode: string;
  createdAt: string;
}

interface InviteeRelation {
  id: number;
  status: 'PENDING' | 'VALID' | 'INVALID';
  failReason: string | null;
  joinedAt: string;
  invitee: {
    id: number;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Drawer / Detail State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [invitees, setInvitees] = useState<InviteeRelation[]>([]);
  const [inviteesLoading, setInviteesLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil daftar pengguna.');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter]);

  const handleUpdateStatus = async (userId: number, newStatus: 'ACTIVE' | 'BANNED' | 'FLAGGED', e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening drawer on button click
    setActionLoading(userId);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengubah status pengguna.');
      }

      // Update state locally
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenInvitees = async (user: User) => {
    setSelectedUser(user);
    setInviteesLoading(true);
    setInvitees([]);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/users/${user.id}/invitees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil daftar rujukan.');
      }

      const data = await response.json();
      setInvitees(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setInviteesLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
            <p className="text-sm text-gray-400 mt-1">
              Daftar pengguna terdaftar di bot Telegram. Klik pada baris pengguna untuk melihat rujukan yang diundang.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 bg-[#161616] border border-white/5 p-4 rounded-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan username atau nama..."
              className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#C59B27] focus:outline-none transition-all placeholder:text-gray-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0F0F0F] border border-white/5 text-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#C59B27] focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="BANNED">Diblokir (Banned)</option>
            <option value="FLAGGED">Dicurigai (Flagged)</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading data pengguna...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Tidak ada pengguna ditemukan.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">ID Pengguna</th>
                    <th className="p-4">Akun Telegram</th>
                    <th className="p-4">Kode Referral</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Tanggal Daftar</th>
                    <th className="p-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {users.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleOpenInvitees(user)}
                      className="hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <td className="p-4 pl-6 font-medium text-gray-300">#{user.id}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {user.username ? `@${user.username}` : `ID: ${user.telegramId}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-[#C59B27]">{user.referralCode}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : user.status === 'BANNED'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {user.status === 'ACTIVE' ? 'Aktif' : user.status === 'BANNED' ? 'Banned' : 'Flagged'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.status !== 'ACTIVE' && (
                            <button
                              disabled={actionLoading === user.id}
                              onClick={(e) => handleUpdateStatus(user.id, 'ACTIVE', e)}
                              className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all"
                              title="Aktifkan Pengguna"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          {user.status !== 'FLAGGED' && (
                            <button
                              disabled={actionLoading === user.id}
                              onClick={(e) => handleUpdateStatus(user.id, 'FLAGGED', e)}
                              className="p-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all"
                              title="Tandai Dicurigai"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {user.status !== 'BANNED' && (
                            <button
                              disabled={actionLoading === user.id}
                              onClick={(e) => handleUpdateStatus(user.id, 'BANNED', e)}
                              className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                              title="Blokir Pengguna"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Selected User Slide-over Drawer */}
        {selectedUser && (
          <div className="fixed inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm z-50 flex justify-end transition-all">
            <div className="w-full max-w-2xl bg-[#161616] border-l border-white/5 h-full p-8 flex flex-col justify-between shadow-2xl relative">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                {/* Header Profile Info */}
                <div>
                  <span className="text-[10px] font-bold text-[#C59B27] uppercase tracking-widest">Detail Profil</span>
                  <h3 className="text-2xl font-bold mt-1">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedUser.username ? `@${selectedUser.username}` : `Telegram ID: ${selectedUser.telegramId}`}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-[#0F0F0F] p-4 rounded-xl border border-white/5">
                      <span className="text-xs text-gray-500 block">Kode Referral</span>
                      <span className="font-mono text-sm text-[#C59B27] font-semibold mt-1 block">
                        {selectedUser.referralCode}
                      </span>
                    </div>

                    <div className="bg-[#0F0F0F] p-4 rounded-xl border border-white/5">
                      <span className="text-xs text-gray-500 block">Status Akun</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${
                        selectedUser.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : selectedUser.status === 'BANNED'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {selectedUser.status === 'ACTIVE' ? 'Aktif' : selectedUser.status === 'BANNED' ? 'Banned' : 'Flagged'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invitees Log list */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <LinkIcon className="w-5 h-5 text-[#E5C07B]" />
                    <h4 className="font-semibold text-base">Daftar Orang yang Diundang</h4>
                  </div>

                  {inviteesLoading ? (
                    <div className="text-gray-400 text-sm py-4">Memuat daftar rujukan...</div>
                  ) : invitees.length === 0 ? (
                    <div className="text-gray-400 text-sm py-4">
                      Pengguna ini belum berhasil mengundang siapapun menggunakan kode rujukan mereka.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitees.map((rel) => (
                        <div 
                          key={rel.id} 
                          className="bg-[#0F0F0F] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4"
                        >
                          <div>
                            <span className="font-semibold text-sm">
                              {rel.invitee.firstName} {rel.invitee.lastName}
                            </span>
                            <span className="text-xs text-gray-500 block">
                              {rel.invitee.username ? `@${rel.invitee.username}` : `ID: ${rel.invitee.telegramId}`}
                            </span>
                            {rel.failReason && (
                              <span className="text-[10px] text-red-400 block mt-1">
                                Info: {rel.failReason}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Validation Status badge */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rel.status === 'VALID'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : rel.status === 'PENDING'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {rel.status === 'VALID' ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Valid</span>
                                </>
                              ) : rel.status === 'PENDING' ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Invalid</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all border border-white/5"
                >
                  Tutup Detail
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
