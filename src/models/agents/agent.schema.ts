import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AgentType {
  LISTING = 'listing',
  SELLING = 'selling',
  BOTH = 'both',
}

@Schema({ timestamps: true })
export class Agent extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  phone: string;
  @Prop({ required: true, enum: AgentType, default: AgentType.BOTH })
  type: AgentType;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  totalCommissionEarned: number;

  @Prop({ default: 0 })
  transactionCount: number;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);

AgentSchema.index({ email: 1 });
AgentSchema.index({ isActive: 1 });
AgentSchema.index({ totalCommissionEarned: -1 });
