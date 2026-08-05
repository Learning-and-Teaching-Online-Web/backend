import { prisma } from '../src/config/prisma';

async function backfillTutorCodes() {
  console.log('--- Starting Backfill Tutor Codes ---');
  const tutors = await prisma.tutorProfile.findMany({
    where: {
      OR: [
        { tutor_code: null },
        { tutor_code: '' },
      ],
    },
  });

  console.log(`Found ${tutors.length} tutors without tutor_code.`);

  for (const tutor of tutors) {
    const generatedCode = `GS${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.tutorProfile.update({
      where: { tutor_id: tutor.tutor_id },
      data: { tutor_code: generatedCode },
    });
    console.log(`Updated tutor ${tutor.tutor_id} with tutor_code: ${generatedCode}`);
  }

  console.log('--- Backfill Complete ---');
}

backfillTutorCodes()
  .catch(console.error)
  .finally(() => process.exit(0));
