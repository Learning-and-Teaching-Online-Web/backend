import { prisma } from '../src/config/prisma';

const INITIAL_SUBJECTS = [
  { name: 'Toán học', code: 'MATH' },
  { name: 'Vật lý', code: 'PHYS' },
  { name: 'Hóa học', code: 'CHEM' },
  { name: 'Tiếng Anh', code: 'ENG' },
  { name: 'Văn học', code: 'LIT' },
  { name: 'Sinh học', code: 'BIO' },
  { name: 'Lịch sử', code: 'HIST' },
  { name: 'Địa lý', code: 'GEO' },
  { name: 'Tin học', code: 'CS' }
];

async function seedSubjects() {
  console.log('🚀 Bắt đầu khởi tạo dữ liệu môn học (Subjects)...');

  const createdSubjects: Record<string, string> = {};

  for (const item of INITIAL_SUBJECTS) {
    const subject = await (prisma as any).subject.upsert({
      where: { name: item.name },
      update: {
        code: item.code,
        is_active: true
      },
      create: {
        name: item.name,
        code: item.code,
        is_active: true
      }
    });

    createdSubjects[item.name.toLowerCase()] = subject.subject_id;
    console.log(`  ✅ Môn học: ${subject.name} (${subject.code}) - ID: ${subject.subject_id}`);
  }

  console.log('\n🔄 Đang cập nhật subject_id cho các khóa học hiện có...');

  const courses = await (prisma as any).course.findMany();
  let updatedCount = 0;

  for (const course of courses) {
    if (!course.subject) continue;
    
    const subjectStr = course.subject.trim().toLowerCase();
    let targetSubjectId: string | null = null;

    // Matching subject string with database subject names
    for (const [nameKey, id] of Object.entries(createdSubjects)) {
      if (subjectStr.includes(nameKey) || nameKey.includes(subjectStr)) {
        targetSubjectId = id;
        break;
      }
    }

    // Default fallback to Toán học if no match found
    if (!targetSubjectId && createdSubjects['toán học']) {
      targetSubjectId = createdSubjects['toán học'];
    }

    if (targetSubjectId) {
      await (prisma as any).course.update({
        where: { course_id: course.course_id },
        data: { subject_id: targetSubjectId }
      });
      updatedCount++;
    }
  }

  console.log(`🎉 Đã cập nhật thành công subject_id cho ${updatedCount}/${courses.length} khóa học.`);
}

seedSubjects()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu subjects:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
