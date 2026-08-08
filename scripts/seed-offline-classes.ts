import { prisma } from '../src/config/prisma';

async function seedOfflineData() {
  console.log('🌱 Seeding Offline Tutoring Reference Prices & Sample Classes...');

  // 1. Seed Reference Prices
  await (prisma as any).referencePrice.deleteMany();
  
  const referencePricesData = [
    // LỚP 1, 2, 3, 4
    { grade_group: 'LỚP 1, 2, 3, 4', sessions_per_week: 2, student_tutor_price: '600 - 700', teacher_tutor_price: '1100 - 1300' },
    { grade_group: 'LỚP 1, 2, 3, 4', sessions_per_week: 3, student_tutor_price: '900 - 1000', teacher_tutor_price: '1500 - 1800' },
    { grade_group: 'LỚP 1, 2, 3, 4', sessions_per_week: 4, student_tutor_price: '1100 - 1300', teacher_tutor_price: '1900 - 2300' },
    { grade_group: 'LỚP 1, 2, 3, 4', sessions_per_week: 5, student_tutor_price: '1400 - 1600', teacher_tutor_price: '2300 - 2800' },

    // LỚP 5, 6, 7, 8
    { grade_group: 'LỚP 5, 6, 7, 8', sessions_per_week: 2, student_tutor_price: '700 - 800', teacher_tutor_price: '1200 - 1500' },
    { grade_group: 'LỚP 5, 6, 7, 8', sessions_per_week: 3, student_tutor_price: '1000 - 1100', teacher_tutor_price: '1600 - 2100' },
    { grade_group: 'LỚP 5, 6, 7, 8', sessions_per_week: 4, student_tutor_price: '1300 - 1400', teacher_tutor_price: '2100 - 2700' },
    { grade_group: 'LỚP 5, 6, 7, 8', sessions_per_week: 5, student_tutor_price: '1500 - 1700', teacher_tutor_price: '2500 - 3300' },

    // LỚP 9, 10, 11, 12
    { grade_group: 'LỚP 9, 10, 11, 12', sessions_per_week: 2, student_tutor_price: '800 - 900', teacher_tutor_price: '1300 - 1600' },
    { grade_group: 'LỚP 9, 10, 11, 12', sessions_per_week: 3, student_tutor_price: '1100 - 1300', teacher_tutor_price: '1700 - 2300' },
    { grade_group: 'LỚP 9, 10, 11, 12', sessions_per_week: 4, student_tutor_price: '1400 - 1700', teacher_tutor_price: '2700 - 3100' },
    { grade_group: 'LỚP 9, 10, 11, 12', sessions_per_week: 5, student_tutor_price: '1700 - 1900', teacher_tutor_price: '3100 - 3800' },

    // LTDH - NGOẠI NGỮ
    { grade_group: 'LTDH - NGOẠI NGỮ', sessions_per_week: 2, student_tutor_price: '900 - 1300', teacher_tutor_price: '1400 - 2100' },
    { grade_group: 'LTDH - NGOẠI NGỮ', sessions_per_week: 3, student_tutor_price: '1200 - 2100', teacher_tutor_price: '2400 - 2600' },
    { grade_group: 'LTDH - NGOẠI NGỮ', sessions_per_week: 4, student_tutor_price: '1700 - 1900', teacher_tutor_price: '3100 - 3400' },
    { grade_group: 'LTDH - NGOẠI NGỮ', sessions_per_week: 5, student_tutor_price: '2100 - 2400', teacher_tutor_price: '3800 - 4300' },
  ];

  for (const item of referencePricesData) {
    await (prisma as any).referencePrice.create({ data: item });
  }

  console.log('✅ Reference prices seeded successfully.');

  // 2. Seed Sample Open Classes (matching Image 1 & 2)
  const sampleClasses = [
    {
      code: '89513',
      student_name: 'Phụ huynh em Nam',
      phone: '0974502420',
      address_detail: 'tỉnh lộ 43 - Bình Chiểu',
      district: 'Q.Thủ Đức',
      province: 'Hồ Chí Minh',
      grade_level: 'Lớp 9',
      subject_name: 'Tiếng Anh',
      num_students: 1,
      academic_level: 'Nam, học giỏi',
      sessions_per_week: 2,
      study_time: 'Dạy 120 phút/ buổi, các tối 18h-20 h',
      tutor_requirement: 'Nữ Sinh Viên',
      desired_price: 2000000,
      commission_rate: 35,
      status: 'OPEN' as const,
    },
    {
      code: '89507',
      student_name: 'Phụ huynh em Lan',
      phone: '0938708488',
      address_detail: 'Tân Kỳ Tân Quý',
      district: 'Q.Tân Phú',
      province: 'Hồ Chí Minh',
      grade_level: 'Lớp 10',
      subject_name: 'Toán',
      num_students: 1,
      academic_level: 'Căn bản',
      sessions_per_week: 3,
      study_time: 'Dạy 120 phút/buổi, T2,4,6 tối 18h',
      tutor_requirement: 'Nữ Sinh Viên',
      desired_price: 2640000,
      commission_rate: 35,
      status: 'OPEN' as const,
    },
    {
      code: '89511',
      student_name: 'Phụ huynh em Minh',
      phone: '0912345678',
      address_detail: 'Trần Tấn',
      district: 'Q.Thanh Khê',
      province: 'Đà Nẵng',
      grade_level: 'Lớp 6',
      subject_name: 'Tiếng Anh. Báo bài',
      num_students: 1,
      academic_level: 'Cần kèm báo bài hàng ngày',
      sessions_per_week: 5,
      study_time: 'Dạy 120 phút/buổi, T2 đến T6 19h',
      tutor_requirement: 'Nữ Sinh Viên',
      desired_price: 5000000,
      commission_rate: 30,
      status: 'OPEN' as const,
    },
    {
      code: '89510',
      student_name: 'Phụ huynh em Đức',
      phone: '0987654321',
      address_detail: 'Lê Đức Thọ - P 15',
      district: 'Q.Gò Vấp',
      province: 'Hồ Chí Minh',
      grade_level: 'Lớp 11',
      subject_name: 'Tiếng Anh',
      num_students: 1,
      academic_level: 'Khá',
      sessions_per_week: 2,
      study_time: 'Dạy 90 phút/buổi, T7, CN rảnh',
      tutor_requirement: 'Nữ Giáo Viên',
      desired_price: 2800000,
      commission_rate: 35,
      status: 'OPEN' as const,
    },
  ];

  for (const item of sampleClasses) {
    await (prisma as any).classRequest.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  console.log('✅ Sample open classes seeded successfully.');
}

seedOfflineData()
  .catch((e) => {
    console.error('❌ Lỗi khi seed offline classes:', e);
  })
  .finally(async () => {
    await (prisma as any).$disconnect?.();
  });
