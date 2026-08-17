import { prisma } from '../src/config/prisma';

async function main() {
  const cls = await (prisma as any).classRequest.findFirst({
    where: { class_code: '88682' },
    include: {
      payments: true,
      applications: true,
    },
  });

  console.log('--- CLASS 88682 ---');
  console.log('Class status:', cls?.status);
  console.log('Class request_id:', cls?.request_id);

  if (cls?.payments) {
    for (const p of cls.payments) {
      console.log('--- PAYMENT ---');
      console.log('Type:', p.type, 'Status:', p.status, 'RequiredAmt:', p.required_amount, 'PaidAmt:', p.paid_amount, 'PayerUserId:', p.payer_user_id);
      if (p.payer_user_id) {
        const wallet = await (prisma as any).wallet.findUnique({
          where: { user_id: p.payer_user_id },
        });
        console.log(`Wallet for user ${p.payer_user_id}:`, wallet);
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
