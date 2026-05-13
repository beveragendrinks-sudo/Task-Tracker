import { createAdminClient } from '@/lib/supabase/admin';

const RESEND_API = 'https://api.resend.com/emails';

async function sendViaResend(from: string, to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY non configurée');

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message || body?.name || JSON.stringify(body);
    throw new Error(`Erreur Resend ${res.status}: ${msg}`);
  }
  return res.json();
}

export async function sendNotificationEmailById(notificationId: string) {
  const admin = createAdminClient();

  const { data: notif, error: notifError } = await admin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (notifError || !notif) throw new Error('Notification introuvable');

  const { data: user } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', notif.user_id)
    .single();

  if (!user || !user.email) throw new Error('Utilisateur introuvable ou sans email');

  const from = process.env.RESEND_FROM_EMAIL || `Task Engine <noreply@localhost>`;
  const to = user.email;
  const subject = notif.title;
  const taskLink = notif.task_id ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${notif.task_id}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const html = `<p>${notif.message}</p><p><a href="${taskLink}">Voir la tâche</a></p>`;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY absent — email non envoyé', { to, subject });
    return null;
  }

  try {
    const result = await sendViaResend(from, to, subject, html);
    await admin
      .from('notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', notificationId);
    return result;
  } catch (e: any) {
    console.warn('Email non envoyé (non bloquant):', e?.message || e);
    return null;
  }
}

export async function createAndSendNotification(payload: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id?: string | null;
  related_user_id?: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notifications')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  try {
    await sendNotificationEmailById(data.id);
  } catch (e) {
    console.error('Erreur en envoyant email notification:', e);
  }

  return data;
}
