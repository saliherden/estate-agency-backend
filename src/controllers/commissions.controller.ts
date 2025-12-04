import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommissionsService } from '../services/commissions/commissions.service';
import { CreateCommissionDto } from '../dtos/commissions/create-commission.dto';
import { UpdateCommissionDto } from '../dtos/commissions/update-commission.dto';
import { CommissionStatus } from '../models/commissions/commission.schema';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post()
  async create(@Body() createCommissionDto: CreateCommissionDto) {
    return this.commissionsService.create(createCommissionDto);
  }

  @Get()
  async findAll() {
    return this.commissionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commissionsService.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateCommissionDto: UpdateCommissionDto,
  ) {
    return this.commissionsService.updateStatus(id, updateCommissionDto);
  }

  @Get('agent/:agentId')
  async findByAgent(@Param('agentId') agentId: string) {
    return this.commissionsService.findByAgent(agentId);
  }

  @Get('status/:status')
  async findByStatus(@Param('status') status: CommissionStatus) {
    return this.commissionsService.findByStatus(status);
  }

  @Get('transaction/:transactionId')
  async findByTransaction(@Param('transactionId') transactionId: string) {
    return this.commissionsService.findByTransaction(transactionId);
  }

  @Get('pending/list')
  async getPendingCommissions() {
    return this.commissionsService.getPendingCommissions();
  }

  @Get('agent/:agentId/summary')
  async getAgentCommissionSummary(@Param('agentId') agentId: string) {
    return this.commissionsService.getAgentCommissionSummary(agentId);
  }

  @Get('summary/overall')
  async getOverallCommissionSummary() {
    return this.commissionsService.getOverallCommissionSummary();
  }
}
