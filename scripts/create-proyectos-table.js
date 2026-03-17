const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("No DATABASE_URL found in .env.local");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected!");

  const check = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proyectos')"
  );
  console.log("Table exists:", check.rows[0].exists);

  if (!check.rows[0].exists) {
    const sql = `
      CREATE TABLE public.proyectos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        excerpt TEXT,
        description TEXT,
        category TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'paused')),
        img_url TEXT,
        client_name TEXT,
        location TEXT,
        start_date DATE,
        end_date DATE,
        metrics JSONB DEFAULT '[]'::jsonb,
        gallery TEXT[] DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        featured BOOLEAN DEFAULT false,
        title_es TEXT,
        title_en TEXT,
        excerpt_es TEXT,
        excerpt_en TEXT,
        description_es TEXT,
        description_en TEXT,
        category_es TEXT,
        category_en TEXT,
        author_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Public read access" ON public.proyectos
        FOR SELECT USING (true);

      CREATE POLICY "Authenticated users can manage" ON public.proyectos
        FOR ALL USING (auth.role() = 'authenticated');

      CREATE INDEX idx_proyectos_status ON public.proyectos(status);
      CREATE INDEX idx_proyectos_category ON public.proyectos(category);
      CREATE INDEX idx_proyectos_featured ON public.proyectos(featured);
    `;

    await client.query(sql);
    console.log("Table proyectos created successfully!");

    // Create update_updated_at function if not exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER set_proyectos_updated_at
        BEFORE UPDATE ON public.proyectos
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("Trigger created!");
  } else {
    console.log("Table already exists, skipping creation.");
  }

  // Verify
  const cols = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'proyectos' ORDER BY ordinal_position"
  );
  console.log("\nTable columns:");
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  await client.end();
  console.log("\nDone!");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
