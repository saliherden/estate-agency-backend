import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CommissionStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class Commission extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Transaction' })
  transactionId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  agentId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  commissionType: string;
  @Prop({
    required: true,
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status: CommissionStatus;

  @Prop({ type: Date })
  paidDate?: Date;

  @Prop({ type: String })
  notes?: string;
}

export const CommissionSchema = SchemaFactory.createForClass(Commission);

// Index'ler
CommissionSchema.index({ transactionId: 1 }); // İşlem bazlı sorgulama
CommissionSchema.index({ agentId: 1 }); // Ajan bazlı raporlama
CommissionSchema.index({ status: 1 }); // Durum bazlı filtreleme
CommissionSchema.index({ createdAt: -1 }); // Tarih bazlı sıralama
