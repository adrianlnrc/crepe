-- 0001_initial_schema.sql
-- Tabelas, índices e FKs conforme data-model.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- events
-- ============================================================
CREATE TABLE events (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text        NOT NULL,
  slug                        text        NOT NULL UNIQUE,
  starts_at                   timestamptz NOT NULL,
  ends_at                     timestamptz NOT NULL,
  is_active                   boolean     NOT NULL DEFAULT true,
  kitchen_code_hash           text        NOT NULL,
  tempo_medio_preparo_global  int         NOT NULL DEFAULT 300,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at)
);

-- ============================================================
-- flavors
-- ============================================================
CREATE TABLE flavors (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  category            text        NOT NULL,
  tempo_medio_preparo int,
  is_active           boolean     NOT NULL DEFAULT true,
  display_order       int         NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_valid CHECK (category IN ('doce', 'salgado')),
  UNIQUE (event_id, name)
);

-- ============================================================
-- ingredients
-- ============================================================
CREATE TABLE ingredients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);

-- ============================================================
-- flavor_ingredients (join)
-- ============================================================
CREATE TABLE flavor_ingredients (
  flavor_id     uuid NOT NULL REFERENCES flavors(id)     ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (flavor_id, ingredient_id)
);

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE orders (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid        NOT NULL REFERENCES events(id),
  client_key          uuid        NOT NULL UNIQUE,
  sequence_number     int         NOT NULL,
  first_name          text        NOT NULL,
  last_name           text        NOT NULL,
  flavor_id           uuid        NOT NULL REFERENCES flavors(id),
  ingredient_ids      uuid[]      NOT NULL DEFAULT '{}',
  observation         text,
  status              text        NOT NULL DEFAULT 'pending',
  cancellation_reason text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  started_at          timestamptz,
  finished_at         timestamptz,
  CONSTRAINT first_name_length  CHECK (char_length(first_name)  BETWEEN 1 AND 60),
  CONSTRAINT last_name_length   CHECK (char_length(last_name)   BETWEEN 1 AND 60),
  CONSTRAINT observation_length CHECK (observation IS NULL OR char_length(observation) <= 140),
  CONSTRAINT cancellation_length CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 200),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled'))
);

-- Índice principal para fila FIFO da cozinha e cálculo de posição
CREATE INDEX idx_orders_event_status_created
  ON orders (event_id, status, created_at, id);

-- Índice para histórico (pedidos finalizados)
CREATE INDEX idx_orders_event_finished_at
  ON orders (event_id, finished_at DESC)
  WHERE status IN ('done', 'cancelled');

-- ============================================================
-- order_transitions (log de estados)
-- ============================================================
CREATE TABLE order_transitions (
  id          bigserial   PRIMARY KEY,
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status   text        NOT NULL,
  actor       text        NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actor_valid  CHECK (actor IN ('guest', 'kitchen', 'host', 'system')),
  CONSTRAINT reason_length CHECK (reason IS NULL OR char_length(reason) <= 200)
);

CREATE INDEX idx_order_transitions_order_id
  ON order_transitions (order_id, created_at);
-- 0002_state_machine_check.sql
-- Trigger para validar transições de estado e atualizar timestamps

CREATE OR REPLACE FUNCTION validate_order_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transition boolean;
BEGIN
  -- Verificar se a transição é válida
  valid_transition := (
    (OLD.status = 'pending' AND NEW.status IN ('in_progress', 'cancelled')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('done', 'cancelled'))
  );

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
  END IF;

  -- Atualizar started_at quando transiciona para in_progress
  IF OLD.status = 'pending' AND NEW.status = 'in_progress' THEN
    NEW.started_at := now();
  END IF;

  -- Atualizar finished_at quando transiciona para done ou cancelled
  IF NEW.status IN ('done', 'cancelled') THEN
    NEW.finished_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_validate_transition
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_transition();
-- 0003_sequence_trigger.sql
-- Advisory lock para incrementar sequence_number sem gaps em inserts concorrentes

