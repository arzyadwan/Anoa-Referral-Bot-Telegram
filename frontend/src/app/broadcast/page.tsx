"use client";

import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { getErrorMessage } from "../../lib/api";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Megaphone,
  HelpCircle,
} from "lucide-react";

interface Broadcast {
  id: number;
  message: string;
  target: "ALL" | "ACTIVE";
  status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  sentAt: string | null;
  createdAt: string;
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Composer Form
  const [messageText, setMessageText] = useState("");
  const [targetAudience, setTargetAudience] = useState<"ALL" | "ACTIVE">("ALL");
  const [sending, setSending] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/admin/broadcasts",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error("Gagal memuat riwayat siaran.");
      }

      const data = await response.json();
      setBroadcasts(data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (
      !confirm(
        "Apakah Anda yakin ingin mengirim pesan siaran ini ke semua pengguna target?",
      )
    )
      return;

    setSending(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/admin/broadcast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageText,
            target: targetAudience,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mengirim siaran.");
      }

      alert("Siaran pengumuman berhasil dikirim!");
      setMessageText("");
      fetchBroadcasts();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Gagal mengirim pesan."));
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Siaran Pesan (Broadcast)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Kirim pengumuman langsung kepada seluruh pengguna terdaftar melalui
            bot Telegram
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Broadcast Composer */}
          <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Megaphone className="w-5 h-5 text-[#C59B27]" />
              <h3 className="font-semibold text-lg">Buat Siaran Baru</h3>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Target Audiens
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) =>
                    setTargetAudience(e.target.value as "ALL" | "ACTIVE")
                  }
                  className="w-full bg-[#0F0F0F] border border-white/5 text-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#C59B27] focus:outline-none"
                >
                  <option value="ALL">Semua Pengguna Terdaftar (ALL)</option>
                  <option value="ACTIVE">
                    Hanya Pengguna Berstatus Aktif (ACTIVE)
                  </option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1.5 flex items-start gap-1">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                  <span>
                    Pengguna berstatus Banned tidak akan menerima siaran jika
                    memilih opsi ACTIVE.
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Isi Pesan Siaran
                </label>
                <textarea
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Ketik pesan pengumuman di sini..."
                  rows={8}
                  className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-[#C59B27] focus:outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-[#C59B27] to-[#B38A1F] hover:from-[#B38A1F] hover:to-[#967215] text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-[#C59B27]/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? "Mengirim Siaran..." : "Kirim Siaran"}</span>
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="lg:col-span-2 bg-[#161616] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Clock className="w-5 h-5 text-[#C59B27]" />
              <h3 className="font-semibold text-lg">Riwayat Siaran</h3>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-gray-400 text-sm">Memuat riwayat...</div>
              ) : broadcasts.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-6">
                  Belum ada pengumuman disiarkan.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Pesan</th>
                      <th className="pb-3">Target</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Tanggal Kirim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {broadcasts.map((bc) => (
                      <tr
                        key={bc.id}
                        className="hover:bg-white/1 transition-all"
                      >
                        <td
                          className="py-3.5 pr-4 max-w-sm truncate"
                          title={bc.message}
                        >
                          {bc.message}
                        </td>
                        <td className="py-3.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                            {bc.target}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              bc.status === "SENT"
                                ? "text-emerald-400"
                                : bc.status === "SENDING"
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }`}
                          >
                            {bc.status === "SENT" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : bc.status === "SENDING" ? (
                              <Clock className="w-4 h-4 animate-pulse" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>
                              {bc.status === "SENT"
                                ? "Terkirim"
                                : bc.status === "SENDING"
                                  ? "Mengirim"
                                  : "Gagal"}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 text-right text-gray-400 text-xs">
                          {bc.sentAt
                            ? new Date(bc.sentAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(bc.createdAt).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
