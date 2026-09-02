import { Controller, Get } from '@nestjs/common';
import { Roles } from 'src/decorators/roles.decorator';
import type { GroupStatsDto } from '@sahibalquran/shared';
import { StatsOrchestrator } from './stats.orchestrator';

@Controller('stats')
export class StatsController {
  constructor(private readonly orchestrator: StatsOrchestrator) {}

  @Get()
  @Roles(['ADMIN'])
  async getStats(): Promise<GroupStatsDto> {
    return this.orchestrator.getStats();
  }
}
