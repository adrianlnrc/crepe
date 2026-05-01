-- 0099_seed_demo.sql
-- Dados de teste para desenvolvimento local

-- Desabilitar RLS temporariamente para seed (será re-habilitado)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE flavors DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions DISABLE ROW LEVEL SECURITY;

-- UUID fixo para evento de demo (para referência constante nos testes)
-- Demo do projeto acontece em: 2026-05-03 14:00:00 UTC
INSERT INTO events (id, name, slug, starts_at, ends_at, is_active, kitchen_code_hash, tempo_medio_preparo_global)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Aniversário da Maria',
  'aniversario-maria',
  '2026-05-03 14:00:00+00'::timestamptz,
  '2026-05-03 18:00:00+00'::timestamptz,
  true,
  '$2a$10$q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4q.N4', -- bcrypt('kitchen123')
  300  -- 5 minutos padrão
) ON CONFLICT DO NOTHING;

-- Sabores doces
INSERT INTO flavors (event_id, name, category, tempo_medio_preparo, is_active, display_order)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate com Morango', 'doce', 180, true, 1),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Banana com Nutella', 'doce', 180, true, 2),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Brigadeiro Gourmet', 'doce', 240, true, 3)
ON CONFLICT DO NOTHING;

-- Sabores salgados
INSERT INTO flavors (event_id, name, category, tempo_medio_preparo, is_active, display_order)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Frango com Catupiry', 'salgado', 200, true, 4),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Carne Seca com Queijo', 'salgado', 200, true, 5),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Cogumelo com Alho Poró', 'salgado', 220, true, 6)
ON CONFLICT DO NOTHING;

-- Ingredientes
INSERT INTO ingredients (event_id, name, is_active)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Morango', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Nutella', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Banana', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Leite Condensado', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Chocolate em Pó', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Frango', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Catupiry', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Carne Seca', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Queijo Meia Cura', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Cogumelo', true),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Alho Poró', true)
ON CONFLICT DO NOTHING;

-- Re-habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitions ENABLE ROW LEVEL SECURITY;
