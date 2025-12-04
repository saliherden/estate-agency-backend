import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from '../src/agents/agents.service';
import { Agent, AgentType } from '../src/agents/schemas/agent.schema';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAgentDto } from '../src/agents/dto/create-agent.dto';
import { UpdateAgentDto } from '../src/agents/dto/update-agent.dto';
import { getModelToken } from '@nestjs/mongoose';

describe('AgentsService', () => {
  let service: AgentsService;
  let mockAgentModel: any;

  const mockAgentId = '507f1f77bcf86cd799439011';

  const mockAgent = {
    _id: mockAgentId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+905321234567',
    type: AgentType.BOTH,
    isActive: true,
    totalCommissionEarned: 100000,
    transactionCount: 5,
  };

  beforeEach(async () => {
    mockAgentModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getModelToken(Agent.name),
          useValue: mockAgentModel,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new agent successfully', async () => {
      const createAgentDto: CreateAgentDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+905321234567',
        type: AgentType.BOTH,
      };

      mockAgentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockAgentModel.create.mockResolvedValue(mockAgent);

      const result = await service.create(createAgentDto);

      expect(mockAgentModel.findOne).toHaveBeenCalledWith({
        email: createAgentDto.email,
      });
      expect(mockAgentModel.create).toHaveBeenCalledWith(createAgentDto);
      expect(result).toEqual(mockAgent);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createAgentDto: CreateAgentDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+905321234567',
        type: AgentType.BOTH,
      };

      mockAgentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAgent),
      });

      await expect(service.create(createAgentDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return agent by id', async () => {
      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAgent),
        }),
      });

      const result = await service.findOne(mockAgentId);

      expect(mockAgentModel.findById).toHaveBeenCalledWith(mockAgentId);
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if agent not found', async () => {
      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne(mockAgentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return agent by email', async () => {
      mockAgentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAgent),
      });

      const result = await service.findByEmail('test@example.com');

      expect(mockAgentModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if agent not found', async () => {
      mockAgentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update agent successfully', async () => {
      const updateAgentDto: UpdateAgentDto = {
        firstName: 'Jane',
      };

      const updatedAgent = {
        ...mockAgent,
        ...updateAgentDto,
        save: jest.fn().mockResolvedValue(updatedAgent),
      };

      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedAgent),
        }),
      });

      const result = await service.update(mockAgentId, updateAgentDto);

      expect(result).toEqual(updatedAgent);
    });

    it('should throw ConflictException if new email already exists', async () => {
      const updateAgentDto: UpdateAgentDto = {
        email: 'existing@example.com',
      };

      const existingAgent = { ...mockAgent, _id: 'differentId' };

      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAgent),
        }),
      });
      mockAgentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingAgent),
      });

      await expect(service.update(mockAgentId, updateAgentDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCommissionStats', () => {
    it('should update agent commission stats', async () => {
      mockAgentModel.findByIdAndUpdate.mockResolvedValue(true);

      await service.updateCommissionStats(mockAgentId, 25000);

      expect(mockAgentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAgentId,
        {
          $inc: {
            totalCommissionEarned: 25000,
            transactionCount: 1,
          },
        },
      );
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performing agents', async () => {
      const topAgents = [mockAgent];

      mockAgentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(topAgents),
        }),
      });

      const result = await service.getTopPerformers(5);

      expect(mockAgentModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockAgentModel.sort).toHaveBeenCalledWith({
        totalCommissionEarned: -1,
      });
      expect(mockAgentModel.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(topAgents);
    });
  });

  describe('getAgentStats', () => {
    it('should return agent statistics', async () => {
      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAgent),
        }),
      });

      const result = await service.getAgentStats(mockAgentId);

      expect(result).toEqual({
        id: mockAgentId,
        name: 'John Doe',
        email: 'test@example.com',
        type: AgentType.BOTH,
        totalCommissionEarned: 100000,
        transactionCount: 5,
        averageCommissionPerTransaction: 20000,
        isActive: true,
      });
    });

    it('should handle zero transaction count', async () => {
      const agentWithNoTransactions = {
        ...mockAgent,
        transactionCount: 0,
      };

      mockAgentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(agentWithNoTransactions),
        }),
      });

      const result = await service.getAgentStats(mockAgentId);

      expect(result.averageCommissionPerTransaction).toBe(0);
    });
  });
});
