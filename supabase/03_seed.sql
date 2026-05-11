-- =====================================================================
-- TASK ENGINE — Données de démonstration (OPTIONNEL)
-- À exécuter APRÈS 01_schema.sql et 02_rls.sql
-- ATTENTION : ne pas exécuter en production
-- =====================================================================

-- IMPORTANT : avant d'exécuter, créez d'abord vos utilisateurs réels
-- via Supabase Auth (Dashboard > Authentication > Users > Add User)
-- Puis associez les profils ci-dessous à leurs auth_user_id.

-- ---------------------------------------------------------------------
-- 1. ENTITÉS
-- ---------------------------------------------------------------------
insert into entities (id, name, description, is_group_level) values
  ('11111111-1111-1111-1111-111111111111', 'Holding', 'Société mère du groupe', true),
  ('22222222-2222-2222-2222-222222222222', 'Food & Beverage', 'Activité agroalimentaire — tortillas et plats préparés', false),
  ('33333333-3333-3333-3333-333333333333', 'Automotive', 'Distribution automobile', false),
  ('44444444-4444-4444-4444-444444444444', 'Real Estate', 'Promotion immobilière', false)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. DÉPARTEMENTS
-- ---------------------------------------------------------------------
insert into departments (id, name, description) values
  ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Direction Générale', 'DG et stratégie groupe'),
  ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Production', 'Usine et opérations industrielles'),
  ('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales', 'Ventes et développement commercial'),
  ('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Finance', 'Comptabilité et contrôle de gestion'),
  ('a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Qualité', 'Hygiène, sécurité et qualité produit'),
  ('a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Achats', 'Approvisionnement et fournisseurs'),
  ('a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RH', 'Ressources humaines et formation'),
  ('a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'IT', 'Systèmes d''information et digital')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. PROFILS UTILISATEURS DE DÉMO
-- ---------------------------------------------------------------------
-- ⚠ Ces profils ne sont PAS liés à des auth.users
-- Pour les utiliser réellement, créez les comptes via Supabase Auth
-- puis mettez à jour auth_user_id en conséquence.
-- En attendant, ils servent de référence pour les tâches.

insert into profiles (id, full_name, email, role, job_title, entity_id, department_id, capacity_percent) values
  ('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Karim Ben Salah', 'karim.bensalah@demo.tn', 'general_manager', 'Directeur Général',
   '11111111-1111-1111-1111-111111111111', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Leila Trabelsi', 'leila.trabelsi@demo.tn', 'head_of_department', 'Directrice Production',
   '22222222-2222-2222-2222-222222222222', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mehdi Bouzid', 'mehdi.bouzid@demo.tn', 'manager', 'Sales Manager',
   '22222222-2222-2222-2222-222222222222', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b4444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sami Khelifi', 'sami.khelifi@demo.tn', 'task_owner', 'Chef de Production',
   '22222222-2222-2222-2222-222222222222', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b5555555-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Nadia Jaziri', 'nadia.jaziri@demo.tn', 'head_of_department', 'CFO',
   '11111111-1111-1111-1111-111111111111', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b6666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ahmed Mejri', 'ahmed.mejri@demo.tn', 'task_owner', 'QA Engineer',
   '22222222-2222-2222-2222-222222222222', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b7777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sonia Hamdi', 'sonia.hamdi@demo.tn', 'task_owner', 'Acheteuse',
   '22222222-2222-2222-2222-222222222222', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('b8888888-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Riadh Chaabane', 'riadh.chaabane@demo.tn', 'manager', 'IT Lead',
   '11111111-1111-1111-1111-111111111111', 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. TÂCHES DE DÉMO
-- ---------------------------------------------------------------------
insert into tasks (
  title, description, entity_id, primary_department_id, created_by, owner_id,
  priority, complexity, status,
  proposed_deadline, accepted_deadline,
  proposed_workload_percent, accepted_workload_percent,
  workload_start_date, workload_end_date,
  definition_of_done, ai_risk_score
) values
  (
    'Lancement nouveau packaging tortillas 250g',
    'Finaliser la nouvelle gamme de packaging incluant validation BAT, prototype, et conformité réglementaire avant la campagne Ramadan 2026.',
    '22222222-2222-2222-2222-222222222222', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P1', 'complex', 'active',
    now() + interval '14 days', now() + interval '18 days',
    30, 40,
    current_date, current_date + interval '18 days',
    '[{"label":"BAT validé","done":true},{"label":"Prototype reçu","done":true},{"label":"Conformité régl.","done":false},{"label":"Lancement production","done":false}]'::jsonb,
    0.34
  ),
  (
    'Audit qualité chaîne production - Site Sfax',
    'Audit complet ISO 22000 sur la ligne tortillas, identification des écarts et plan de correction.',
    '22222222-2222-2222-2222-222222222222', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b6666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P1', 'strategic', 'blocked',
    now() - interval '3 days', now() - interval '3 days',
    50, 60,
    current_date - interval '15 days', current_date - interval '3 days',
    '[{"label":"Rapport audit","done":false},{"label":"Plan correctif validé","done":false}]'::jsonb,
    0.78
  ),
  (
    'Négociation contrat fournisseur farine bio',
    'Renégocier le contrat annuel 2026 avec MoulinDor pour un meilleur tarif et garanties d''approvisionnement.',
    '22222222-2222-2222-2222-222222222222', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b7777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P2', 'medium', 'negotiation',
    now() + interval '7 days', null,
    25, null, null, null,
    '[{"label":"Contrat signé","done":false}]'::jsonb,
    0.45
  ),
  (
    'Recrutement Ingénieur Process - Ligne 2',
    'Recruter un ingénieur process expérimenté pour la nouvelle ligne tortillas.',
    '22222222-2222-2222-2222-222222222222', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b5555555-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P3', 'medium', 'accepted',
    now() + interval '45 days', now() + interval '45 days',
    15, 15,
    current_date, current_date + interval '45 days',
    '[{"label":"Shortlist 3 candidats","done":false},{"label":"Entretiens DG","done":false},{"label":"Contrat signé","done":false}]'::jsonb,
    0.12
  ),
  (
    'Mise en place ERP module Production',
    'Déploiement du module Production dans l''ERP IA en cours de développement.',
    '22222222-2222-2222-2222-222222222222', 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b8888888-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P1', 'strategic', 'active',
    now() + interval '60 days', now() + interval '75 days',
    50, 60,
    current_date, current_date + interval '75 days',
    '[{"label":"UAT Production validé","done":false},{"label":"Formation équipes","done":false},{"label":"Go-live","done":false}]'::jsonb,
    0.52
  ),
  (
    'Plan budgétaire Q2 2026',
    'Construction du plan budgétaire Q2 incluant scénarios optimiste/pessimiste.',
    '11111111-1111-1111-1111-111111111111', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b5555555-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P1', 'complex', 'closed_by_owner',
    now() + interval '2 days', now() + interval '2 days',
    40, 40,
    current_date - interval '20 days', current_date,
    '[{"label":"Document validé","done":true},{"label":"Présentation DG","done":true}]'::jsonb,
    0.21
  ),
  (
    'Étude marché tortillas Algérie',
    'Étude d''opportunité pour l''export tortillas vers le marché algérien.',
    '22222222-2222-2222-2222-222222222222', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P3', 'medium', 'assigned',
    now() + interval '30 days', null,
    20, null, null, null,
    '[{"label":"Rapport remis","done":false}]'::jsonb,
    0.18
  ),
  (
    'Formation HACCP équipe production',
    'Formation et certification HACCP pour 18 opérateurs.',
    '22222222-2222-2222-2222-222222222222', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b6666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'P2', 'simple', 'approved',
    now() - interval '10 days', now() - interval '12 days',
    15, 15,
    current_date - interval '30 days', current_date - interval '10 days',
    '[{"label":"Certificats remis","done":true}]'::jsonb,
    0.05
  );

-- ---------------------------------------------------------------------
-- 5. ALLOCATIONS WORKLOAD
-- ---------------------------------------------------------------------
insert into task_workload_allocations (user_id, workload_percent, start_date, end_date, accepted_by_user)
select owner_id, accepted_workload_percent,
       coalesce(workload_start_date, current_date),
       coalesce(workload_end_date, current_date + interval '30 days'),
       true
from tasks where accepted_workload_percent is not null;

-- ---------------------------------------------------------------------
-- 6. ALERTES IA DE DÉMO
-- ---------------------------------------------------------------------
insert into ai_alerts (alert_type, severity, title, message, related_user_id, recommendations) values
  ('workload_critical', 'critical',
   'Surcharge prolongée — Sami Khelifi',
   'Le collaborateur Sami Khelifi est à 168% de charge depuis 4 semaines.',
   'b4444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '["Réallouer une tâche P3 à un collègue moins chargé", "Reporter une tâche non critique", "Discussion 1-1 avec son manager"]'::jsonb),
  ('blocker_p1_long', 'critical',
   'Audit qualité Sfax bloqué depuis 5 jours',
   'Tâche P1 en blocage sans résolution. Escalade DG requise.',
   'b6666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '["Arbitrage DG immédiat", "Validation budget auditeur externe alternatif"]'::jsonb),
  ('not_accepted_long', 'warning',
   '2 tâches non acceptées depuis plus de 48h',
   'Le commitment chain est cassé. Action requise des owners.',
   null,
   '["Nudge automatique envoyé", "Si > 72h : escalade au chef de département"]'::jsonb);

-- =====================================================================
-- FIN SEED — Vous pouvez maintenant tester l'application
-- =====================================================================
