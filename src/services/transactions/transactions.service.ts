import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionStage,
  FinancialBreakdown,
} from '../../models/transactions/transaction.schema';
import { CreateTransactionDto } from '../../dtos/transactions/create-transaction.dto';
import { UpdateTransactionStageDto } from '../../dtos/transactions/update-transaction-stage.dto';
import { CommissionCalculationService } from './commission-calculation.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private commissionCalculationService: CommissionCalculationService,
  ) {}

  // Yeni işlem oluşturur
  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionModel.create(createTransactionDto);
  }

  // Tüm işlemleri listeler
  async findAll(): Promise<Transaction[]> {
    return this.transactionModel
      .find()
      .populate('listingAgentId', 'firstName lastName email')
      .populate('sellingAgentId', 'firstName lastName email')
      .exec();
  }

  // ID'ye göre işlem bulur
  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findById(id)
      .populate('listingAgentId', 'firstName lastName email')
      .populate('sellingAgentId', 'firstName lastName email')
      .exec();

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  // İşlem aşamasını günceller - en kritik metod
  async updateStage(
    id: string,
    updateStageDto: UpdateTransactionStageDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id);

    // Aşama geçiş kurallarını kontrol et
    if (!this.isValidStageTransition(transaction.stage, updateStageDto.stage)) {
      throw new BadRequestException(
        `Invalid stage transition from ${transaction.stage} to ${updateStageDto.stage}`,
      );
    }

    transaction.stage = updateStageDto.stage;

    // Eğer işlem tamamlandıysa, komisyon hesaplamasını otomatik olarak tetikle
    if (updateStageDto.stage === TransactionStage.COMPLETED) {
      transaction.financialBreakdown =
        await this.commissionCalculationService.processCompletedTransaction(
          transaction._id.toString(),
        );
    }

    return transaction.save();
  }

  // Geçerli aşama geçişlerini kontrol eder
  private isValidStageTransition(
    currentStage: TransactionStage,
    newStage: TransactionStage,
  ): boolean {
    const validTransitions: Record<TransactionStage, TransactionStage[]> = {
      [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
      [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
      [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
      [TransactionStage.COMPLETED]: [], // Tamamlanan işlem geri alınamaz
    };

    return validTransitions[currentStage]?.includes(newStage) || false;
  }

  // Finansal dağılımı hesaplar - iş mantığının kalbi
  private calculateFinancialBreakdown(
    transaction: Transaction,
  ): FinancialBreakdown {
    const totalServiceFee = transaction.totalServiceFee;
    const agencyCommission = totalServiceFee * 0.5; // %50 şirket
    const totalAgentCommission = totalServiceFee * 0.5; // %50 ajanlar

    let listingAgentCommission: number;
    let sellingAgentCommission: number;

    // Ajanların aynı olup olmadığına göre komisyon dağılımı
    if (
      transaction.listingAgentId.toString() ===
      transaction.sellingAgentId.toString()
    ) {
      // Senaryo 1: Aynı ajan - %100 alır
      listingAgentCommission = totalAgentCommission;
      sellingAgentCommission = 0;
    } else {
      // Senaryo 2: Farklı ajanlar - %50/%50 paylaşır
      listingAgentCommission = totalAgentCommission * 0.5;
      sellingAgentCommission = totalAgentCommission * 0.5;
    }

    return {
      agencyCommission,
      totalAgentCommission,
      listingAgentCommission,
      sellingAgentCommission,
      listingAgentId: transaction.listingAgentId,
      sellingAgentId: transaction.sellingAgentId,
    };
  }

  // Aşamaya göre işlemleri filtreler
  async findByStage(stage: TransactionStage): Promise<Transaction[]> {
    return this.transactionModel
      .find({ stage })
      .populate('listingAgentId', 'firstName lastName email')
      .populate('sellingAgentId', 'firstName lastName email')
      .exec();
  }

  // Ajan bazlı işlemleri listeler
  async findByAgent(agentId: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({
        $or: [
          { listingAgentId: new Types.ObjectId(agentId) },
          { sellingAgentId: new Types.ObjectId(agentId) },
        ],
      })
      .populate('listingAgentId', 'firstName lastName email')
      .populate('sellingAgentId', 'firstName lastName email')
      .exec();
  }

  // Tamamlanan işlemlerin finansal özetini verir
  async getFinancialSummary(
    transactionId: string,
  ): Promise<FinancialBreakdown> {
    const transaction = await this.findOne(transactionId);

    if (transaction.stage !== TransactionStage.COMPLETED) {
      throw new BadRequestException(
        'Financial breakdown is only available for completed transactions',
      );
    }

    if (!transaction.financialBreakdown) {
      throw new NotFoundException('Financial breakdown not calculated');
    }

    return transaction.financialBreakdown;
  }
}
