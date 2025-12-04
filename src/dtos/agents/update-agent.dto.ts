import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgentType } from '../../models/agents/agent.schema';

// Ajan güncelleme DTO'su - sadece belirli alanların güncellenmesine izin verir
export class UpdateAgentDto {
  @ApiPropertyOptional({
    description: 'E-posta adresi',
    example: 'john.doe@realestate.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Ad', example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Soyad', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Telefon numarası',
    example: '+905321234567',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Ajan tipi',
    enum: AgentType,
  })
  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType;
}
