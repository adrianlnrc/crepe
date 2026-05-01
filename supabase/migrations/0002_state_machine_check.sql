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
