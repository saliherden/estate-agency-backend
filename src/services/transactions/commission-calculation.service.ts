import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionStage,
  FinancialBreakdown,
} from '../../models/transactions/transaction.schema';
import {
  Commission,
  CommissionStatus,
} from '../../models/commissions/commission.schema';
import { AgentsService } from '../agents/agents.service';

// Komisyon hesaplama servisi - iş mantığının kalbi
@Injectable()
export class CommissionCalculationService {
  private readonly logger = new Logger(CommissionCalculationService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Commission.name) private commissionModel: Model<Commission>,
    private agentsService: AgentsService,
  ) {}

  // Tamamlanan işlem için komisyonları otomatik olarak hesaplar ve oluşturur
  async processCompletedTransaction(
    transactionId: string,
  ): Promise<FinancialBreakdown> {
    this.logger.log(`Processing commission for transaction: ${transactionId}`);

    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('listingAgentId', 'firstName lastName email')
      .populate('sellingAgentId', 'firstName lastName email');

    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    if (transaction.stage !== TransactionStage.COMPLETED) {
      throw new Error(
        `Transaction must be completed to process commissions. Current stage: ${transaction.stage}`,
      );
    }

    // Finansal dağılımı hesapla
    const financialBreakdown = this.calculateFinancialBreakdown(transaction);

    // İşlem dokümanını güncelle
    transaction.financialBreakdown = financialBreakdown;
    await transaction.save();

    // Komisyon kayıtlarını oluştur
    await this.createCommissionRecords(transactionId, financialBreakdown);

    // Ajan istatistiklerini güncelle
    await this.updateAgentStats(financialBreakdown);

    this.logger.log(
      `Commission processed successfully for transaction: ${transactionId}`,
    );
    return financialBreakdown;
  }

  // Komisyon dağılımını hesaplar - kuralların uygulandığı yer
  private calculateFinancialBreakdown(
    transaction: Transaction,
  ): FinancialBreakdown {
    const totalServiceFee = transaction.totalServiceFee;

    // Şirket ve ajanlar arası %50/%50 dağılım
    const agencyCommission = totalServiceFee * 0.5;
    const totalAgentCommission = totalServiceFee * 0.5;

    let listingAgentCommission: number;
    let sellingAgentCommission: number;

    // Ajanların aynı olup olmadığına göre komisyon dağılımı
    const isSameAgent =
      transaction.listingAgentId.toString() ===
      transaction.sellingAgentId.toString();

    if (isSameAgent) {
      // Senaryo 1: Aynı ajan - tüm ajan komisyonunu alır
      listingAgentCommission = totalAgentCommission;
      sellingAgentCommission = 0;

      this.logger.log(
        `Same agent scenario: Agent gets 100% of agent commission (${listingAgentCommission})`,
      );
    } else {
      // Senaryo 2: Farklı ajanlar - komisyonu eşit paylaşır
      listingAgentCommission = totalAgentCommission * 0.5;
      sellingAgentCommission = totalAgentCommission * 0.5;

      this.logger.log(
        `Different agents scenario: Listing agent (${listingAgentCommission}), Selling agent (${sellingAgentCommission})`,
      );
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

  // Komisyon kayıtlarını veritabanına oluşturur
  private async createCommissionRecords(
    transactionId: string,
    financialBreakdown: FinancialBreakdown,
  ): Promise<void> {
    const commissions: any[] = [];

    // Şirket komisyonu
    if (financialBreakdown.agencyCommission > 0) {
      commissions.push({
        transactionId: new Types.ObjectId(transactionId),
        agentId: null, // Şirket komisyonu için ajan yok
        amount: financialBreakdown.agencyCommission,
        commissionType: 'agency',
        status: CommissionStatus.PENDING,
        notes: 'Şirket komisyonu',
      });
    }

    // Listeleme ajanı komisyonu
    if (financialBreakdown.listingAgentCommission > 0) {
      commissions.push({
        transactionId: new Types.ObjectId(transactionId),
        agentId: financialBreakdown.listingAgentId,
        amount: financialBreakdown.listingAgentCommission,
        commissionType: 'listing',
        status: CommissionStatus.PENDING,
        notes: 'Listeleme komisyonu',
      });
    }

    // Satış ajanı komisyonu (farklı ajan ve komisyon > 0 ise)
    if (financialBreakdown.sellingAgentCommission > 0) {
      commissions.push({
        transactionId: new Types.ObjectId(transactionId),
        agentId: financialBreakdown.sellingAgentId,
        amount: financialBreakdown.sellingAgentCommission,
        commissionType: 'selling',
        status: CommissionStatus.PENDING,
        notes: 'Satış komisyonu',
      });
    }

    // Tüm komisyonları veritabanına kaydet
    await this.commissionModel.insertMany(commissions);

    this.logger.log(
      `Created ${commissions.length} commission records for transaction: ${transactionId}`,
    );
  }

  // Ajanların istatistiklerini günceller
  private async updateAgentStats(
    financialBreakdown: FinancialBreakdown,
  ): Promise<void> {
    // Listeleme ajanı istatistiklerini güncelle
    if (financialBreakdown.listingAgentCommission > 0) {
      await this.agentsService.updateCommissionStats(
        financialBreakdown.listingAgentId.toString(),
        financialBreakdown.listingAgentCommission,
      );
    }

    // Satış ajanı istatistiklerini güncelle (farklı ajan ise)
    if (financialBreakdown.sellingAgentCommission > 0) {
      const listingId = financialBreakdown.listingAgentId.toString();
      const sellingId = financialBreakdown.sellingAgentId.toString();

      if (listingId !== sellingId) {
        await this.agentsService.updateCommissionStats(
          sellingId,
          financialBreakdown.sellingAgentCommission,
        );
      }
    }

    this.logger.log('Agent statistics updated successfully');
  }

  // Komisyon hesaplama simülasyonu - işlem tamamlanmadan önce tahmin için
  simulateCommissionCalculation(
    totalServiceFee: number,
    listingAgentId: string,
    sellingAgentId: string,
  ): FinancialBreakdown {
    const isSameAgent = listingAgentId === sellingAgentId;

    const agencyCommission = totalServiceFee * 0.5;
    const totalAgentCommission = totalServiceFee * 0.5;

    let listingAgentCommission: number;
    let sellingAgentCommission: number;

    if (isSameAgent) {
      listingAgentCommission = totalAgentCommission;
      sellingAgentCommission = 0;
    } else {
      listingAgentCommission = totalAgentCommission * 0.5;
      sellingAgentCommission = totalAgentCommission * 0.5;
    }

    return {
      agencyCommission,
      totalAgentCommission,
      listingAgentCommission,
      sellingAgentCommission,
      listingAgentId: new Types.ObjectId(listingAgentId),
      sellingAgentId: new Types.ObjectId(sellingAgentId),
    };
  }

  // Komisyon kurallarını doğrular
  validateCommissionRules(financialBreakdown: FinancialBreakdown): boolean {
    const {
      agencyCommission,
      totalAgentCommission,
      listingAgentCommission,
      sellingAgentCommission,
    } = financialBreakdown;

    // Toplam komisyonun doğru dağıtıldığını kontrol et
    const totalCalculated =
      agencyCommission + listingAgentCommission + sellingAgentCommission;
    const expectedTotal = agencyCommission + totalAgentCommission;

    if (Math.abs(totalCalculated - expectedTotal) > 0.01) {
      this.logger.error(
        `Commission validation failed: Total mismatch. Expected: ${expectedTotal}, Calculated: ${totalCalculated}`,
      );
      return false;
    }

    // Şirket komisyonunun %50 olduğunu kontrol et
    const totalServiceFee = totalCalculated;
    const expectedAgencyCommission = totalServiceFee * 0.5;

    if (Math.abs(agencyCommission - expectedAgencyCommission) > 0.01) {
      this.logger.error(
        `Commission validation failed: Agency commission mismatch. Expected: ${expectedAgencyCommission}, Actual: ${agencyCommission}`,
      );
      return false;
    }

    return true;
  }
}
