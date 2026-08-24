import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD;

  if (!defaultPassword) {
    throw new Error('ADMIN_PASSWORD must be set before running the seed.');
  }
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: defaultUsername },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await prisma.admin.create({
      data: {
        username: defaultUsername,
        passwordHash,
      },
    });
    console.log(
      'Default admin created (username: admin, password: adminpassword)',
    );
  } else {
    console.log('Admin already exists');
  }

  const defaultSettings = [
    { key: 'min_messages_count', value: '5' },
    { key: 'min_stay_hours', value: '24' },
    { key: 'channel_username', value: '@ANOAtoken' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Default settings upserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
