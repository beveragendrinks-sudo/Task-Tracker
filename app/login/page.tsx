'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GanttChartSquare, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 30% 60%, #f59e0b 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #d97706 0%, transparent 50%)'
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
              <GanttChartSquare className="h-6 w-6 text-white" />
            </div>
            <span className="font-serif text-xl text-white">Task Engine</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="font-serif text-4xl text-white leading-snug">
            Pilotez vos tâches<br />avec précision.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Suivi en temps réel, workflow structuré, et tableaux de bord décisionnels pour le groupe ELKATEB.
          </p>
          <div className="flex gap-6 pt-2">
            {[['Tâches', 'Organisées'], ['Workflow', 'Structuré'], ['KPIs', 'Temps réel']].map(([a, b]) => (
              <div key={a}>
                <div className="text-amber-400 font-semibold text-sm">{a}</div>
                <div className="text-slate-500 text-xs">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-slate-600">
          © 2026 YBAK Solutions — ELKATEB GROUP
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <GanttChartSquare className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="font-serif text-3xl text-slate-900 mt-3">Task Engine</h1>
            <p className="text-amber-600 text-xs uppercase tracking-widest mt-1">ELKATEB GROUP</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
            <h2 className="font-serif text-2xl text-slate-900 mb-1">Connexion</h2>
            <p className="text-sm text-slate-500 mb-7">Accédez à votre espace de pilotage</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Email professionnel
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@groupe.tn"
                  className="input-base"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <Link href="/forgot-password" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-base"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 justify-center flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Connexion…
                  </>
                ) : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Pas encore de compte ?{' '}
                <Link href="/signup" className="text-amber-600 hover:text-amber-700 font-semibold">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
