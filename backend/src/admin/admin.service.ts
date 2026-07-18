import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SettingsService } from '../settings/settings.service';
import { BotService } from '../bot/bot.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private botService: BotService,
  ) {}

  // Helper to map BigInt to String in objects
  private mapUserBigInt(user: any) {
    if (!user) return user;
    return {
      ...user,
      telegramId: user.telegramId.toString(),
    };
  }

  // Admin dashboard analytics
  async getAnalytics() {
    const totalUsers = await this.prisma.user.count();
    
    // Referrals stats
    const totalReferrals = await this.prisma.referral.count();
    const validReferrals = await this.prisma.referral.count({ where: { status: 'VALID' } });
    const pendingReferrals = await this.prisma.referral.count({ where: { status: 'PENDING' } });
    const invalidReferrals = await this.prisma.referral.count({ where: { status: 'INVALID' } });

    // Active Users (DAU / WAU)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dau = await this.prisma.user.count({
      where: {
        OR: [
          { createdAt: { gte: today } },
          { dailyCheckins: { some: { checkinDate: today } } },
        ],
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const wau = await this.prisma.user.count({
      where: {
        OR: [
          { createdAt: { gte: sevenDaysAgo } },
          { dailyCheckins: { some: { checkinDate: { gte: sevenDaysAgo } } } },
        ],
      },
    });

    const validationRate = totalReferrals > 0 ? (validReferrals / totalReferrals) * 100 : 0;

    // Growth Chart (last 30 days)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const formattedDate = startOfDay.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      chartData.push({ date: formattedDate, count });
    }

    return {
      kpis: {
        totalUsers,
        totalReferrals,
        validReferrals,
        pendingReferrals,
        invalidReferrals,
        dau,
        wau,
        validationRate: parseFloat(validationRate.toFixed(1)),
      },
      chartData,
    };
  }

  // Users Management
  async getUsers(search: string = '', status: string = '') {
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.mapUserBigInt(u));
  }

  async updateUserStatus(id: number, status: 'ACTIVE' | 'BANNED' | 'FLAGGED') {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });
    return this.mapUserBigInt(user);
  }

  async getUserInvitees(userId: number) {
    const referrals = await this.prisma.referral.findMany({
      where: { inviterId: userId },
      include: {
        invitee: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
    return referrals.map((r) => ({
      id: r.id,
      status: r.status,
      failReason: r.failReason,
      joinedAt: r.joinedAt,
      invitee: this.mapUserBigInt(r.invitee),
    }));
  }

  // Referrals Log
  async getReferrals() {
    const referrals = await this.prisma.referral.findMany({
      include: {
        inviter: true,
        invitee: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return referrals.map((r) => ({
      ...r,
      inviter: this.mapUserBigInt(r.inviter),
      invitee: this.mapUserBigInt(r.invitee),
    }));
  }

  async overrideReferralStatus(id: number, status: 'VALID' | 'INVALID' | 'PENDING', failReason?: string) {
    const referral = await this.prisma.referral.update({
      where: { id },
      data: {
        status,
        failReason: status === 'VALID' ? null : failReason,
        validatedAt: status === 'VALID' ? new Date() : null,
      },
      include: {
        inviter: true,
        invitee: true,
      },
    });

    return {
      ...referral,
      inviter: this.mapUserBigInt(referral.inviter),
      invitee: this.mapUserBigInt(referral.invitee),
    };
  }

  // Tasks CRUD
  async getTasks() {
    return this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(data: { title: string; description: string; type: 'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM'; telegramChatId?: string }) {
    return this.prisma.task.create({
      data,
    });
  }

  async updateTask(id: number, data: { title?: string; description?: string; type?: 'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM'; telegramChatId?: string; isActive?: boolean }) {
    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async deleteTask(id: number) {
    return this.prisma.task.delete({
      where: { id },
    });
  }

  // Settings
  async getSettings() {
    return this.settingsService.getAllSettings();
  }

  async updateSettings(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      await this.settingsService.setSetting(key, value);
    }
    return this.settingsService.getAllSettings();
  }

  // Broadcast
  async sendBroadcast(message: string, target: 'ALL' | 'ACTIVE') {
    const broadcast = await this.prisma.broadcast.create({
      data: {
        message,
        target,
        status: 'SENDING',
      },
    });

    try {
      const stats = await this.botService.broadcastMessage(message, target);
      await this.prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      return { success: true, stats };
    } catch (err) {
      await this.prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          status: 'FAILED',
        },
      });
      throw err;
    }
  }

  async getBroadcasts() {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
