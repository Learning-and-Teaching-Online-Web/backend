import { Pool } from "pg";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL or DIRECT_URL found in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function fixEnum() {
  console.log("Checking class_requests table for ASSIGNED status...");
  
  const checkRes = await pool.query(`
    SELECT request_id, status::text 
    FROM class_requests 
    WHERE status::text = 'ASSIGNED';
  `);

  console.log(`Found ${checkRes.rows.length} rows with status 'ASSIGNED'.`);

  if (checkRes.rows.length > 0) {
    console.log("Updating 'ASSIGNED' status to 'OPEN'...");
    const updateRes = await pool.query(`
      UPDATE class_requests 
      SET status = 'OPEN'::"ClassRequestStatus"
      WHERE status::text = 'ASSIGNED';
    `);
    console.log(`Updated ${updateRes.rowCount} rows.`);
  }

  console.log("Enum values fix complete.");
}

fixEnum()
  .catch((err) => console.error("Fix failed:", err))
  .finally(() => pool.end());
