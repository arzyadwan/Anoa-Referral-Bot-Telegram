import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BotModule } from '../bot/bot.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [BotModule, SettingsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
