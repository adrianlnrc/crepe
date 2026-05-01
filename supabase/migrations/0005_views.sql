-- 0005_views.sql
-- Visões para simplificar queries e manter segurança

-- ============================================================
-- events_public: exposição segura de eventos sem kitchen_code_hash
-- ============================================================
CREATE VIEW events_public AS
SELECT
  id,
  name,
  slug,
  starts_at,
  ends_at,
  is_active,
  tempo_medio_preparo_global,
  created_at
FROM events
WHERE is_active = true;

-- ============================================================
-- orders_queue: fila FIFO processável (status, sequence, timestamps)
-- ============================================================
CREATE VIEW orders_queue AS
SELECT
  o.id,
  o.event_id,
  o.sequence_number,
  o.status,
  o.first_name,
  o.last_name,
  f.name as flavor_name,
  f.tempo_medio_preparo,
  o.observation,
  o.created_at,
  o.started_at,
  o.finished_at,
  -- Calcula posição na fila (0-indexed, null se não está pending/in_progress)
  CASE
    WHEN o.status IN ('pending', 'in_progress') THEN
      (SELECT COUNT(*) FROM orders o2
       WHERE o2.event_id = o.event_id
       AND o2.status IN ('pending', 'in_progress')
       AND (o2.sequence_number < o.sequence_number
            OR (o2.sequence_number = o.sequence_number AND o2.id < o.id)))
    ELSE NULL
  END as queue_position,
  -- Tempo estimado baseado em preparos (simplificado)
  CASE
    WHEN o.status IN ('pending', 'in_progress') AND f.tempo_medio_preparo > 0 THEN
      (SELECT COUNT(*) FROM orders o2
       WHERE o2.event_id = o.event_id
       AND o2.status IN ('pending', 'in_progress')
       AND (o2.sequence_number < o.sequence_number
            OR (o2.sequence_number = o.sequence_number AND o2.id < o.id))) * f.tempo_medio_preparo
    ELSE NULL
  END as estimated_wait_seconds
FROM orders o
LEFT JOIN flavors f ON f.id = o.flavor_id;

-- ============================================================
-- orders_history: pedidos finalizados para export/analytics
-- ============================================================
CREATE VIEW orders_history AS
SELECT
  o.id,
  o.event_id,
  o.sequence_number,
  o.first_name,
  o.last_name,
  f.name as flavor_name,
  o.status,
  o.created_at,
  o.started_at,
  o.finished_at,
  EXTRACT(EPOCH FROM (o.finished_at - o.started_at))::int as duration_seconds
FROM orders o
LEFT JOIN flavors f ON f.id = o.flavor_id
WHERE o.status IN ('done', 'cancelled')
ORDER BY o.finished_at DESC;
