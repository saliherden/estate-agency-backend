import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Commission,
  CommissionSchema,
} from '../../models/commissions/commission.schema';
import { CommissionsService } from '../../services/commissions/commissions.service';
import { CommissionsController } from '../../controllers/commissions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commission.name, schema: CommissionSchema },
    ]),
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
