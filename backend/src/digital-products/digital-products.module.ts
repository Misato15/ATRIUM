import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PayPalModule } from '../paypal/paypal.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DigitalProductsController } from './digital-products.controller';
import { DigitalProductsService } from './digital-products.service';

@Module({
  imports: [PrismaModule, CloudinaryModule, PayPalModule],
  controllers: [DigitalProductsController],
  providers: [DigitalProductsService],
})
export class DigitalProductsModule {}
