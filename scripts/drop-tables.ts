import { prisma } from '../src/config/prisma';

async function dropTables() {
  console.log('--- Dropping unused online classroom tables ---');
  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS whiteboard_states CASCADE;
    DROP TABLE IF EXISTS session_recordings CASCADE;
    DROP TABLE IF EXISTS attendances CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS chat_rooms CASCADE;
    DROP TABLE IF EXISTS class_sessions CASCADE;
  `);
  console.log('--- Successfully dropped tables with CASCADE ---');
}

dropTables()
  .catch(console.error)
  .finally(() => process.exit(0));
