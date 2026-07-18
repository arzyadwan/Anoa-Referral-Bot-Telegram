import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('users')
  getUsers(@Query('search') search?: string, @Query('status') status?: string) {
    return this.adminService.getUsers(search, status);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'BANNED' | 'FLAGGED') {
    return this.adminService.updateUserStatus(parseInt(id, 10), status);
  }

  @Get('users/:id/invitees')
  getUserInvitees(@Param('id') id: string) {
    return this.adminService.getUserInvitees(parseInt(id, 10));
  }

  @Get('referrals')
  getReferrals() {
    return this.adminService.getReferrals();
  }

  @Post('referrals/:id/override')
  overrideReferralStatus(
    @Param('id') id: string,
    @Body('status') status: 'VALID' | 'INVALID' | 'PENDING',
    @Body('failReason') failReason?: string,
  ) {
    return this.adminService.overrideReferralStatus(parseInt(id, 10), status, failReason);
  }

  @Get('tasks')
  getTasks() {
    return this.adminService.getTasks();
  }

  @Post('tasks')
  createTask(
    @Body() body: { title: string; description: string; type: 'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM'; telegramChatId?: string },
  ) {
    return this.adminService.createTask(body);
  }

  @Put('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; type?: 'JOIN_CHANNEL' | 'SEND_MESSAGES' | 'CUSTOM'; telegramChatId?: string; isActive?: boolean },
  ) {
    return this.adminService.updateTask(parseInt(id, 10), body);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.adminService.deleteTask(parseInt(id, 10));
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  updateSettings(@Body() body: Record<string, string>) {
    return this.adminService.updateSettings(body);
  }

  @Post('broadcast')
  sendBroadcast(@Body() body: { message: string; target: 'ALL' | 'ACTIVE' }) {
    return this.adminService.sendBroadcast(body.message, body.target);
  }

  @Get('broadcasts')
  getBroadcasts() {
    return this.adminService.getBroadcasts();
  }
}
