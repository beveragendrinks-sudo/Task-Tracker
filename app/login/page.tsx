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
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #d97706 0%, transparent 50%), radial-gradient(circle at 80% 30%, #b45309 0%, transparent 50%)'
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <GanttChartSquare className="h-8 w-8 text-stone-900" />
            </div>
          </div>
          <h1 className="font-serif text-4xl text-stone-100">Task Engine</h1>
          <p className="text-amber-400 text-sm uppercase tracking-[0.3em] mt-2">Group Operating System</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="font-serif text-xl text-stone-900 mb-1">Connexion</h2>
          <p className="text-sm text-stone-500 mb-6">Accédez à votre espace de pilotage</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                Email professionnel
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@groupe.tn"
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-stone-900 to-stone-800 text-white py-2.5 rounded-lg font-medium hover:from-stone-800 hover:to-stone-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="text-amber-700 hover:text-amber-800 font-medium">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
          Sécurisé par Supabase · Row Level Security activé
        </div>
      </div>
    </div>
  );
}
