import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from '../services/agents/agents.service';
import { CreateAgentDto } from '../dtos/agents/create-agent.dto';
import { UpdateAgentDto } from '../dtos/agents/update-agent.dto';
import { AgentType } from '../models/agents/agent.schema';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  async findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    return this.agentsService.deactivate(id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.agentsService.activate(id);
  }

  @Get('type/:type')
  async findByType(@Param('type') type: AgentType) {
    return this.agentsService.findByType(type);
  }

  @Get('top-performers')
  async getTopPerformers(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    return this.agentsService.getTopPerformers(limitNumber);
  }

  @Get(':id/stats')
  async getAgentStats(@Param('id') id: string) {
    return await this.agentsService.getAgentStats(id);
  }
}
