import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../src/transactions/transactions.service';
import {
  Transaction,
  TransactionStage,
} from '../src/transactions/schemas/transaction.schema';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from '../src/transactions/dto/create-transaction.dto';
import { UpdateTransactionStageDto } from '../src/transactions/dto/update-transaction-stage.dto';
import { getModelToken } from '@nestjs/mongoose';
import { CommissionCalculationService } from '../src/commission-calculation/commission-calculation.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockCommissionCalculationService: any;
  let mockTransactionModel: any;

  const mockTransactionId = '507f1f77bcf86cd799439011';
  const mockAgentId = '507f1f77bcf86cd799439012';

  const mockTransaction = {
    _id: new Types.ObjectId(mockTransactionId),
    propertyAddress: 'Test Address',
    propertyType: 'Daire',
    totalServiceFee: 100000,
    stage: TransactionStage.AGREEMENT,
    listingAgentId: new Types.ObjectId(mockAgentId),
    sellingAgentId: new Types.ObjectId(mockAgentId),
    clientName: 'Test Client',
    clientContact: 'test@example.com',
  };

  beforeEach(async () => {
    mockTransactionModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockCommissionCalculationService = {
      processCompletedTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: CommissionCalculationService,
          useValue: mockCommissionCalculationService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const createTransactionDto: CreateTransactionDto = {
        propertyAddress: 'Test Address',
        propertyType: 'Daire',
        totalServiceFee: 100000,
        listingAgentId: mockAgentId,
        sellingAgentId: mockAgentId,
        clientName: 'Test Client',
        clientContact: 'test@example.com',
      };

      mockTransactionModel.create.mockResolvedValue(mockTransaction);

      const result = await service.create(createTransactionDto);

      expect(mockTransactionModel.create).toHaveBeenCalledWith(
        createTransactionDto,
      );
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('updateStage', () => {
    it('should update transaction stage successfully', async () => {
      const updateStageDto: UpdateTransactionStageDto = {
        stage: TransactionStage.EARNEST_MONEY,
      };

      const updatedTransaction = {
        ...mockTransaction,
        stage: TransactionStage.EARNEST_MONEY,
      };

      mockTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTransaction),
        }),
      });
      mockTransactionModel.exec = jest
        .fn()
        .mockResolvedValue(updatedTransaction);

      const result = await service.updateStage(
        mockTransactionId,
        updateStageDto,
      );

      expect(result).toEqual(updatedTransaction);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const updateStageDto: UpdateTransactionStageDto = {
        stage: TransactionStage.EARNEST_MONEY,
      };

      mockTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.updateStage(mockTransactionId, updateStageDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid stage transition', async () => {
      const updateStageDto: UpdateTransactionStageDto = {
        stage: TransactionStage.COMPLETED, // Geçersiz geçiş
      };

      mockTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTransaction),
        }),
      });

      await expect(
        service.updateStage(mockTransactionId, updateStageDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process commission when transaction is completed', async () => {
      const updateStageDto: UpdateTransactionStageDto = {
        stage: TransactionStage.COMPLETED,
      };

      const updatedTransaction = {
        ...mockTransaction,
        stage: TransactionStage.COMPLETED,
      };

      mockTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTransaction),
        }),
      });
      mockTransactionModel.exec = jest
        .fn()
        .mockResolvedValue(updatedTransaction);
      mockCommissionCalculationService.processCompletedTransaction.mockResolvedValue(
        {
          agencyCommission: 50000,
          totalAgentCommission: 50000,
          listingAgentCommission: 50000,
          sellingAgentCommission: 0,
          listingAgentId: new Types.ObjectId(mockAgentId),
          sellingAgentId: new Types.ObjectId(mockAgentId),
        },
      );

      await service.updateStage(mockTransactionId, updateStageDto);

      expect(
        mockCommissionCalculationService.processCompletedTransaction,
      ).toHaveBeenCalledWith(mockTransactionId);
    });
  });

  describe('isValidStageTransition', () => {
    it('should return true for valid transitions', () => {
      expect(
        service['isValidStageTransition'](
          TransactionStage.AGREEMENT,
          TransactionStage.EARNEST_MONEY,
        ),
      ).toBe(true);
      expect(
        service['isValidStageTransition'](
          TransactionStage.EARNEST_MONEY,
          TransactionStage.TITLE_DEED,
        ),
      ).toBe(true);
      expect(
        service['isValidStageTransition'](
          TransactionStage.TITLE_DEED,
          TransactionStage.COMPLETED,
        ),
      ).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(
        service['isValidStageTransition'](
          TransactionStage.AGREEMENT,
          TransactionStage.COMPLETED,
        ),
      ).toBe(false);
      expect(
        service['isValidStageTransition'](
          TransactionStage.COMPLETED,
          TransactionStage.AGREEMENT,
        ),
      ).toBe(false);
    });
  });

  describe('calculateFinancialBreakdown', () => {
    it('should calculate commission correctly for same agent', () => {
      const transaction = {
        ...mockTransaction,
        totalServiceFee: 100000,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId(mockAgentId), // Aynı ajan
      };

      const result = service['calculateFinancialBreakdown'](transaction);

      expect(result.agencyCommission).toBe(50000); // %50
      expect(result.totalAgentCommission).toBe(50000); // %50
      expect(result.listingAgentCommission).toBe(50000); // %100 of agent commission
      expect(result.sellingAgentCommission).toBe(0);
    });

    it('should calculate commission correctly for different agents', () => {
      const transaction = {
        ...mockTransaction,
        totalServiceFee: 100000,
        listingAgentId: new Types.ObjectId(mockAgentId),
        sellingAgentId: new Types.ObjectId('507f1f77bcf86cd799439013'), // Farklı ajan
      };

      const result = service['calculateFinancialBreakdown'](transaction);

      expect(result.agencyCommission).toBe(50000); // %50
      expect(result.totalAgentCommission).toBe(50000); // %50
      expect(result.listingAgentCommission).toBe(25000); // %50 of agent commission
      expect(result.sellingAgentCommission).toBe(25000); // %50 of agent commission
    });
  });
});
