import { IsString, IsNumber, IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Yeni işlem oluşturma DTO'su - gelen veriyi doğrular
export class CreateTransactionDto {
  @ApiProperty({
    description: 'Emlak adresi',
    example: 'İstanbul, Beşiktaş, Levent',
  })
  @IsString()
  @IsNotEmpty()
  propertyAddress: string;

  @ApiProperty({ description: 'Emlak tipi', example: 'Daire' })
  @IsString()
  @IsNotEmpty()
  propertyType: string;

  @ApiProperty({ description: 'Toplam hizmet bedeli (TL)', example: 50000 })
  @IsNumber()
  @IsNotEmpty()
  totalServiceFee: number;

  @ApiProperty({
    description: 'Listeleme ajanı ID',
    example: '64a1b2c3d4e5f6789012345',
  })
  @IsMongoId()
  @IsNotEmpty()
  listingAgentId: string;

  @ApiProperty({
    description: 'Satış ajanı ID',
    example: '64a1b2c3d4e5f6789012346',
  })
  @IsMongoId()
  @IsNotEmpty()
  sellingAgentId: string;

  @ApiProperty({ description: 'Müşteri adı', example: 'Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiProperty({
    description: 'Müşteri iletişim bilgisi',
    example: 'ahmet.yilmaz@email.com',
  })
  @IsString()
  @IsNotEmpty()
  clientContact: string;
}
