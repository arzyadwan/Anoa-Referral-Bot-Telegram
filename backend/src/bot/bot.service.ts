import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { ReferralService } from '../referral/referral.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf | null = null;
  private botUsername: string = '';

  constructor(
    private configService: ConfigService,
    private referralService: ReferralService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token || token === 'PLACEHOLDER_BOT_TOKEN') {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not configured or is set to placeholder. Bot will not start.');
      return;
    }

    try {
      this.bot = new Telegraf(token);
      this.referralService.setBotInstance(this.bot);

      // Get bot username
      const botInfo = await this.bot.telegram.getMe();
      this.botUsername = botInfo.username;
      this.logger.log(`Telegram Bot @${this.botUsername} is starting...`);

      this.setupHandlers();
      
      // Start polling
      this.bot.launch({
        allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
      }).catch((err) => {
        this.logger.error(`Bot launch failed: ${err.message}`);
      });

      this.logger.log('Telegram Bot successfully launched.');
    } catch (e) {
      this.logger.error(`Failed to initialize Telegram Bot: ${e.message}`);
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    // Handle /start command (supports startPayload for deep linking)
    this.bot.start(async (ctx) => {
      const payload = ctx.startPayload;
      const from = ctx.from;
      if (!from) return;

      try {
        const { user, isNew } = await this.referralService.registerUser(
          BigInt(from.id),
          from.username,
          from.first_name,
          from.last_name,
          payload,
        );

        let welcomeMessage = `👋 Halo ${from.first_name || 'User'}! Selamat datang di Community Growth Bot.\n\n`;
        
        if (isNew && payload) {
          welcomeMessage += `🎉 Anda berhasil bergabung menggunakan tautan rujukan!\n\n` +
            `👉 *Langkah selanjutnya*: Silakan bergabung dengan grup resmi kami di bawah ini untuk memenuhi syarat validasi rujukan Anda.`;
          
          await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              Markup.button.url('👉 Gabung Grup ANOA Token', 'https://t.me/ANOAtoken')
            ])
          });

          await ctx.reply(
            `Gunakan menu di bawah ini untuk melihat statistik rujukan, daftar tugas, check-in harian, dan papan peringkat.`,
            this.getMainMenuMarkup()
          );
        } else {
          if (isNew) {
            welcomeMessage += `Silakan buat tautan rujukan Anda sendiri dan bagikan ke teman-teman Anda untuk membantu pertumbuhan komunitas kami!\n\n`;
          } else {
            welcomeMessage += `Senang melihat Anda kembali!\n\n`;
          }
          welcomeMessage += `Gunakan menu di bawah ini untuk melihat statistik rujukan, daftar tugas, check-in harian, dan papan peringkat.`;
          
          await ctx.reply(welcomeMessage, this.getMainMenuMarkup());
        }
      } catch (err) {
        this.logger.error(`Error in start handler: ${err.message}`);
        await ctx.reply('Terjadi kesalahan saat memproses pendaftaran Anda. Silakan coba beberapa saat lagi.');
      }
    });

    // Listen to messages in group chats to increment message counts
    this.bot.on('message', async (ctx, next) => {
      const chat = ctx.chat;
      const from = ctx.from;

      if (!from || !chat) return next();

      // Check if message is from group or supergroup
      if (['group', 'supergroup'].includes(chat.type)) {
        try {
          await this.referralService.recordMessage(BigInt(from.id), String(chat.id));
        } catch (err) {
          this.logger.error(`Error updating message count: ${err.message}`);
        }
      }
      return next();
    });

    // Listen to chat_member updates (specifically when a member joins the group)
    this.bot.on('chat_member', async (ctx, next) => {
      const chatMember = ctx.chatMember;
      const chat = ctx.chat;
      if (!chatMember || !chat) return next();

      const oldStatus = chatMember.old_chat_member.status;
      const newStatus = chatMember.new_chat_member.status;

      const wasMember = ['member', 'administrator', 'creator'].includes(oldStatus);
      const isMember = ['member', 'administrator', 'creator'].includes(newStatus);

      if (!wasMember && isMember) {
        const userTelegram = chatMember.new_chat_member.user;
        const inviteLinkObj = chatMember.invite_link;

        if (inviteLinkObj) {
          const inviteUrl = inviteLinkObj.invite_link;
          this.logger.log(`User ${userTelegram.id} joined group ${chat.id} via invite link: ${inviteUrl}`);

          try {
            await this.referralService.registerReferralViaLink(
              BigInt(userTelegram.id),
              inviteUrl,
              userTelegram.username || undefined,
              userTelegram.first_name || undefined,
              userTelegram.last_name || undefined,
            );
          } catch (err: any) {
            this.logger.error(`Error processing join via invite link: ${err.message}`);
          }
        }
      }
      return next();
    });

    // Listen to text menu clicks (Fallback if client uses custom keyboards)
    this.bot.hears('🔗 Tautan Referral Saya', async (ctx) => this.handleReferralLink(ctx));
    this.bot.hears('📊 Statistik Rujukan', async (ctx) => this.handleStats(ctx));
    this.bot.hears('📋 Daftar Tugas (Tasks)', async (ctx) => this.handleTasks(ctx));
    this.bot.hears('📅 Daily Check-in', async (ctx) => this.handleDailyCheckin(ctx));
    this.bot.hears('🏆 Leaderboard', async (ctx) => this.handleLeaderboard(ctx));

    // Handle Callback Queries (Inline buttons)
    this.bot.on('callback_query', async (ctx) => {
      const data = (ctx.callbackQuery as any).data;
      if (!data) return;

      if (data.startsWith('check_task_')) {
        const taskId = parseInt(data.split('_')[2], 10);
        await this.handleCheckTaskCompletion(ctx, taskId);
      }
    });
  }

  private getMainMenuMarkup() {
    return Markup.keyboard([
      ['🔗 Tautan Referral Saya', '📊 Statistik Rujukan'],
      ['📋 Daftar Tugas (Tasks)', '📅 Daily Check-in'],
      ['🏆 Leaderboard']
    ]).resize();
  }

  private async handleReferralLink(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    try {
      const stats = await this.referralService.getUserStats(BigInt(from.id));
      if (!stats) {
        return ctx.reply('Silakan panggil /start terlebih dahulu untuk mendaftar.');
      }

      let inviteUrl = stats.inviteLink;

      if (!inviteUrl) {
        const channelSetting = await this.prisma.setting.findUnique({
          where: { key: 'channel_username' },
        });

        const targetChat = channelSetting ? channelSetting.value : '@test_channel';
        
        try {
          const linkObj = await ctx.telegram.createChatInviteLink(targetChat, {
            name: stats.referralCode,
          });
          
          inviteUrl = linkObj.invite_link;
          
          await this.prisma.user.update({
            where: { id: stats.id },
            data: { inviteLink: inviteUrl },
          });

          this.logger.log(`Created unique group invite link for User ${from.id}: ${inviteUrl}`);
        } catch (err: any) {
          this.logger.warn(`Failed to create unique invite link for user ${from.id}: ${err.message}. Falling back to bot deep link.`);
          inviteUrl = `https://t.me/${this.botUsername}?start=${stats.referralCode}`;
        }
      }

      await ctx.reply(
        `🔗 *Tautan Undangan Grup Anda*:\n\`${inviteUrl}\`\n\n` +
        `Sebarkan tautan ini kepada teman-teman Anda! Mereka akan langsung masuk ke grup Telegram dan terdaftar sebagai rujukan Anda.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      this.logger.error(`Error in handleReferralLink: ${err.message}`);
    }
  }

  private async handleStats(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    try {
      const stats = await this.referralService.getUserStats(BigInt(from.id));
      if (!stats) {
        return ctx.reply('Silakan panggil /start terlebih dahulu untuk mendaftar.');
      }

      const message = `📊 *Statistik Rujukan Anda*:\n\n` +
        `• *Rujukan Valid*: ${stats.valid} (Telah memenuhi semua kriteria)\n` +
        `• *Rujukan Pending*: ${stats.pending} (Masih diproses/menunggu syarat)\n` +
        `• *Rujukan Invalid*: ${stats.invalid} (Gagal validasi)\n\n` +
        `• *Total Diundang*: ${stats.total}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
      this.logger.error(`Error in handleStats: ${err.message}`);
    }
  }

  private async handleTasks(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(from.id) },
      });

      if (!user) {
        return ctx.reply('Silakan panggil /start terlebih dahulu untuk mendaftar.');
      }

      const activeTasks = await this.prisma.task.findMany({
        where: { isActive: true },
      });

      if (activeTasks.length === 0) {
        return ctx.reply('Tidak ada tugas kampanye aktif saat ini.');
      }

      const completions = await this.prisma.taskCompletion.findMany({
        where: { userId: user.id },
      });
      const completedTaskIds = completions.map((c) => c.taskId);

      let msg = `📋 *Daftar Tugas Kampanye*:\n\nSelesaikan tugas-tugas di bawah ini untuk membantu pertumbuhan komunitas kita!\n\n`;

      const inlineButtons = [];

      for (const task of activeTasks) {
        const isCompleted = completedTaskIds.includes(task.id);
        const statusIcon = isCompleted ? '✅' : '❌';
        msg += `${statusIcon} *${task.title}*\n_${task.description}_\n\n`;

        if (!isCompleted) {
          inlineButtons.push(
            Markup.button.callback(`Periksa: ${task.title}`, `check_task_${task.id}`)
          );
        }
      }

      if (inlineButtons.length > 0) {
        // Chunk inline buttons
        await ctx.reply(msg, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(inlineButtons, { columns: 1 })
        });
      } else {
        await ctx.reply(msg + `🎉 Luar biasa! Anda telah menyelesaikan semua tugas aktif.`, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Error in handleTasks: ${err.message}`);
    }
  }

  private async handleCheckTaskCompletion(ctx: any, taskId: number) {
    const from = ctx.from;
    if (!from) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(from.id) },
      });

      if (!user) return ctx.answerCbQuery('User tidak ditemukan.');

      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) return ctx.answerCbQuery('Tugas tidak ditemukan.');

      // Check if already completed
      const existing = await this.prisma.taskCompletion.findUnique({
        where: { userId_taskId: { userId: user.id, taskId: task.id } },
      });

      if (existing) {
        return ctx.answerCbQuery('Tugas ini sudah diselesaikan!');
      }

      // Check validation based on type
      let isValidated = false;

      if (task.type === 'JOIN_CHANNEL' && task.telegramChatId) {
        try {
          const memberInfo = await ctx.telegram.getChatMember(task.telegramChatId, from.id);
          isValidated = ['member', 'administrator', 'creator'].includes(memberInfo.status);
        } catch (e) {
          isValidated = false;
        }
      } else {
        // For custom tasks, require manual admin approval (or automatically mark as done for demo)
        isValidated = true; // Auto-pass for demo custom tasks, or keep pending
      }

      if (isValidated) {
        await this.prisma.taskCompletion.create({
          data: {
            userId: user.id,
            taskId: task.id,
            status: 'COMPLETED',
          },
        });
        await ctx.answerCbQuery('✅ Selamat! Tugas berhasil diselesaikan.', { show_alert: true });
        // Refresh tasks message
        await ctx.deleteMessage().catch(() => {});
        await this.handleTasks(ctx);
      } else {
        await ctx.answerCbQuery('❌ Anda belum memenuhi persyaratan tugas ini.', { show_alert: true });
      }
    } catch (err) {
      this.logger.error(`Error checking task: ${err.message}`);
      await ctx.answerCbQuery('Terjadi kesalahan saat validasi.');
    }
  }

  private async handleDailyCheckin(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    try {
      const res = await this.referralService.recordDailyCheckin(BigInt(from.id));
      await ctx.reply(res.message);
    } catch (err) {
      this.logger.error(`Error in checkin: ${err.message}`);
    }
  }

  private async handleLeaderboard(ctx: any) {
    try {
      const leaderboard = await this.referralService.getReferralLeaderboard();
      if (leaderboard.length === 0) {
        return ctx.reply('Belum ada rujukan valid yang terdaftar untuk papan peringkat.');
      }

      let msg = `🏆 *Papan Peringkat Rujukan Teratas* (Berdasarkan Referral Valid):\n\n`;
      leaderboard.forEach((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        msg += `${medal} *${item.username}* - ${item.validCount} referral valid\n`;
      });

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      this.logger.error(`Error in handleLeaderboard: ${err.message}`);
    }
  }

  async broadcastMessage(message: string, target: 'ALL' | 'ACTIVE') {
    if (!this.bot) throw new Error('Telegram Bot is not initialized');
    
    const users = await this.prisma.user.findMany({
      where: target === 'ACTIVE' ? { status: 'ACTIVE' } : {},
    });

    let success = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await this.bot.telegram.sendMessage(Number(u.telegramId), message);
        success++;
      } catch (err) {
        failed++;
      }
    }

    return { success, failed, total: users.length };
  }
}
