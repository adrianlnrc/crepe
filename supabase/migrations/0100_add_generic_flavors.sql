-- Dois flavors genéricos para pedidos personalizados
-- event_id: 550e8400-e29b-41d4-a716-446655440000

INSERT INTO flavors (id, event_id, name, category, tempo_medio_preparo, is_active, display_order)
VALUES
  ('f1000001-0000-0000-0000-000000000007', '550e8400-e29b-41d4-a716-446655440000', 'Doce Personalizado',    'doce',    300, true, 99),
  ('f1000001-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440000', 'Salgado Personalizado', 'salgado', 300, true, 99)
ON CONFLICT (id) DO NOTHING;
