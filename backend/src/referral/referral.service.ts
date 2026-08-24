import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SettingsService } from '../settings/settings.service';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private bot: Telegraf | null = null;

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private configService: ConfigService,
  ) {}

  // We set the bot instance dynamically to avoid circular dependencies
  setBotInstance(bot: Telegraf) {
    this.bot = bot;
  }

  // Generate a random 8-character alphanumeric referral code
  generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Register a new user and potentially link them as a referral invitee
  async registerUser(
    telegramId: bigint,
    username?: string,
    firstName?: string,
    lastName?: string,
    startPayload?: string,
  ) {
    // 1. Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      return { user, isNew: false };
    }

    // 2. If new user, handle referral logic if startPayload is present
    let invitedById: number | null = null;
    let referralCode = this.generateReferralCode();

    // Ensure referral code is unique
    while (await this.prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = this.generateReferralCode();
    }

    if (startPayload) {
      const inviter = await this.prisma.user.findUnique({
        where: { referralCode: startPayload.trim().toUpperCase() },
      });

      // Avoid self-referral
      if (inviter && inviter.telegramId !== telegramId) {
        invitedById = inviter.id;
      }
    }

    // 3. Create the user
    user = await this.prisma.user.create({
      data: {
        telegramId,
        username,
        firstName,
        lastName,
        referralCode,
        invitedById,
      },
    });

    // 4. Create a pending referral record
    if (invitedById) {
      await this.prisma.referral.create({
        data: {
          inviterId: invitedById,
          inviteeId: user.id,
          status: 'PENDING',
        },
      });
      this.logger.log(
        `Created PENDING referral: Inviter ID ${invitedById} -> Invitee ID ${user.id}`,
      );
    }

    return { user, isNew: true };
  }

  async registerReferralViaLink(
    telegramId: bigint,
    inviteLink: string,
    username?: string,
    firstName?: string,
    lastName?: string,
  ) {
    // 1. Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    // 2. Look up the inviter who owns this inviteLink
    const inviter = await this.prisma.user.findUnique({
      where: { inviteLink },
    });

    if (!inviter) {
      this.logger.warn(`No inviter found for invite link: ${inviteLink}`);
      return;
    }

    // Avoid self-referral
    if (inviter.telegramId === telegramId) {
      this.logger.log(
        `User ${telegramId} attempted self-referral via link, ignoring.`,
      );
      return;
    }

    if (user) {
      // If user exists and already has an inviter, do nothing
      if (user.invitedById) {
        this.logger.log(
          `User ${telegramId} already has an inviter, ignoring referral join.`,
        );
        return;
      }

      // If user exists but has no inviter, link them now!
      await this.prisma.user.update({
        where: { id: user.id },
        data: { invitedById: inviter.id },
      });

      // Create the referral relation
      await this.prisma.referral.create({
        data: {
          inviterId: inviter.id,
          inviteeId: user.id,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `Linked existing user ${telegramId} to inviter ${inviter.id} via invite link`,
      );
      return;
    }

    let referralCode = this.generateReferralCode();
    while (await this.prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = this.generateReferralCode();
    }

    // 3. Create the invitee user
    user = await this.prisma.user.create({
      data: {
        telegramId,
        username,
        firstName,
        lastName,
        referralCode,
        invitedById: inviter.id,
      },
    });

    // 4. Create the referral relation
    await this.prisma.referral.create({
      data: {
        inviterId: inviter.id,
        inviteeId: user.id,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Created PENDING referral via Direct Link: Inviter ID ${inviter.id} -> Invitee ID ${user.id}`,
    );
  }

  // Record a group chat message to track activity
  async recordMessage(telegramId: bigint, chatId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) return;

    await this.prisma.groupMessageCount.upsert({
      where: {
        userId_chatId: {
          userId: user.id,
          chatId: String(chatId),
        },
      },
      update: {
        messageCount: { increment: 1 },
      },
      create: {
        userId: user.id,
        chatId: String(chatId),
        messageCount: 1,
      },
    });
  }

  // Record daily check-in
  async recordDailyCheckin(
    telegramId: bigint,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.dailyCheckin.create({
        data: {
          userId: user.id,
          checkinDate: today,
        },
      });
      return { success: true, message: 'Daily check-in successful!' };
    } catch {
      return { success: false, message: 'You have already checked in today.' };
    }
  }

  // Core validation loop
  async validatePendingReferrals() {
    this.logger.log('Starting validation of pending referrals...');
    const pendingReferrals = await this.prisma.referral.findMany({
      where: { status: 'PENDING' },
      include: {
        inviter: true,
        invitee: true,
      },
    });

    if (pendingReferrals.length === 0) {
      this.logger.log('No pending referrals to validate.');
      return;
    }

    const channelUsername = await this.settingsService.getChannelUsername();
    const minMessages = await this.settingsService.getMinMessagesCount();
    const minStayHours = await this.settingsService.getMinStayHours();

    for (const ref of pendingReferrals) {
      try {
        const invitee = ref.invitee;

        // 1. Check Channel/Group Membership
        let isMember = false;
        if (this.bot && channelUsername) {
          try {
            const chatMember = await this.bot.telegram.getChatMember(
              channelUsername,
              Number(invitee.telegramId),
            );
            const status = chatMember.status;
            isMember = ['member', 'administrator', 'creator'].includes(status);
          } catch (err) {
            this.logger.warn(
              `Failed to check chat member status for user ${invitee.telegramId} in ${channelUsername}: ${getErrorMessage(err)}`,
            );
            // If checking fails, keep pending
            continue;
          }
        } else {
          // If bot or channel username is not configured, skip membership check (assume true)
          isMember = true;
        }

        if (!isMember) {
          await this.prisma.referral.update({
            where: { id: ref.id },
            data: {
              failReason: `User is not a member of required channel ${channelUsername}`,
            },
          });
          continue;
        }

        // 2. Check Stay Duration
        const now = new Date();
        const diffMs = now.getTime() - ref.joinedAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < minStayHours) {
          await this.prisma.referral.update({
            where: { id: ref.id },
            data: {
              failReason: `Stay duration insufficient. ${diffHours.toFixed(1)}/${minStayHours} hours`,
            },
          });
          continue;
        }

        // 3. Check Message Count
        // Sum messages across all groups for this user
        const messageCountSum = await this.prisma.groupMessageCount.aggregate({
          where: { userId: invitee.id },
          _sum: {
            messageCount: true,
          },
        });

        const totalMessages = messageCountSum._sum.messageCount || 0;

        if (totalMessages < minMessages) {
          await this.prisma.referral.update({
            where: { id: ref.id },
            data: {
              failReason: `Message count insufficient. ${totalMessages}/${minMessages} messages`,
            },
          });
          continue;
        }

        // 4. All rules passed! Validate the referral!
        await this.prisma.referral.update({
          where: { id: ref.id },
          data: {
            status: 'VALID',
            failReason: null,
            validatedAt: new Date(),
          },
        });

        this.logger.log(
          `Referral VALIDATED: Inviter ${ref.inviter.username || ref.inviter.telegramId} <- Invitee ${invitee.username || invitee.telegramId}`,
        );

        // Notify inviter via bot if available
        if (this.bot) {
          try {
            await this.bot.telegram.sendMessage(
              Number(ref.inviter.telegramId),
              `🎉 Selamat! Rujukan Anda untuk @${invitee.username || invitee.firstName || 'user'} telah divalidasi dan sekarang berstatus VALID.`,
            );
          } catch (error) {
            this.logger.warn(
              `Could not notify inviter ${ref.inviter.telegramId}: ${getErrorMessage(error)}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error validating referral ID ${ref.id}: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  // Get personal stats
  async getUserStats(telegramId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) return null;

    const referrals = await this.prisma.referral.findMany({
      where: { inviterId: user.id },
    });

    const valid = referrals.filter((r) => r.status === 'VALID').length;
    const pending = referrals.filter((r) => r.status === 'PENDING').length;
    const invalid = referrals.filter((r) => r.status === 'INVALID').length;

    return {
      id: user.id,
      referralCode: user.referralCode,
      inviteLink: user.inviteLink,
      valid,
      pending,
      invalid,
      total: referrals.length,
    };
  }

  // Get top 10 users ranked by valid referrals count
  async getReferralLeaderboard() {
    // Find count of valid referrals grouped by inviter
    const groupResult = await this.prisma.referral.groupBy({
      by: ['inviterId'],
      where: { status: 'VALID' },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Populate user profiles
    const leaderboard = [];
    for (const item of groupResult) {
      const user = await this.prisma.user.findUnique({
        where: { id: item.inviterId },
      });
      if (user) {
        leaderboard.push({
          username: user.username || `${user.firstName || 'User'}`,
          telegramId: user.telegramId.toString(),
          validCount: item._count.id,
        });
      }
    }

    return leaderboard;
  }
}
