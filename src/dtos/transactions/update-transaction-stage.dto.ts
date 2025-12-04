import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionStage } from '../../models/transactions/transaction.schema';

// İşlem aşaması güncelleme DTO'su - aşama geçişlerini kontrol eder
export class UpdateTransactionStageDto {
  @ApiProperty({
    description: 'Yeni işlem aşaması',
    enum: TransactionStage,
    example: TransactionStage.COMPLETED,
  })
  @IsEnum(TransactionStage)
  @IsNotEmpty()
  stage: TransactionStage;
}
