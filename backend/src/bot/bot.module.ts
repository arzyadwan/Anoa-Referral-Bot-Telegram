import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ReferralModule } from '../referral/referral.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, ReferralModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
