import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, GitBranch, ChevronRight } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'general_manager'].includes(profile.role)) redirect('/dashboard');

  const supabase = createClient();
  const [{ count: usersCount }, { count: entitiesCount }, { count: deptsCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('entities').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const cards = [
    {
      href: '/admin/users',
      icon: Users,
      title: 'Utilisateurs',
      description: 'Créer des comptes, assigner rôles et départements',
      count: usersCount ?? 0,
      label: 'actifs',
    },
    {
      href: '/admin/entities',
      icon: Building2,
      title: 'Entités',
      description: 'Gérer les sociétés et filiales du groupe',
      count: entitiesCount ?? 0,
      label: 'actives',
    },
    {
      href: '/admin/departments',
      icon: GitBranch,
      title: 'Départements',
      description: 'Gérer les départements et directions',
      count: deptsCount ?? 0,
      label: 'actifs',
    },
  ];

  return (
    <>
      <Header title="Administration" subtitle="Gestion des utilisateurs, entités et départements" />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white border border-stone-200 rounded-xl p-6 hover:border-amber-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg bg-stone-100 group-hover:bg-amber-50 transition-colors">
                    <Icon className="h-6 w-6 text-stone-600 group-hover:text-amber-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-amber-600 mt-1" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-serif font-light text-stone-900">{card.count}</div>
                  <div className="text-xs text-stone-500">{card.label}</div>
                </div>
                <div className="mt-3">
                  <div className="font-medium text-stone-900">{card.title}</div>
                  <div className="text-sm text-stone-500 mt-0.5">{card.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
