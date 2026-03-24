const fs = require("fs");
const sql = fs.readFileSync("migrations/017_notifications.sql", "utf8");
const envContent = fs.readFileSync(".env.local", "utf8");

function getEnv(key) {
  const line = envContent.split("\n").find(l => l.startsWith(key + "="));
  if (!line) throw new Error("Missing " + key);
  return line.split("=").slice(1).join("=").replace(/"/g, "").trim();
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

// Split SQL into individual statements and execute via PostgREST
// We create a temporary RPC function to run arbitrary SQL
const setupFn = `
CREATE OR REPLACE FUNCTION _run_migration(sql_text text) RETURNS void AS $$
BEGIN EXECUTE sql_text; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

(async () => {
  // Step 1: Create the helper function
  const r1 = await fetch(supabaseUrl + "/rest/v1/rpc/_run_migration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": "Bearer " + serviceKey,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ sql_text: "SELECT 1" })
  });
  
  if (r1.status === 404) {
    console.log("_run_migration RPC not found. Please run the migration SQL manually in Supabase SQL Editor.");
    console.log("SQL to run:");
    console.log(sql);
    process.exit(0);
  }
  
  // Step 2: Execute the migration
  const r2 = await fetch(supabaseUrl + "/rest/v1/rpc/_run_migration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": "Bearer " + serviceKey,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ sql_text: sql })
  });
  
  if (r2.ok) {
    console.log("Migration 017 OK");
  } else {
    const body = await r2.text();
    console.log("Error:", r2.status, body);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
