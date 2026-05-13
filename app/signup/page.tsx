'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GanttChartSquare, AlertCircle, ArrowLeft } from 'lucide-react';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la création du compte');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-stone-900 mb-2">Inscription réussie !</h2>
          <p className="text-stone-600 mb-4">
            Votre compte a été créé avec le rôle <span className="font-medium text-amber-700">Collaborateur</span>.
          </p>
          <p className="text-sm text-stone-500">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 mb-4">
            <Link href="/login" className="text-stone-500 hover:text-stone-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="font-serif text-xl text-stone-900">Créer un compte</h2>
              <p className="text-sm text-stone-500">Rejoignez l'espace de pilotage</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                Nom complet
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Prénom Nom"
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
              />
            </div>

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
                placeholder="Minimum 6 caractères"
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 uppercase tracking-wider">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe"
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
              <p className="font-medium mb-1">Rôle par défaut : Collaborateur</p>
              <p>Contactez votre administrateur pour obtenir des privilèges supplémentaires.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-stone-900 to-stone-800 text-white py-2.5 rounded-lg font-medium hover:from-stone-800 hover:to-stone-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Vous avez déjà un compte ?{' '}
              <Link href="/login" className="text-amber-700 hover:text-amber-800 font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
            Développé par YBAK Solutions - 2026
        </div>
      </div>
    </div>
  );
}
