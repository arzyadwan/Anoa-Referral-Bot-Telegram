'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Save, Plus, Trash2, CheckCircle2, XCircle, Settings, ClipboardList } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  type: 'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM';
  telegramChatId: string | null;
  isActive: boolean;
}

export default function TasksPage() {
  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({
    min_messages_count: '5',
    min_stay_hours: '24',
    channel_username: '@test_channel',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  // Create Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM'>('JOIN_CHANNEL');
  const [newChatId, setNewChatId] = useState('');
  const [taskCreating, setTaskCreating] = useState(false);

  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // Fetch Settings
      const settingsRes = await fetch('http://localhost:3001/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
      setSettingsLoading(false);

      // Fetch Tasks
      const tasksRes = await fetch('http://localhost:3001/admin/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
      setTasksLoading(false);
    } catch (err: any) {
      setError('Gagal memuat data dari server.');
      setSettingsLoading(false);
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan aturan.');
      }

      alert('Aturan validasi rujukan berhasil disimpan!');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setTaskCreating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          type: newType,
          telegramChatId: newType === 'JOIN_CHANNEL' ? newChatId : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal membuat tugas.');
      }

      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      
      // Reset Form
      setNewTitle('');
      setNewDescription('');
      setNewType('JOIN_CHANNEL');
      setNewChatId('');
      alert('Tugas kampanye berhasil ditambahkan!');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setTaskCreating(false);
    }
  };

  const handleToggleTaskActive = async (task: Task) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:3001/admin/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !task.isActive }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengubah status tugas.');
      }

      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, isActive: !t.isActive } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:3001/admin/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus tugas.');
      }

      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Aturan & Tugas Kampanye</h2>
          <p className="text-sm text-gray-400 mt-1">Konfigurasi batasan anti-abuse rujukan dan kelola tugas pertumbuhan komunitas</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rules Configuration Panel */}
          <div className="bg-[#151D30] border border-white/5 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Settings className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-lg">Konfigurasi Aturan Validasi</h3>
            </div>

            {settingsLoading ? (
              <div className="text-gray-400 text-sm">Memuat aturan...</div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Target Channel / Grup (Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.channel_username}
                    onChange={(e) => setSettings({ ...settings, channel_username: e.target.value })}
                    placeholder="@grup_anda"
                    className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pengguna baru harus masuk ke channel/grup ini.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Minimal Pesan Dikirim
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={settings.min_messages_count}
                    onChange={(e) => setSettings({ ...settings, min_messages_count: e.target.value })}
                    className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Jumlah pesan minimum yang harus dikirim di grup.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Minimal Waktu Tinggal (Jam)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={settings.min_stay_hours}
                    onChange={(e) => setSettings({ ...settings, min_stay_hours: e.target.value })}
                    className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lama waktu minimal pengguna harus menetap.</p>
                </div>

                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{settingsSaving ? 'Menyimpan...' : 'Simpan Aturan'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Tasks Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Task Form */}
            <div className="bg-[#151D30] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-lg">Tambah Tugas Baru</h3>
              </div>

              <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Judul Tugas
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Contoh: Ikuti Twitter Kami"
                      className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Deskripsi / Tautan Tugas
                    </label>
                    <textarea
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Masukkan langkah penyelesaian atau tautan media sosial..."
                      rows={3}
                      className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Tipe Validasi
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-[#0F1422] border border-white/5 text-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="JOIN_CHANNEL">Gabung Channel Telegram (Automated)</option>
                      <option value="SEND_MESSAGES">Kirim Pesan di Grup (Automated)</option>
                      <option value="CUSTOM">Tugas Khusus / Media Sosial (Manual/Auto-pass)</option>
                    </select>
                  </div>

                  {newType === 'JOIN_CHANNEL' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Username / ID Channel Telegram Target
                      </label>
                      <input
                        type="text"
                        required
                        value={newChatId}
                        onChange={(e) => setNewChatId(e.target.value)}
                        placeholder="@channel_target"
                        className="w-full bg-[#0F1422] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={taskCreating}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Plus className="w-5 h-5" />
                      <span>{taskCreating ? 'Membuat...' : 'Buat Tugas'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Tasks List */}
            <div className="bg-[#151D30] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-lg">Daftar Tugas Aktif</h3>
              </div>

              {tasksLoading ? (
                <div className="text-gray-400 text-sm">Memuat daftar tugas...</div>
              ) : tasks.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-6">Belum ada tugas kampanye dibuat.</div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-[#0F1422] border border-white/5 rounded-xl gap-4 hover:border-white/10 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold truncate">{task.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            task.type === 'JOIN_CHANNEL'
                              ? 'bg-blue-500/10 text-blue-400'
                              : task.type === 'SEND_MESSAGES'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {task.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-md">{task.description}</p>
                        {task.telegramChatId && (
                          <p className="text-[10px] text-gray-500">Target Chat ID: {task.telegramChatId}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Toggle active state */}
                        <button
                          onClick={() => handleToggleTaskActive(task)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            task.isActive
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-gray-500/10 border-white/5 text-gray-400 hover:bg-gray-500/20'
                          }`}
                          title={task.isActive ? 'Tugas Aktif (Klik untuk nonaktifkan)' : 'Tugas Nonaktif (Klik untuk aktifkan)'}
                        >
                          {task.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
