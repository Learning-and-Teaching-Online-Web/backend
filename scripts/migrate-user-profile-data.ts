import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function migrate() {
  console.log('🚀 Starting Data Migration: user_profiles -> student_profiles / tutor_profiles / admin_profiles...');
  
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL / DIRECT_URL is missing in environment variables.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. DDL: Ensure columns exist on student_profiles
    console.log('📦 Updating student_profiles table schema...');
    await client.query(`
      ALTER TABLE student_profiles
      ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT;
    `);

    // 2. DDL: Ensure columns exist on tutor_profiles
    console.log('📦 Updating tutor_profiles table schema...');
    await client.query(`
      ALTER TABLE tutor_profiles
      ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS gender TEXT;
    `);

    // 3. DDL: Create admin_profiles table if not exists
    console.log('📦 Creating admin_profiles table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_profiles (
        admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        full_name TEXT NOT NULL DEFAULT '',
        phone TEXT,
        avatar_url TEXT,
        date_of_birth DATE,
        gender TEXT,
        bio TEXT,
        cccd TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Data Transfer: Check if user_profiles table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      );
    `);

    const userProfilesExists = tableCheck.rows[0].exists;

    if (userProfilesExists) {
      console.log('🚚 Transferring data from user_profiles to student_profiles, tutor_profiles, admin_profiles...');
      
      const profilesRes = await client.query(`
        SELECT up.*, u.role 
        FROM user_profiles up
        JOIN users u ON up.user_id = u.user_id;
      `);

      console.log(`Found ${profilesRes.rows.length} user_profile records to migrate.`);

      for (const row of profilesRes.rows) {
        const { user_id, full_name, phone, avatar_url, date_of_birth, gender, bio, role } = row;
        const roleStr = String(role).toLowerCase();

        if (roleStr === 'student') {
          // Check student_profiles
          const exists = await client.query('SELECT student_id FROM student_profiles WHERE user_id = $1', [user_id]);
          if (exists.rows.length > 0) {
            await client.query(`
              UPDATE student_profiles
              SET full_name = COALESCE($1, full_name, ''),
                  phone = COALESCE($2, phone),
                  avatar_url = COALESCE($3, avatar_url),
                  date_of_birth = COALESCE($4, date_of_birth),
                  gender = COALESCE($5, gender),
                  bio = COALESCE($6, bio),
                  updated_at = NOW()
              WHERE user_id = $7;
            `, [full_name, phone, avatar_url, date_of_birth, gender, bio, user_id]);
          } else {
            await client.query(`
              INSERT INTO student_profiles (user_id, full_name, phone, avatar_url, date_of_birth, gender, bio)
              VALUES ($1, $2, $3, $4, $5, $6, $7);
            `, [user_id, full_name || '', phone, avatar_url, date_of_birth, gender, bio]);
          }
        } else if (roleStr === 'tutor') {
          // Check tutor_profiles
          const exists = await client.query('SELECT tutor_id FROM tutor_profiles WHERE user_id = $1', [user_id]);
          if (exists.rows.length > 0) {
            await client.query(`
              UPDATE tutor_profiles
              SET full_name = COALESCE($1, full_name, ''),
                  phone = COALESCE($2, phone),
                  avatar_url = COALESCE($3, avatar_url),
                  date_of_birth = COALESCE($4, date_of_birth),
                  gender = COALESCE($5, gender),
                  bio = COALESCE($6, bio),
                  updated_at = NOW()
              WHERE user_id = $7;
            `, [full_name, phone, avatar_url, date_of_birth, gender, bio, user_id]);
          } else {
            await client.query(`
              INSERT INTO tutor_profiles (user_id, full_name, phone, avatar_url, date_of_birth, gender, bio)
              VALUES ($1, $2, $3, $4, $5, $6, $7);
            `, [user_id, full_name || '', phone, avatar_url, date_of_birth, gender, bio]);
          }
        } else if (roleStr === 'admin') {
          // Check admin_profiles
          const exists = await client.query('SELECT admin_id FROM admin_profiles WHERE user_id = $1', [user_id]);
          if (exists.rows.length > 0) {
            await client.query(`
              UPDATE admin_profiles
              SET full_name = COALESCE($1, full_name, ''),
                  phone = COALESCE($2, phone),
                  avatar_url = COALESCE($3, avatar_url),
                  date_of_birth = COALESCE($4, date_of_birth),
                  gender = COALESCE($5, gender),
                  bio = COALESCE($6, bio),
                  updated_at = NOW()
              WHERE user_id = $7;
            `, [full_name, phone, avatar_url, date_of_birth, gender, bio, user_id]);
          } else {
            await client.query(`
              INSERT INTO admin_profiles (user_id, full_name, phone, avatar_url, date_of_birth, gender, bio)
              VALUES ($1, $2, $3, $4, $5, $6, $7);
            `, [user_id, full_name || '', phone, avatar_url, date_of_birth, gender, bio]);
          }
        }
      }

      console.log('🔥 Dropping old user_profiles table...');
      await client.query('DROP TABLE IF EXISTS user_profiles CASCADE;');
    } else {
      console.log('ℹ️ user_profiles table does not exist or was already dropped.');
    }

    // 5. Ensure all users have a profile created according to their role
    console.log('🔍 Checking for users missing profile records...');
    const usersWithoutProfile = await client.query(`
      SELECT u.user_id, u.email, u.role
      FROM users u
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id AND u.role = 'student'
      LEFT JOIN tutor_profiles tp ON u.user_id = tp.user_id AND u.role = 'tutor'
      LEFT JOIN admin_profiles ap ON u.user_id = ap.user_id AND u.role = 'admin'
      WHERE sp.student_id IS NULL AND tp.tutor_id IS NULL AND ap.admin_id IS NULL;
    `);

    for (const u of usersWithoutProfile.rows) {
      const defaultName = u.email ? u.email.split('@')[0] : 'User';
      const roleStr = String(u.role).toLowerCase();
      console.log(`Creating default ${roleStr} profile for user ${u.email} (${u.user_id})...`);
      
      if (roleStr === 'student') {
        await client.query(`
          INSERT INTO student_profiles (user_id, full_name)
          VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING;
        `, [u.user_id, defaultName]);
      } else if (roleStr === 'tutor') {
        await client.query(`
          INSERT INTO tutor_profiles (user_id, full_name)
          VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING;
        `, [u.user_id, defaultName]);
      } else if (roleStr === 'admin') {
        await client.query(`
          INSERT INTO admin_profiles (user_id, full_name)
          VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING;
        `, [u.user_id, defaultName]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
