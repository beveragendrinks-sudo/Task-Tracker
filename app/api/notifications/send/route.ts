import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { sendNotificationEmailById, createAndSendNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();

  try {
    if (body.notification_id) {
      await sendNotificationEmailById(body.notification_id);
      return NextResponse.json({ success: true });
    }

    if (body.user_id && body.title) {
      await createAndSendNotification({
        user_id: body.user_id,
        type: body.type || 'task_to_accept',
        title: body.title,
        message: body.message || body.title,
        task_id: body.task_id || null,
        related_user_id: profile.id,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  } catch (err: any) {
    console.error('[/api/notifications/send] Erreur:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 });
  }
}
