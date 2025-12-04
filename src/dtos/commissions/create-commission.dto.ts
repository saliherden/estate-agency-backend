import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '../../models/commissions/commission.schema';

// Yeni komisyon kaydı oluşturma DTO'su
export class CreateCommissionDto {
  @ApiProperty({ description: 'İşlem ID', example: '64a1b2c3d4e5f6789012345' })
  @IsMongoId()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Ajan ID (şirket komisyonu için null olabilir)',
    example: '64a1b2c3d4e5f6789012346',
  })
  @IsMongoId()
  @IsOptional()
  agentId?: string;

  @ApiProperty({ description: 'Komisyon miktarı', example: 25000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Komisyon tipi', example: 'listing' })
  @IsString()
  @IsNotEmpty()
  commissionType: string;

  @ApiPropertyOptional({
    description: 'Komisyon durumu',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  @IsEnum(CommissionStatus)
  @IsOptional()
  status?: CommissionStatus = CommissionStatus.PENDING;

  @ApiPropertyOptional({ description: 'Notlar', example: 'Ödeme bekleniyor' })
  @IsString()
  @IsOptional()
  notes?: string;
}
