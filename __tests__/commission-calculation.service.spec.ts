import { Test, TestingModule } from '@nestjs/testing';
import { CommissionCalculationService } from '../src/commission-calculation/commission-calculation.service';
import { Types } from 'mongoose';
import {
  Transaction,
  TransactionStage,
} from '../src/transactions/schemas/transaction.schema';
import { Commission } from '../src/commissions/schemas/commission.schema';
import { AgentsService } from '../src/agents/agents.service';
import { getModelToken } from '@nestjs/mongoose';

describe('CommissionCalculationService', () => {
  let service: CommissionCalculationService;
  let mockTransactionModel: any;
  let mockCommissionModel: any;
  let mockAgentsService: AgentsService;

  const mockTransactionId = '507f1f77bcf86cd799439011';
  const mockAgentId = '507f1f77bcf86cd799439012';
  const mockDifferentAgentId = '507f1f77bcf86cd799439013';

  const mockTransaction = {
    _id: new Types.ObjectId(mockTransactionId),
    propertyAddress: 'Test Address',
    propertyType: 'Daire',
    totalServiceFee: 100000,
    stage: TransactionStage.COMPLETED,
    listingAgentId: new Types.ObjectId(mockAgentId),
    sellingAgentId: new Types.ObjectId(mockAgentId),
    clientName: 'Test Client',
    clientContact: 'test@example.com',
  };

  beforeEach(async () => {
    mockTransactionModel = {
      findById: jest.fn(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };

    mockCommissionModel = {
      insertMany: jest.fn(),
    };

    mockAgentsService = {
      updateCommissionStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionCalculationService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Commission.name),
          useValue: mockCommissionModel,
        },
        {
          provide: AgentsService,
          useValue: mockAgentsService,
        },
      ],
    }).compile();

    service = module.get<CommissionCalculationService>(
      CommissionCalculationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCompletedTransaction', () => {
    it('should process commission for same agent scenario', async () => {
      const mockPopulate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      });
      mockTransactionModel.findById.mockReturnValue({
        populate: mockPopulate,
      });
      mockCommissionModel.insertMany.mockResolvedValue([]);
      mockAgentsService.updateCommissionStats.mockResolvedValue(true);

      const result =
        await service.processCompletedTransaction(mockTransactionId);

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(50000);
      expect(result.sellingAgentCommission).toBe(0);
      expect(mockCommissionModel.insertMany).toHaveBeenCalled();
      expect(mockAgentsService.updateCommissionStats).toHaveBeenCalledWith(
        mockAgentId,
        50000,
      );
    });

    it('should process commission for different agents scenario', async () => {
      const transactionWithDifferentAgents = {
        ...mockTransaction,
        sellingAgentId: new Types.ObjectId(mockDifferentAgentId),
      };

      const mockPopulate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(transactionWithDifferentAgents),
      });
      mockTransactionModel.findById.mockReturnValue({
        populate: mockPopulate,
      });
      mockCommissionModel.insertMany.mockResolvedValue([]);
      mockAgentsService.updateCommissionStats.mockResolvedValue(true);

      const result =
        await service.processCompletedTransaction(mockTransactionId);

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(25000);
      expect(result.sellingAgentCommission).toBe(25000);
      expect(mockCommissionModel.insertMany).toHaveBeenCalled();
      expect(mockAgentsService.updateCommissionStats).toHaveBeenCalledTimes(2);
    });

    it('should throw error if transaction not found', async () => {
      const mockPopulate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockTransactionModel.findById.mockReturnValue({
        populate: mockPopulate,
      });

      await expect(
        service.processCompletedTransaction(mockTransactionId),
      ).rejects.toThrow(`Transaction with ID ${mockTransactionId} not found`);
    });

    it('should throw error if transaction is not completed', async () => {
      const incompleteTransaction = {
        ...mockTransaction,
        stage: TransactionStage.TITLE_DEED,
      };

      const mockPopulate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(incompleteTransaction),
      });
      mockTransactionModel.findById.mockReturnValue({
        populate: mockPopulate,
      });

      await expect(
        service.processCompletedTransaction(mockTransactionId),
      ).rejects.toThrow('Transaction must be completed to process commissions');
    });
  });

  describe('simulateCommissionCalculation', () => {
    it('should simulate commission for same agent', async () => {
      const result = await service.simulateCommissionCalculation(
        100000,
        mockAgentId,
        mockAgentId,
      );

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(50000);
      expect(result.sellingAgentCommission).toBe(0);
    });

    it('should simulate commission for different agents', async () => {
      const result = await service.simulateCommissionCalculation(
        100000,
        mockAgentId,
        mockDifferentAgentId,
      );

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(25000);
      expect(result.sellingAgentCommission).toBe(25000);
    });
  });

  describe('validateCommissionRules', () => {
    it('should validate correct commission breakdown', () => {
      const validBreakdown = {
        agencyCommission: 50000,
        totalAgentCommission: 50000,
        listingAgentCommission: 50000,
        sellingAgentCommission: 0,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId(mockAgentId),
      };

      const result = service.validateCommissionRules(validBreakdown);
      expect(result).toBe(true);
    });

    it('should reject invalid commission breakdown', () => {
      const invalidBreakdown = {
        agencyCommission: 40000, // Yanlış miktar
        totalAgentCommission: 50000,
        listingAgentCommission: 50000,
        sellingAgentCommission: 0,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId(mockAgentId),
      };

      const result = service.validateCommissionRules(invalidBreakdown);
      expect(result).toBe(false);
    });
  });

  describe('calculateFinancialBreakdown', () => {
    it('should calculate commission correctly for same agent', () => {
      const transaction = {
        ...mockTransaction,
        totalServiceFee: 100000,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId(mockAgentId),
      };

      const result = service['calculateFinancialBreakdown'](transaction);

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(50000);
      expect(result.sellingAgentCommission).toBe(0);
    });

    it('should calculate commission correctly for different agents', () => {
      const transaction = {
        ...mockTransaction,
        totalServiceFee: 100000,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId(mockDifferentAgentId),
      };

      const result = service['calculateFinancialBreakdown'](transaction);

      expect(result.agencyCommission).toBe(50000);
      expect(result.totalAgentCommission).toBe(50000);
      expect(result.listingAgentCommission).toBe(25000);
      expect(result.sellingAgentCommission).toBe(25000);
    });
  });
});
