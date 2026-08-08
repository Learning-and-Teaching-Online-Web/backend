import { prisma } from '../src/config/prisma';

const defaultCategories = [
  {
    name: 'Mẹo học tập',
    slug: 'meo-hoc-tap',
    description: 'Phương pháp và kinh nghiệm học tập hiệu quả cho học sinh, sinh viên.',
    order_index: 1
  },
  {
    name: 'Bí quyết ôn thi',
    slug: 'bi-quyet-on-thi',
    description: 'Kỹ năng làm bài và bí quyết đạt điểm cao trong các kỳ thi chuyển cấp, THPT QG, IELTS...',
    order_index: 2
  },
  {
    name: 'Tin tức giáo dục',
    slug: 'tin-tuc-giao-duc',
    description: 'Cập nhật tin tức giáo dục, tuyển sinh và các chính sách mới.',
    order_index: 3
  },
  {
    name: 'Thông báo hệ thống',
    slug: 'thong-bao-he-thong',
    description: 'Các thông báo và tính năng cập nhật mới từ nền tảng gia sư.',
    order_index: 4
  },
  {
    name: 'Tư vấn hướng nghiệp',
    slug: 'tu-van-huong-nghiep',
    description: 'Định hướng nghề nghiệp, chọn ngành chọn trường cho học sinh.',
    order_index: 5
  }
];

async function seedArticleCategories() {
  console.log('🌱 Starting seed for ArticleCategories...');

  const categoryMap = new Map<string, string>();

  for (const cat of defaultCategories) {
    const upserted = await prisma.articleCategory.upsert({
      where: { name: cat.name },
      update: {
        slug: cat.slug,
        description: cat.description,
        order_index: cat.order_index
      },
      create: cat
    });

    categoryMap.set(upserted.name.toLowerCase().trim(), upserted.category_id);
    console.log(`✅ Seeded category: ${upserted.name} (${upserted.category_id})`);
  }

  // Backfill category_id on existing Article records
  const articles = await prisma.article.findMany({
    where: { category_id: null }
  });

  console.log(`🔍 Found ${articles.length} articles with null category_id. Updating...`);

  let defaultCategoryId = categoryMap.get('mẹo học tập') || Array.from(categoryMap.values())[0];

  for (const article of articles) {
    const rawCatName = (article.category || '').toLowerCase().trim();
    const matchedCategoryId = categoryMap.get(rawCatName) || defaultCategoryId;

    await prisma.article.update({
      where: { id: article.id },
      data: {
        category_id: matchedCategoryId,
        category: article.category || 'Mẹo học tập'
      }
    });
  }

  console.log('🎉 ArticleCategories seed and backfill completed successfully!');
}

seedArticleCategories()
  .catch((e) => {
    console.error('❌ Error seeding ArticleCategories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
