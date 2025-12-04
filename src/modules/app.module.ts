import { Module } from '@nestjs/common';
import { AppController } from '../controllers/app.controller';
import { AppService } from '../services/app.service';
import { DatabaseModule } from '../database/database.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AgentsModule } from './agents/agents.module';
import { CommissionsModule } from './commissions/commissions.module';
import { CommissionCalculationModule } from './commissions/commission-calculation.module';

@Module({
  imports: [
    DatabaseModule,
    TransactionsModule,
    AgentsModule,
    CommissionsModule,
    CommissionCalculationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
