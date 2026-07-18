import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import { ReferralService } from '../src/referral/referral.service';
import { SettingsService } from '../src/settings/settings.service';
import { ConfigService } from '@nestjs/config';

async function runTest() {
  console.log('--- STARTING PROGRAMMATIC INTEGRATION TEST ---');
  
  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  await prisma.onModuleInit();

  // Clear previous test records to ensure clean state
  await prisma.referral.deleteMany({
    where: {
      OR: [
        { inviter: { telegramId: 1111n } },
        { invitee: { telegramId: 2222n } }
      ]
    }
  });
  await prisma.groupMessageCount.deleteMany({
    where: {
      user: {
        telegramId: { in: [1111n, 2222n] }
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      telegramId: { in: [1111n, 2222n] }
    }
  });

  const settingsService = new SettingsService(prisma);
  const referralService = new ReferralService(prisma, settingsService, configService);

  // 1. Register Inviter
  console.log('1. Registering Inviter (Telegram ID: 1111)...');
  const { user: inviter } = await referralService.registerUser(
    1111n,
    'inviter_username',
    'InviterFirst',
    'InviterLast'
  );
  console.log(`Inviter registered with Referral Code: ${inviter.referralCode}`);

  // 2. Register Invitee using Inviter's code
  console.log(`2. Registering Invitee (Telegram ID: 2222) with referral code: ${inviter.referralCode}...`);
  const { user: invitee } = await referralService.registerUser(
    2222n,
    'invitee_username',
    'InviteeFirst',
    'InviteeLast',
    inviter.referralCode
  );

  // 3. Verify PENDING referral was created
  const referral = await prisma.referral.findUnique({
    where: { inviteeId: invitee.id }
  });

  if (referral && referral.status === 'PENDING') {
    console.log('✅ Success: Referral record created with PENDING status!');
  } else {
    throw new Error('Failed: Referral record not found or status not PENDING.');
  }

  // 4. Record messages for invitee (we need at least 5 messages for default validation)
  console.log('4. Recording 6 group messages for invitee...');
  for (let i = 0; i < 6; i++) {
    await referralService.recordMessage(2222n, '-100222222222');
  }

  const msgCountObj = await prisma.groupMessageCount.findUnique({
    where: {
      userId_chatId: {
        userId: invitee.id,
        chatId: '-100222222222'
      }
    }
  });
  console.log(`Recorded messages count in DB: ${msgCountObj?.messageCount}`);
  if (msgCountObj && msgCountObj.messageCount === 6) {
    console.log('✅ Success: Message counts successfully tracked!');
  } else {
    throw new Error('Failed: Message count mismatch.');
  }

  // 5. Try validating immediately (should fail because stay duration < 24 hours)
  console.log('5. Running validation check immediately...');
  await referralService.validatePendingReferrals();
  
  const checkFail = await prisma.referral.findUnique({
    where: { id: referral.id }
  });
  console.log(`Referral status after immediate check: ${checkFail?.status}`);
  console.log(`Referral fail reason: ${checkFail?.failReason}`);
  if (checkFail?.status === 'PENDING' && checkFail.failReason?.includes('Stay duration insufficient')) {
    console.log('✅ Success: Correctly held PENDING due to insufficient stay duration.');
  } else {
    throw new Error('Failed: Did not correctly block for stay duration.');
  }

  // 6. Simulate stay duration by changing joinedAt to 25 hours ago
  console.log('6. Mocking join date to 25 hours ago...');
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 25);
  await prisma.referral.update({
    where: { id: referral.id },
    data: { joinedAt: yesterday }
  });

  // 7. Run validation check again
  console.log('7. Re-running validation check...');
  await referralService.validatePendingReferrals();

  const checkSuccess = await prisma.referral.findUnique({
    where: { id: referral.id }
  });
  console.log(`Final referral status: ${checkSuccess?.status}`);
  if (checkSuccess?.status === 'VALID') {
    console.log('✅ Success: Referral successfully validated!');
  } else {
    throw new Error(`Failed: Referral status remains ${checkSuccess?.status} with reason: ${checkSuccess?.failReason}`);
  }

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  await prisma.onModuleDestroy();
}

runTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
