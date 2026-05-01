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
