import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Commission,
  CommissionStatus,
} from '../../models/commissions/commission.schema';
import { CreateCommissionDto } from '../../dtos/commissions/create-commission.dto';
import { UpdateCommissionDto } from '../../dtos/commissions/update-commission.dto';
import { FinancialBreakdown } from 'src/models/transactions/transaction.schema';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectModel(Commission.name) private commissionModel: Model<Commission>,
  ) {}

  // Yeni komisyon kaydı oluşturur
  async create(createCommissionDto: CreateCommissionDto): Promise<Commission> {
    const commission = new this.commissionModel(createCommissionDto);
    return commission.save();
  }

  // Tüm komisyonları listeler
  async findAll(): Promise<Commission[]> {
    return this.commissionModel
      .find()
      .populate('transactionId', 'propertyAddress totalServiceFee')
      .populate('agentId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ID'ye göre komisyon bulur
  async findOne(id: string): Promise<Commission> {
    const commission = await this.commissionModel
      .findById(id)
      .populate('transactionId', 'propertyAddress totalServiceFee')
      .populate('agentId', 'firstName lastName email')
      .exec();

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }

    return commission;
  }

  // Komisyon durumunu günceller
  async updateStatus(
    id: string,
    updateCommissionDto: UpdateCommissionDto,
  ): Promise<Commission> {
    const commission = await this.findOne(id);

    // Durum geçişlerini kontrol et
    if (
      !this.isValidStatusTransition(
        commission.status,
        updateCommissionDto.status,
      )
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${commission.status} to ${updateCommissionDto.status}`,
      );
    }

    commission.status = updateCommissionDto.status;

    // Eğer ödendi ise, ödeme tarihini kaydet
    if (updateCommissionDto.status === CommissionStatus.PAID) {
      commission.paidDate = new Date();
    }

    if (updateCommissionDto.notes) {
      commission.notes = updateCommissionDto.notes;
    }

    return commission.save();
  }

  // Geçerli durum geçişlerini kontrol eder
  private isValidStatusTransition(
    currentStatus: CommissionStatus,
    newStatus: CommissionStatus,
  ): boolean {
    const validTransitions: Record<CommissionStatus, CommissionStatus[]> = {
      [CommissionStatus.PENDING]: [
        CommissionStatus.PROCESSED,
        CommissionStatus.PAID,
      ],
      [CommissionStatus.PROCESSED]: [CommissionStatus.PAID],
      [CommissionStatus.PAID]: [], // Ödenen komisyon durumu değiştirilemez
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Ajan bazlı komisyonları listeler
  async findByAgent(agentId: string): Promise<Commission[]> {
    return this.commissionModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .populate('transactionId', 'propertyAddress totalServiceFee')
      .populate('agentId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Duruma göre komisyonları filtreler
  async findByStatus(status: CommissionStatus): Promise<Commission[]> {
    return this.commissionModel
      .find({ status })
      .populate('transactionId', 'propertyAddress totalServiceFee')
      .populate('agentId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // İşlem bazlı komisyonları listeler
  async findByTransaction(transactionId: string): Promise<Commission[]> {
    return this.commissionModel
      .find({ transactionId: new Types.ObjectId(transactionId) })
      .populate('transactionId', 'propertyAddress totalServiceFee')
      .populate('agentId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Ödenecek komisyonları listeler
  async getPendingCommissions(): Promise<Commission[]> {
    return this.findByStatus(CommissionStatus.PENDING);
  }

  // Ajanın komisyon özetini verir
  async getAgentCommissionSummary(agentId: string) {
    const commissions = await this.findByAgent(agentId);

    const totalEarned = commissions
      .filter((c) => c.status === CommissionStatus.PAID)
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingAmount = commissions
      .filter((c) => c.status === CommissionStatus.PENDING)
      .reduce((sum, c) => sum + c.amount, 0);

    const processedAmount = commissions
      .filter((c) => c.status === CommissionStatus.PROCESSED)
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      agentId,
      totalEarned,
      pendingAmount,
      processedAmount,
      totalTransactions: commissions.length,
      paidTransactions: commissions.filter(
        (c) => c.status === CommissionStatus.PAID,
      ).length,
    };
  }

  // Tüm komisyonların genel özetini verir
  async getOverallCommissionSummary() {
    const commissions = await this.findAll();

    const totalCommissionPool = commissions.reduce(
      (sum, c) => sum + c.amount,
      0,
    );
    const paidTotal = commissions
      .filter((c) => c.status === CommissionStatus.PAID)
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingTotal = commissions
      .filter((c) => c.status === CommissionStatus.PENDING)
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCommissionPool,
      paidTotal,
      pendingTotal,
      processedTotal: totalCommissionPool - paidTotal - pendingTotal,
      totalCommissions: commissions.length,
      paidCommissions: commissions.filter(
        (c) => c.status === CommissionStatus.PAID,
      ).length,
      pendingCommissions: commissions.filter(
        (c) => c.status === CommissionStatus.PENDING,
      ).length,
    };
  }

  // Otomatik komisyon oluşturma - tamamlanan işlemler için
  async createCommissionsForCompletedTransaction(
    transactionId: string,
    financialBreakdown: FinancialBreakdown,
  ): Promise<Commission[]> {
    const commissions: Commission[] = [];

    // Şirket komisyonu
    if (financialBreakdown.agencyCommission > 0) {
      const agencyCommission = new this.commissionModel({
        transactionId: new Types.ObjectId(transactionId),
        agentId: null, // Şirket komisyonu için ajan yok
        amount: financialBreakdown.agencyCommission,
        commissionType: 'agency',
        status: CommissionStatus.PENDING,
      });
      commissions.push(await agencyCommission.save());
    }

    // Listeleme ajanı komisyonu
    if (financialBreakdown.listingAgentCommission > 0) {
      const listingCommission = new this.commissionModel({
        transactionId: new Types.ObjectId(transactionId),
        agentId: financialBreakdown.listingAgentId,
        amount: financialBreakdown.listingAgentCommission,
        commissionType: 'listing',
        status: CommissionStatus.PENDING,
      });
      commissions.push(await listingCommission.save());
    }

    // Satış ajanı komisyonu (farklı ajan ise)
    if (financialBreakdown.sellingAgentCommission > 0) {
      const sellingCommission = new this.commissionModel({
        transactionId: new Types.ObjectId(transactionId),
        agentId: financialBreakdown.sellingAgentId,
        amount: financialBreakdown.sellingAgentCommission,
        commissionType: 'selling',
        status: CommissionStatus.PENDING,
      });
      commissions.push(await sellingCommission.save());
    }

    return commissions;
  }
}
