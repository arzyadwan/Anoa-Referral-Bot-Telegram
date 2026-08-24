"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, User, AlertCircle, Loader2 } from "lucide-react";
import { getErrorMessage } from "../../lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, pass: password }),
        },
      );

      if (!response.ok) {
        throw new Error("Username atau password salah.");
      }

      const data = await response.json();
      localStorage.setItem("admin_token", data.access_token);
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Koneksi ke server gagal."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#C59B27]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-[#E5C07B]/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#161616]/80 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl">
          {/* Logo / Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            <Image
              src="/logo.jpg"
              alt="ANOA Logo"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border border-[#C59B27]/40 object-cover shadow-lg shadow-[#C59B27]/10 mb-4"
            />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black tracking-[0.15em] bg-gradient-to-r from-[#C59B27] via-[#E5C07B] to-[#C59B27] bg-clip-text text-transparent uppercase leading-none">
                ANOA
              </span>
              <span className="text-[12px] font-bold tracking-[0.3em] text-[#E5C07B]/80 uppercase mt-2">
                Dashboard
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-4 tracking-wider uppercase">
              Masuk ke Dasbor Admin
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#C59B27] focus:outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#C59B27] focus:outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C59B27] to-[#B38A1F] hover:from-[#B38A1F] hover:to-[#967215] text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-[#C59B27]/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