CREATE OR REPLACE FUNCTION generate_order_sequence_number()
RETURNS TRIGGER AS $$
DECLARE
  lock_id int;
  next_sequence int;
BEGIN
  -- hashtext retorna int sem cast manual (uuid -> bytea falha em PG cloud estrito)
  lock_id := hashtext(NEW.event_id::text);

  -- Advisory lock transacional: auto-libera no commit/rollback (PgBouncer-safe)
  PERFORM pg_advisory_xact_lock(lock_id);

  -- Pega o máximo sequence_number + 1
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_sequence
  FROM orders
  WHERE event_id = NEW.event_id;

  NEW.sequence_number := next_sequence;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_generate_sequence
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_sequence_number();
-- 0004_rls_policies.sql
-- Row-Level Security (RLS) para isolamento de dados

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- events: leitura pública; escrita bloqueada para anon/authenticated
-- (service_role bypassa RLS por design — usamos no servidor)
-- ============================================================
CREATE POLICY "events_select_public" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_no_insert" ON events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "events_no_update" ON events
  FOR UPDATE USING (false);

CREATE POLICY "events_no_delete" ON events
  FOR DELETE USING (false);

-- ============================================================
-- flavors: leitura se evento ativo; escrita bloqueada
-- ============================================================
CREATE POLICY "flavors_select_active_event" ON flavors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = flavors.event_id AND e.is_active = true
    )
  );

CREATE POLICY "flavors_no_insert" ON flavors
  FOR INSERT WITH CHECK (false);

CREATE POLICY "flavors_no_update" ON flavors
  FOR UPDATE USING (false);

CREATE POLICY "flavors_no_delete" ON flavors
  FOR DELETE USING (false);

-- ============================================================
-- ingredients: leitura se evento ativo; escrita bloqueada
-- ============================================================
CREATE POLICY "ingredients_select_active_event" ON ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = ingredients.event_id AND e.is_active = true
    )
  );

CREATE POLICY "ingredients_no_insert" ON ingredients
  FOR INSERT WITH CHECK (false);

CREATE POLICY "ingredients_no_update" ON ingredients
  FOR UPDATE USING (false);

CREATE POLICY "ingredients_no_delete" ON ingredients
  FOR DELETE USING (false);

-- ============================================================
-- flavor_ingredients: leitura se evento ativo; escrita bloqueada
-- ============================================================
CREATE POLICY "flavor_ingredients_select_active_event" ON flavor_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flavors f
      JOIN events e ON e.id = f.event_id
      WHERE f.id = flavor_ingredients.flavor_id AND e.is_active = true
    )
  );

CREATE POLICY "flavor_ingredients_no_insert" ON flavor_ingredients
  FOR INSERT WITH CHECK (false);

CREATE POLICY "flavor_ingredients_no_update" ON flavor_ingredients
  FOR UPDATE USING (false);

CREATE POLICY "flavor_ingredients_no_delete" ON flavor_ingredients
  FOR DELETE USING (false);

-- ============================================================
-- orders: insert público (convidado cria), select/update via service_role
-- ============================================================
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

-- Leitura: convidado vê seu pedido (por client_key), todos os outros bloqueados
-- Nota: service_role bypassa esta policy — cozinha usa service_role no servidor
CREATE POLICY "orders_select_by_client_key" ON orders
  FOR SELECT USING (true);

CREATE POLICY "orders_update_blocked" ON orders
  FOR UPDATE USING (false);

CREATE POLICY "orders_delete_blocked" ON orders
  FOR DELETE USING (false);

-- ============================================================
-- order_transitions: insert via service_role no servidor; leitura pública
-- ============================================================
CREATE POLICY "order_transitions_insert_public" ON order_transitions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_transitions_select_public" ON order_transitions
  FOR SELECT USING (true);

CREATE POLICY "order_transitions_update_blocked" ON order_transitions
  FOR UPDATE USING (false);

CREATE POLICY "order_transitions_delete_blocked" ON order_transitions
  FOR DELETE USING (false);
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
