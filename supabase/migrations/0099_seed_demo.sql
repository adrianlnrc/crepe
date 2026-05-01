-- 0099_seed_demo.sql
-- Dados de teste para desenvolvimento local
-- Run only locally: não executar em produção

-- Desabilitar RLS temporariamente para seed
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE flavors DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Evento de demo
-- kitchen_code = "1234"  (hash gerado com bcrypt.hashSync('1234', 10))
-- ============================================================
INSERT INTO events (id, name, slug, starts_at, ends_at, is_active, kitchen_code_hash, tempo_medio_preparo_global)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Aniversário da Maria',
  'aniversario-maria',
  '2026-05-03 14:00:00+00'::timestamptz,
  '2026-05-03 22:00:00+00'::timestamptz,
  true,
  '$2a$10$a8qCoIzt8ugKJ.TqApajJ.k5Tc0uHxpSVw17.Ff5zdenFDK/wQSKm',
  300
) ON CONFLICT (id) DO UPDATE SET
  kitchen_code_hash = EXCLUDED.kitchen_code_hash,
  is_active = true;

-- ============================================================
-- Sabores doces
-- ============================================================
INSERT INTO flavors (id, event_id, name, category, tempo_medio_preparo, is_active, display_order)
VALUES
  ('f1000001-0000-0000-0000-000000000001'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate com Morango', 'doce', 180, true, 1),
  ('f1000001-0000-0000-0000-000000000002'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Banana com Nutella',   'doce', 180, true, 2),
  ('f1000001-0000-0000-0000-000000000003'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Brigadeiro Gourmet',   'doce', 240, true, 3),
  ('f1000001-0000-0000-0000-000000000004'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Frango com Catupiry',  'salgado', 200, true, 4),
  ('f1000001-0000-0000-0000-000000000005'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Carne Seca com Queijo','salgado', 200, true, 5),
  ('f1000001-0000-0000-0000-000000000006'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Cogumelo com Alho Poró','salgado', 220, true, 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Ingredientes
-- ============================================================
INSERT INTO ingredients (id, event_id, name, is_active)
VALUES
  ('e2000001-0000-0000-0000-000000000001'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Morango',          true),
  ('e2000001-0000-0000-0000-000000000002'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate',        true),
  ('e2000001-0000-0000-0000-000000000003'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Nutella',          true),
  ('e2000001-0000-0000-0000-000000000004'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Banana',           true),
  ('e2000001-0000-0000-0000-000000000005'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Leite Condensado', true),
  ('e2000001-0000-0000-0000-000000000006'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate em Pó',  true),
  ('e2000001-0000-0000-0000-000000000007'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Frango',           true),
  ('e2000001-0000-0000-0000-000000000008'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Catupiry',         true),
  ('e2000001-0000-0000-0000-000000000009'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Carne Seca',       true),
  ('e2000001-0000-0000-0000-000000000010'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Queijo Meia Cura', true),
  ('e2000001-0000-0000-0000-000000000011'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Cogumelo',         true),
  ('e2000001-0000-0000-0000-000000000012'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Alho Poró',        true),
  ('e2000001-0000-0000-0000-000000000013'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Creme de Leite',   true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Vínculos sabor → ingredientes (flavor_ingredients)
-- ============================================================

-- Chocolate com Morango: Morango, Chocolate, Leite Condensado
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000001'::uuid, 'e2000001-0000-0000-0000-000000000001'::uuid),
  ('f1000001-0000-0000-0000-000000000001'::uuid, 'e2000001-0000-0000-0000-000000000002'::uuid),
  ('f1000001-0000-0000-0000-000000000001'::uuid, 'e2000001-0000-0000-0000-000000000005'::uuid)
ON CONFLICT DO NOTHING;

-- Banana com Nutella: Banana, Nutella, Leite Condensado, Chocolate em Pó
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000002'::uuid, 'e2000001-0000-0000-0000-000000000004'::uuid),
  ('f1000001-0000-0000-0000-000000000002'::uuid, 'e2000001-0000-0000-0000-000000000003'::uuid),
  ('f1000001-0000-0000-0000-000000000002'::uuid, 'e2000001-0000-0000-0000-000000000005'::uuid),
  ('f1000001-0000-0000-0000-000000000002'::uuid, 'e2000001-0000-0000-0000-000000000006'::uuid)
ON CONFLICT DO NOTHING;

-- Brigadeiro Gourmet: Chocolate em Pó, Leite Condensado, Creme de Leite
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000003'::uuid, 'e2000001-0000-0000-0000-000000000006'::uuid),
  ('f1000001-0000-0000-0000-000000000003'::uuid, 'e2000001-0000-0000-0000-000000000005'::uuid),
  ('f1000001-0000-0000-0000-000000000003'::uuid, 'e2000001-0000-0000-0000-000000000013'::uuid)
ON CONFLICT DO NOTHING;

-- Frango com Catupiry: Frango, Catupiry, Creme de Leite
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000004'::uuid, 'e2000001-0000-0000-0000-000000000007'::uuid),
  ('f1000001-0000-0000-0000-000000000004'::uuid, 'e2000001-0000-0000-0000-000000000008'::uuid),
  ('f1000001-0000-0000-0000-000000000004'::uuid, 'e2000001-0000-0000-0000-000000000013'::uuid)
ON CONFLICT DO NOTHING;

-- Carne Seca com Queijo: Carne Seca, Queijo Meia Cura, Creme de Leite
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000005'::uuid, 'e2000001-0000-0000-0000-000000000009'::uuid),
  ('f1000001-0000-0000-0000-000000000005'::uuid, 'e2000001-0000-0000-0000-000000000010'::uuid),
  ('f1000001-0000-0000-0000-000000000005'::uuid, 'e2000001-0000-0000-0000-000000000013'::uuid)
ON CONFLICT DO NOTHING;

-- Cogumelo com Alho Poró: Cogumelo, Alho Poró, Queijo Meia Cura, Creme de Leite
INSERT INTO flavor_ingredients (flavor_id, ingredient_id) VALUES
  ('f1000001-0000-0000-0000-000000000006'::uuid, 'e2000001-0000-0000-0000-000000000011'::uuid),
  ('f1000001-0000-0000-0000-000000000006'::uuid, 'e2000001-0000-0000-0000-000000000012'::uuid),
  ('f1000001-0000-0000-0000-000000000006'::uuid, 'e2000001-0000-0000-0000-000000000010'::uuid),
  ('f1000001-0000-0000-0000-000000000006'::uuid, 'e2000001-0000-0000-0000-000000000013'::uuid)
ON CONFLICT DO NOTHING;

-- Re-habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions ENABLE ROW LEVEL SECURITY;
