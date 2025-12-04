import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentType } from '../../models/agents/agent.schema';
import { CreateAgentDto } from '../../dtos/agents/create-agent.dto';
import { UpdateAgentDto } from '../../dtos/agents/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(@InjectModel(Agent.name) private agentModel: Model<Agent>) {}

  // Yeni ajan oluşturur
  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    // E-posta benzersizliğini kontrol et
    const existingAgent = await this.agentModel.findOne({
      email: createAgentDto.email,
    });
    if (existingAgent) {
      throw new ConflictException(
        `Agent with email ${createAgentDto.email} already exists`,
      );
    }

    return this.agentModel.create(createAgentDto);
  }

  // Tüm aktif ajanları listeler
  async findAll(): Promise<Agent[]> {
    return this.agentModel
      .find({ isActive: true })
      .sort({ totalCommissionEarned: -1 });
  }

  // ID'ye göre ajan bulur
  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentModel.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  // E-postaya göre ajan bulur
  async findByEmail(email: string): Promise<Agent> {
    const agent = await this.agentModel.findOne({ email });
    if (!agent) {
      throw new NotFoundException(`Agent with email ${email} not found`);
    }
    return agent;
  }

  // Ajan bilgilerini günceller
  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);

    // E-posta değişiyorsa benzersizliğini kontrol et
    if (updateAgentDto.email && updateAgentDto.email !== agent.email) {
      const existingAgent = await this.agentModel.findOne({
        email: updateAgentDto.email,
        _id: { $ne: id },
      });
      if (existingAgent) {
        throw new ConflictException(
          `Agent with email ${updateAgentDto.email} already exists`,
        );
      }
    }

    Object.assign(agent, updateAgentDto);
    return agent.save();
  }

  // Ajanı pasif hale getirir (silmez, sadece devre dışı bırakır)
  async deactivate(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.isActive = false;
    return agent.save();
  }

  // Ajanı tekrar aktif hale getirir
  async activate(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.isActive = true;
    return agent.save();
  }

  // Ajanın komisyonunu ve işlem sayısını günceller
  async updateCommissionStats(
    agentId: string,
    commissionAmount: number,
  ): Promise<void> {
    await this.agentModel.findByIdAndUpdate(agentId, {
      $inc: {
        totalCommissionEarned: commissionAmount,
        transactionCount: 1,
      },
    });
  }

  // Tipe göre ajanları filtreler
  async findByType(type: AgentType): Promise<Agent[]> {
    return this.agentModel.find({ type, isActive: true });
  }

  // En çok kazanan ajanları listeler
  async getTopPerformers(limit: number = 10): Promise<Agent[]> {
    return this.agentModel
      .find({ isActive: true })
      .sort({ totalCommissionEarned: -1 })
      .limit(limit);
  }

  // Ajan istatistiklerini verir
  async getAgentStats(id: string) {
    const agent = await this.findOne(id);

    return {
      id: agent._id,
      name: `${agent.firstName} ${agent.lastName}`,
      email: agent.email,
      type: agent.type,
      totalCommissionEarned: agent.totalCommissionEarned,
      transactionCount: agent.transactionCount,
      averageCommissionPerTransaction:
        agent.transactionCount > 0
          ? agent.totalCommissionEarned / agent.transactionCount
          : 0,
      isActive: agent.isActive,
    };
  }
}
