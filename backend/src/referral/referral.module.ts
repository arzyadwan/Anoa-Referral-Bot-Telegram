import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralValidatorScheduler } from './referral-validator.scheduler';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ReferralService, ReferralValidatorScheduler],
  exports: [ReferralService],
})
export class ReferralModule {}
