import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TransactionStage {
  AGREEMENT = 'agreement',
  EARNEST_MONEY = 'earnest_money',
  TITLE_DEED = 'title_deed',
  COMPLETED = 'completed',
}

@Schema()
export class FinancialBreakdown {
  @Prop({ required: true })
  agencyCommission: number;

  @Prop({ required: true })
  totalAgentCommission: number;

  @Prop({ required: true })
  listingAgentCommission: number;

  @Prop({ required: true })
  sellingAgentCommission: number;

  @Prop({ required: true })
  listingAgentId: Types.ObjectId;

  @Prop({ required: true })
  sellingAgentId: Types.ObjectId;
}

export const FinancialBreakdownSchema =
  SchemaFactory.createForClass(FinancialBreakdown);

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  propertyAddress: string;

  @Prop({ required: true })
  propertyType: string;

  @Prop({ required: true })
  totalServiceFee: number;

  @Prop({
    required: true,
    enum: TransactionStage,
    default: TransactionStage.AGREEMENT,
  })
  stage: TransactionStage;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  listingAgentId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  sellingAgentId: Types.ObjectId;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: true })
  clientContact: string;

  @Prop({ type: FinancialBreakdownSchema })
  financialBreakdown?: FinancialBreakdown;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ stage: 1 });
TransactionSchema.index({ listingAgentId: 1 });
TransactionSchema.index({ sellingAgentId: 1 });
TransactionSchema.index({ createdAt: -1 });
