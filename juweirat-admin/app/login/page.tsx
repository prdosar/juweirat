'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      saveAuth(res.token, { email: res.email, fullName: res.fullName, role: res.role });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal relative overflow-y-auto py-8 px-4">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-green/3 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo — encadré blanc pour rester visible sur fond charcoal
            (le logo est en lettres blanches sur transparent). */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-white px-6 py-3.5 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center">
            <Image
              src="/img/logo.png"
              alt="Résidence Juweirat"
              width={180}
              height={70}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <p className="text-white/40 text-[9.5px] tracking-[0.35em] mt-3 uppercase font-semibold">
            Administration &amp; Gestion
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Green top accent */}
          <div className="h-1.5 bg-[#1B4332] w-full" />

          <div className="p-8 space-y-5">
            <h2 className="text-lg font-bold text-charcoal text-center">Connexion</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@juweirat.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green/50 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal hover:bg-charcoal-800 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </div>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Résidence Juweirat · Lomé, Togo
        </p>
      </div>
    </div>
  );
}
