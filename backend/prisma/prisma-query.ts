import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Clear testing data
  await prisma.referral.deleteMany();
  await prisma.groupMessageCount.deleteMany();
  await prisma.dailyCheckin.deleteMany();
  await prisma.taskCompletion.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleared all referrals, message counts, check-ins, and users.');

  // 2. Update setting
  const updatedSetting = await prisma.setting.update({
    where: { key: 'channel_username' },
    data: { value: '@ANOAtoken' }
  });
  console.log(`Updated channel_username setting to: ${updatedSetting.value}`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
