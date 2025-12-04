import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from '../../models/transactions/transaction.schema';
import { TransactionsService } from '../../services/transactions/transactions.service';
import { TransactionsController } from '../../controllers/transactions.controller';
import { CommissionCalculationModule } from '../commissions/commission-calculation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    CommissionCalculationModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
