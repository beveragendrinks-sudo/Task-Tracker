'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GanttChartSquare, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase redirects with the session tokens in the URL hash.
    // onAuthStateChange picks up the SIGNED_IN event from the recovery link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also mark ready if a session already exists (hash already processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2500);
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
          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="font-serif text-xl text-stone-900 mb-2">Mot de passe mis à jour</h2>
              <p className="text-sm text-stone-600">Vous allez être redirigé vers votre tableau de bord...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <div className="h-8 w-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-stone-500">Vérification du lien en cours...</p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-xl text-stone-900 mb-1">Nouveau mot de passe</h2>
              <p className="text-sm text-stone-500 mb-6">Choisissez un nouveau mot de passe sécurisé.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2.5 pr-10 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
          Developpé par YBAK Solutions - 2026
        </div>
      </div>
    </div>
  );
}
