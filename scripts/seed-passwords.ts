import { prisma } from '../src/config/prisma';
import { passwordUtil } from '../src/utils/password.util';

async function main() {
  console.log('--- Đang quét các tài khoản chưa có mật khẩu mã hóa trong CSDL ---');

  const usersWithoutPassword = await (prisma.user as any).findMany({
    where: {
      password: null
    }
  });

  console.log(`Tìm thấy ${usersWithoutPassword.length} tài khoản chưa có mật khẩu.`);

  if (usersWithoutPassword.length === 0) {
    console.log('Tất cả tài khoản đều đã có mật khẩu mã hóa!');
    return;
  }

  const defaultPassword = '123456';
  const hashedPassword = await passwordUtil.hashPassword(defaultPassword);

  for (const user of usersWithoutPassword) {
    await (prisma.user as any).update({
      where: { user_id: user.user_id },
      data: { password: hashedPassword }
    });
    console.log(`✓ Đã cập nhật mật khẩu mặc định "${defaultPassword}" cho email: ${user.email}`);
  }

  console.log('--- Hoàn tất cập nhật mật khẩu cho tất cả tài khoản cũ! ---');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed mật khẩu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
