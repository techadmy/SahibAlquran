import { Injectable } from '@nestjs/common';
import { GroupStatsDto } from '@sahibalquran/shared';
import { DatabaseService } from '../database/database.service';

/**
 * Stats Orchestrator
 *
 * Coordinates cross-domain statistics aggregation following the orchestrator pattern.
 * GroupService owns group table, UserService owns user table — orchestrator combines both.
 */
@Injectable()
export class StatsOrchestrator {
  constructor(private readonly db: DatabaseService) {}

  async getStats(): Promise<GroupStatsDto> {
    // Sequential reads for cross-domain aggregation
    const groupsCount = await this.db.group.count();
    const learnersCount = await this.db.user.count({ where: { role: 'STUDENT' } });
    const moderatorsCount = await this.db.user.count({ where: { role: 'MODERATOR' } });

    return { groupsCount, learnersCount, moderatorsCount };
  }
}
