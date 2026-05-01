-- 0004_rls_policies.sql
-- Row-Level Security (RLS) para isolamento de dados

-- Habilitar RLS em todas as tabelas
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- events: público (leitura, sem insert/update/delete)
-- ============================================================
CREATE POLICY "events_select_public" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_no_write" ON events
  FOR INSERT, UPDATE, DELETE WITH CHECK (false);

-- ============================================================
-- flavors: leitura se event é ativo, sem write
-- ============================================================
CREATE POLICY "flavors_select_active_event" ON flavors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = flavors.event_id AND e.is_active = true
    )
  );

CREATE POLICY "flavors_no_write" ON flavors
  FOR INSERT, UPDATE, DELETE WITH CHECK (false);

-- ============================================================
-- ingredients: leitura se event é ativo, sem write
-- ============================================================
CREATE POLICY "ingredients_select_active_event" ON ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = ingredients.event_id AND e.is_active = true
    )
  );

CREATE POLICY "ingredients_no_write" ON ingredients
  FOR INSERT, UPDATE, DELETE WITH CHECK (false);

-- ============================================================
-- flavor_ingredients: leitura se event é ativo, sem write
-- ============================================================
CREATE POLICY "flavor_ingredients_select_active_event" ON flavor_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flavors f
      JOIN events e ON e.id = f.event_id
      WHERE f.id = flavor_ingredients.flavor_id AND e.is_active = true
    )
  );

CREATE POLICY "flavor_ingredients_no_write" ON flavor_ingredients
  FOR INSERT, UPDATE, DELETE WITH CHECK (false);

-- ============================================================
-- orders: clientes veem seu próprio pedido, cozinha vê todos
-- ============================================================
CREATE POLICY "orders_insert_guest" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_select_guest" ON orders
  FOR SELECT USING (
    -- Convidado vê seu próprio pedido pelo client_key
    current_setting('request.headers')::json->>'x-client-key' = client_key::text
    OR
    -- Cozinha autenticada (header x-kitchen-session-id presente)
    current_setting('request.headers')::json->>'x-kitchen-session-id' IS NOT NULL
  );

CREATE POLICY "orders_update_kitchen_only" ON orders
  FOR UPDATE USING (
    current_setting('request.headers')::json->>'x-kitchen-session-id' IS NOT NULL
  )
  WITH CHECK (
    current_setting('request.headers')::json->>'x-kitchen-session-id' IS NOT NULL
  );

-- ============================================================
-- order_transitions: guests veem seu próprio, kitchen vê todos
-- ============================================================
CREATE POLICY "order_transitions_insert" ON order_transitions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_transitions_select" ON order_transitions
  FOR SELECT USING (
    -- Convidado vê transições do seu pedido
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_transitions.order_id
      AND o.client_key::text = current_setting('request.headers')::json->>'x-client-key'
    )
    OR
    -- Cozinha autenticada
    current_setting('request.headers')::json->>'x-kitchen-session-id' IS NOT NULL
  );
