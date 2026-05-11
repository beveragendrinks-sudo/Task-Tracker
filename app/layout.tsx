import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Task Engine — Group OS',
  description: 'Gestion des tâches, engagements et workload pour groupe industriel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-stone-900">
        {children}
      </body>
    </html>
  );
}
