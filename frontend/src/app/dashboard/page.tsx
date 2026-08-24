"use client";

import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { getErrorMessage } from "../../lib/api";
import {
  Users,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

interface KPIStats {
  totalUsers: number;
  totalReferrals: number;
  validReferrals: number;
  pendingReferrals: number;
  invalidReferrals: number;
  dau: number;
  wau: number;
  validationRate: number;
}

interface ChartItem {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const response = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
            "/admin/analytics",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data analytics.");
        }

        const data = await response.json();
        setKpis(data.kpis);
        setChartData(data.chartData);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Terjadi kesalahan."));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const chartConfig = {
    labels: chartData.map((item) => item.date),
    datasets: [
      {
        fill: true,
        label: "Anggota Baru",
        data: chartData.map((item) => item.count),
        borderColor: "#C59B27",
        backgroundColor: "rgba(197, 155, 39, 0.1)",
        tension: 0.3,
        pointBackgroundColor: "#C59B27",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#161616",
        titleColor: "#F8FAFC",
        bodyColor: "#C59B27",
        borderColor: "rgba(197, 155, 39, 0.15)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#94A3B8",
          font: { size: 11 },
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#94A3B8",
          font: { size: 11 },
        },
      },
    },
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col gap-6">
          <div className="h-8 w-48 bg-white/5 animate-pulse rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-white/5 animate-pulse rounded-2xl"
              ></div>
            ))}
          </div>
          <div className="h-96 bg-white/5 animate-pulse rounded-2xl"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Ringkasan Analitik
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Performa pertumbuhan komunitas real-time
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {kpis && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Total Users */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Total Anggota
                  </span>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {kpis.totalUsers}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-[#C59B27]/10 border border-[#C59B27]/20 rounded-xl flex items-center justify-center text-[#C59B27]">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Total Referrals */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Total Referral
                  </span>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {kpis.totalReferrals}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-[#E5C07B]/10 border border-[#E5C07B]/20 rounded-xl flex items-center justify-center text-[#E5C07B]">
                  <LinkIcon className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Validation Rate */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Rasio Validasi
                  </span>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {kpis.validationRate}%
                  </h3>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: Active Users (DAU / WAU) */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Aktif (DAU / WAU)
                  </span>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {kpis.dau}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      / {kpis.wau}
                    </span>
                  </h3>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Validation Breakdown & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart Panel */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 lg:col-span-2">
                <h4 className="text-base font-semibold mb-6">
                  Pertumbuhan Anggota Baru (30 Hari Terakhir)
                </h4>
                <div className="h-80 relative">
                  <Line data={chartConfig} options={chartOptions} />
                </div>
              </div>

              {/* Referral Status Card */}
              <div className="bg-[#161616] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-semibold mb-6">
                    Status Validasi Rujukan
                  </h4>
                  <div className="space-y-4">
                    {/* Valid Referrals */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-medium">Valid</span>
                      </div>
                      <span className="text-sm font-bold">
                        {kpis.validReferrals}
                      </span>
                    </div>

                    {/* Pending Referrals */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-400" />
                        <span className="text-sm font-medium">Pending</span>
                      </div>
                      <span className="text-sm font-bold">
                        {kpis.pendingReferrals}
                      </span>
                    </div>

                    {/* Invalid Referrals */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-sm font-medium">
                          Invalid / Suspicious
                        </span>
                      </div>
                      <span className="text-sm font-bold">
                        {kpis.invalidReferrals}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 border-t border-white/5 pt-4 mt-6">
                  * Validasi berjalan otomatis setiap 30 detik berdasarkan
                  aturan durasi tinggal, keanggotaan channel, dan minimal pesan.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
