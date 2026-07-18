import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReferralService } from './referral.service';

@Injectable()
export class ReferralValidatorScheduler {
  private readonly logger = new Logger(ReferralValidatorScheduler.name);

  constructor(private referralService: ReferralService) {}

  // Run validation check every 30 seconds
  @Cron('*/30 * * * * *')
  async handleValidationCron() {
    this.logger.debug('Validation cron triggered');
    try {
      await this.referralService.validatePendingReferrals();
    } catch (e) {
      this.logger.error(`Error running referral validation cron: ${e.message}`);
    }
  }
}
