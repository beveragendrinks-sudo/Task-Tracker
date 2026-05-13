import Link from 'next/link';

export default function TaskNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-4xl font-bold text-stone-300">404</p>
      <h1 className="text-xl font-semibold text-stone-700">Tâche introuvable</h1>
      <p className="text-sm text-stone-500">
        Cette tâche n'existe pas ou vous n'avez pas accès.
      </p>
      <Link
        href="/tasks/mine"
        className="mt-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700"
      >
        Retour à mes tâches
      </Link>
    </div>
  );
}
