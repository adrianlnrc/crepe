-- 0003_sequence_trigger.sql
-- Advisory lock para incrementar sequence_number sem gaps em inserts concorrentes

CREATE OR REPLACE FUNCTION generate_order_sequence_number()
RETURNS TRIGGER AS $$
DECLARE
  lock_id int;
  next_sequence int;
BEGIN
  -- Gera um lock_id derivado do event_id (primeiro 4 bytes da UUID como int)
  lock_id := (
    (get_byte(NEW.event_id::bytea, 0)::int << 24) +
    (get_byte(NEW.event_id::bytea, 1)::int << 16) +
    (get_byte(NEW.event_id::bytea, 2)::int << 8) +
    get_byte(NEW.event_id::bytea, 3)::int
  );

  -- Advisory lock (bloqueante, garante serialização)
  PERFORM pg_advisory_lock(lock_id);

  -- Pega o máximo sequence_number + 1
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_sequence
  FROM orders
  WHERE event_id = NEW.event_id;

  NEW.sequence_number := next_sequence;

  -- Release automático ao final da transação
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_generate_sequence
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_sequence_number();
