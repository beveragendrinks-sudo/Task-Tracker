import Link from 'next/link';
import { Inbox, MailCheck, MailWarning, BellRing, ChevronRight } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import { formatDateShort } from '@/lib/utils';

type EmailNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  is_read: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
  task?: {
    id: string;
    title: string;
    reference: string;
  } | null;
  related_user?: {
    full_name: string;
  } | null;
};

export default async function EmailsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      title,
      message,
      task_id,
      is_read,
      email_sent,
      email_sent_at,
      created_at,
      task:tasks!notifications_task_id_fkey(id, title, reference),
      related_user:profiles!notifications_related_user_id_fkey(full_name)
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EmailsPage] Query error:', error.message);
  }

  const notifications = (data as EmailNotificationRow[] | null) ?? [];
  const pendingEmails = notifications.filter(notification => !notification.email_sent);
  const sentEmails = notifications.filter(notification => notification.email_sent);
  const unreadNotifications = notifications.filter(notification => !notification.is_read);

  return (
    <>
      <Header title="Emails" subtitle="Suivi des notifications envoyées par email" />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Inbox} label="Notifications" value={notifications.length} />
          <Stat icon={MailWarning} label="Emails en attente" value={pendingEmails.length} accent={pendingEmails.length > 0 ? 'text-orange-700' : ''} />
          <Stat icon={MailCheck} label="Emails envoyés" value={sentEmails.length} />
          <Stat icon={BellRing} label="Non lues" value={unreadNotifications.length} accent={unreadNotifications.length > 0 ? 'text-amber-700' : ''} />
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200">
            <h2 className="font-serif text-lg text-stone-900">Journal des emails</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Chaque notification liste son statut email et un lien vers la tâche associée.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="p-16 text-center">
              <Inbox className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-stone-900">Aucun email à afficher</h3>
              <p className="text-sm text-stone-500 mt-1">
                Les notifications générées dans l'application apparaîtront ici avec leur statut d'envoi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {notifications.map(notification => {
                const statusClasses = notification.email_sent
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div key={notification.id} className="px-5 py-4 flex items-start gap-4 hover:bg-stone-50 transition-colors">
                    <div className={`mt-0.5 h-10 w-10 rounded-lg border flex items-center justify-center ${statusClasses}`}>
                      {notification.email_sent ? <MailCheck className="h-5 w-5" /> : <MailWarning className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-stone-900">{notification.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusClasses}`}>
                          {notification.email_sent ? 'envoye' : 'en attente'}
                        </span>
                        {!notification.is_read && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold uppercase tracking-wider">
                            non lue
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-stone-700">{notification.message}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                        <span>Type: {notification.type}</span>
                        <span>Cree le {formatDateShort(notification.created_at)}</span>
                        <span>
                          Email {notification.email_sent && notification.email_sent_at
                            ? `envoye le ${formatDateShort(notification.email_sent_at)}`
                            : 'non envoye'}
                        </span>
                        {notification.related_user?.full_name && (
                          <span>Lie a {notification.related_user.full_name}</span>
                        )}
                      </div>
                    </div>

                    {notification.task ? (
                      <Link
                        href={`/tasks/${notification.task.id}`}
                        className="shrink-0 inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
                      >
                        <span className="hidden sm:inline">{notification.task.reference}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}