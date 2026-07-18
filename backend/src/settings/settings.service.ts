import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting ? setting.value : defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getMinMessagesCount(): Promise<number> {
    const val = await this.getSetting('min_messages_count', '5');
    return parseInt(val, 10);
  }

  async getMinStayHours(): Promise<number> {
    const val = await this.getSetting('min_stay_hours', '24');
    return parseInt(val, 10);
  }

  async getChannelUsername(): Promise<string> {
    return this.getSetting('channel_username', '@test_channel');
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }
}
