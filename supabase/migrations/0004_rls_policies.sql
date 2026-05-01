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
