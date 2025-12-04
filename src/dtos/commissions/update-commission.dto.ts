import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '../../models/commissions/commission.schema';

// Komisyon güncelleme DTO'su - durum ve not güncellemeleri için
export class UpdateCommissionDto {
  @ApiProperty({
    description: 'Yeni komisyon durumu',
    enum: CommissionStatus,
    example: CommissionStatus.PROCESSED,
  })
  @IsEnum(CommissionStatus)
  status: CommissionStatus;

  @ApiPropertyOptional({ description: 'Notlar', example: 'İşleme alındı' })
  @IsString()
  @IsOptional()
  notes?: string;
}
