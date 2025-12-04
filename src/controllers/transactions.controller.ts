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
import { TransactionsService } from '../services/transactions/transactions.service';
import { CreateTransactionDto } from '../dtos/transactions/create-transaction.dto';
import { UpdateTransactionStageDto } from '../dtos/transactions/update-transaction-stage.dto';
import { TransactionStage } from '../models/transactions/transaction.schema';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  async findAll() {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id/stage')
  @HttpCode(HttpStatus.OK)
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateTransactionStageDto,
  ) {
    return this.transactionsService.updateStage(id, updateStageDto);
  }

  @Get('stage/:stage')
  async findByStage(@Param('stage') stage: TransactionStage) {
    return this.transactionsService.findByStage(stage);
  }

  @Get('agent/:agentId')
  async findByAgent(@Param('agentId') agentId: string) {
    return this.transactionsService.findByAgent(agentId);
  }

  @Get(':id/financial-summary')
  async getFinancialSummary(@Param('id') id: string) {
    return this.transactionsService.getFinancialSummary(id);
  }
}
