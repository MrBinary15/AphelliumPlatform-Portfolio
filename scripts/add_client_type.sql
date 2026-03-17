-- Add client_type column to proyectos table
-- Values: 'propio' (empresa propia), 'un_cliente' (un cliente), 'varios_clientes' (varios clientes)
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS client_type text DEFAULT NULL;
