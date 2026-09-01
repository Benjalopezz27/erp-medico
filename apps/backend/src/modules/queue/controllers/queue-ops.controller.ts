import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@erp/shared-types';
import { OpsProbeQueueService } from '../services/ops-probe.queue';

export class CreateQueueProbeDto {
  message?: string;
  failAttempts?: number;
}

@Controller('ops/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
export class QueueOpsController {
  constructor(private readonly queueService: OpsProbeQueueService) {}

  @Post('probe')
  async triggerProbe(@Body() body: CreateQueueProbeDto) {
    const result = await this.queueService.enqueueProbeJob(body);
    return {
      statusCode: 201,
      message: 'Queue probe job dispatched successfully',
      data: result,
    };
  }

  @Get('probe/:jobId')
  async getProbeStatus(@Param('jobId') jobId: string) {
    const jobStatus = await this.queueService.getJobStatus(jobId);
    if (!jobStatus) {
      throw new NotFoundException(`Queue job ${jobId} not found`);
    }
    return {
      statusCode: 200,
      data: jobStatus,
    };
  }

  @Get('metrics')
  async getMetrics() {
    const metrics = await this.queueService.getQueueMetrics();
    return {
      statusCode: 200,
      data: metrics,
    };
  }
}
