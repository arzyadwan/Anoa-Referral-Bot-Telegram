"use client";

import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { getErrorMessage } from "../../lib/api";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface User {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface Referral {
  id: number;
  inviterId: number;
  inviteeId: number;
  status: "PENDING" | "VALID" | "INVALID";
  failReason: string | null;
  joinedAt: string;
  validatedAt: string | null;
  inviter: User;
  invitee: User;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/admin/referrals",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil data rujukan.");
      }

      const data = await response.json();
      setReferrals(data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleOverrideStatus = async (
    refId: number,
    newStatus: "VALID" | "INVALID",
    reason?: string,
  ) => {
    setActionLoading(refId);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/referrals/${refId}/override`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, failReason: reason }),
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mengubah status rujukan.");
      }

      const updatedRef = await response.json();
      setReferrals(
        referrals.map((r) =>
          r.id === refId
            ? {
                ...r,
                status: newStatus,
                failReason: updatedRef.failReason,
                validatedAt: updatedRef.validatedAt,
              }
            : r,
        ),
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Terjadi kesalahan."));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Pelacakan Rujukan (Referrals)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Pantau performa program rujukan secara real-time, audit, dan
            override manual jika diperlukan
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                Loading data rujukan...
              </div>
            ) : referrals.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Belum ada aktivitas rujukan terdaftar.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">ID</th>
                    <th className="p-4">Pengundang (Inviter)</th>
                    <th className="p-4">Terundang (Invitee)</th>
                    <th className="p-4">Status Validasi</th>
                    <th className="p-4">Alasan Pending/Gagal</th>
                    <th className="p-4">Tanggal Bergabung</th>
                    <th className="p-4 pr-6 text-right">Override Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {referrals.map((ref) => (
                    <tr
                      key={ref.id}
                      className="hover:bg-white/1 transition-all"
                    >
                      <td className="p-4 pl-6 text-gray-400">#{ref.id}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {ref.inviter.firstName} {ref.inviter.lastName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {ref.inviter.username
                              ? `@${ref.inviter.username}`
                              : `ID: ${ref.inviter.telegramId}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {ref.invitee.firstName} {ref.invitee.lastName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {ref.invitee.username
                              ? `@${ref.invitee.username}`
                              : `ID: ${ref.invitee.telegramId}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ref.status === "VALID"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : ref.status === "PENDING"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {ref.status === "VALID" ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </>
                          ) : ref.status === "PENDING" ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Invalid</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td
                        className="p-4 text-xs text-gray-400 max-w-xs truncate"
                        title={ref.failReason || ""}
                      >
                        {ref.failReason || "-"}
                      </td>
                      <td className="p-4 text-gray-400">
                        {new Date(ref.joinedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ref.status !== "VALID" && (
                            <button
                              disabled={actionLoading === ref.id}
                              onClick={() =>
                                handleOverrideStatus(ref.id, "VALID")
                              }
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all flex items-center gap-1"
                              title="Setujui Secara Manual"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                          )}
                          {ref.status !== "INVALID" && (
                            <button
                              disabled={actionLoading === ref.id}
                              onClick={() => {
                                const reason = prompt(
                                  "Masukkan alasan penolakan:",
                                );
                                if (reason !== null) {
                                  handleOverrideStatus(
                                    ref.id,
                                    "INVALID",
                                    reason || "Ditolak manual oleh Admin",
                                  );
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-all flex items-center gap-1"
                              title="Tolak Secara Manual"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Tolak</span>
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
      </div>
    </AdminLayout>
  );
}
