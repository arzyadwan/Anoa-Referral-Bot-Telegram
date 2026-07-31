import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  const referrals = await prisma.referral.findMany();
  const settings = await prisma.setting.findMany();

  console.log('--- USERS IN DB ---');
  console.log(users.map(u => ({ id: u.id, telegramId: u.telegramId.toString(), username: u.username, referralCode: u.referralCode, inviteLink: u.inviteLink, invitedById: u.invitedById })));
  
  console.log('--- REFERRALS IN DB ---');
  console.log(referrals);

  console.log('--- SETTINGS IN DB ---');
  console.log(settings);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
