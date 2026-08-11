import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL or DIRECT_URL found in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function backup() {
  console.log("Starting full database raw JSON backup...");
  
  // Get all table names in public schema
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map((r: { table_name: string }) => r.table_name);
  console.log(`Found ${tables.length} tables:`, tables);

  const fullBackup: Record<string, any[]> = {};
  const backupDir = path.resolve(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT * FROM "${table}"`);
      fullBackup[table] = res.rows;
      console.log(`  Table '${table}': ${res.rows.length} rows exported.`);
    } catch (err: any) {
      console.error(`  Error exporting '${table}':`, err.message);
    }
  }

  const timestamp = Date.now();
  const filePath = path.join(backupDir, `db_full_backup_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2), "utf-8");

  console.log(`\n✅ Full database backup completed! Saved to: ${filePath}`);
}

backup()
  .catch((err) => console.error("Backup failed:", err))
  .finally(() => pool.end());
