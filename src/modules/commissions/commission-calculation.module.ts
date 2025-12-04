import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionCalculationService } from '../../services/transactions/commission-calculation.service';
import {
  Transaction,
  TransactionSchema,
} from '../../models/transactions/transaction.schema';
import {
  Commission,
  CommissionSchema,
} from '../../models/commissions/commission.schema';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Commission.name, schema: CommissionSchema },
    ]),
    AgentsModule,
  ],
  providers: [CommissionCalculationService],
  exports: [CommissionCalculationService],
})
export class CommissionCalculationModule {}
