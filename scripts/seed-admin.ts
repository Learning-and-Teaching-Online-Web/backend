import { userRepository } from '../src/repositories/user.repository';
import { passwordUtil } from '../src/utils/password.util';
import readline from 'readline';

async function createAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };

  try {
    console.log('=== TẠO TÀI KHOẢN ADMIN (NHẬP TAY) ===');
    const email = await question('Email admin: ');
    const password = await question('Mật khẩu: ');
    const fullName = await question('Họ và tên: ');
    const phone = await question('Số điện thoại (tùy chọn): ');
    const cccd = await question('Số CCCD (tùy chọn): ');

    if (!email || !password || !fullName) {
      console.error('❌ Email, Mật khẩu và Họ tên là bắt buộc.');
      rl.close();
      process.exit(1);
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      console.error('❌ Email này đã được sử dụng.');
      rl.close();
      process.exit(1);
    }

    const hashedPassword = await passwordUtil.hashPassword(password);
    const adminUser = await userRepository.createUser({
      email,
      password: hashedPassword,
      full_name: fullName,
      phone: phone || undefined,
      cccd: cccd || undefined,
      role: 'admin'
    });

    console.log('✅ Tạo tài khoản Admin thành công!', adminUser);
  } catch (error) {
    console.error('❌ Lỗi khi tạo Admin:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();
