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
