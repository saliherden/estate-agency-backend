import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentType } from '../../models/agents/agent.schema';

// Yeni ajan oluşturma DTO'su
export class CreateAgentDto {
  @ApiProperty({
    description: 'E-posta adresi',
    example: 'john.doe@realestate.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Ad', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Telefon numarası', example: '+905321234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Ajan tipi',
    enum: AgentType,
    default: AgentType.BOTH,
  })
  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType = AgentType.BOTH;
}
