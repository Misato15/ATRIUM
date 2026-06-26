import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDigitalProductDto } from './dto/create-digital-product.dto';
import { UpdateDigitalProductDto } from './dto/update-digital-product.dto';
import { DigitalProductsService } from './digital-products.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: number;
    email: string;
  };
};

@Controller('digital-products')
export class DigitalProductsController {
  constructor(private readonly digitalProductsService: DigitalProductsService) {}

  @Get()
  findPublished() {
    return this.digitalProductsService.findPublished();
  }

  @Get('products/:id')
  findPublishedById(@Param('id', ParseIntPipe) id: number) {
    return this.digitalProductsService.findPublishedById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.digitalProductsService.findMine(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createDigitalProductDto: CreateDigitalProductDto,
  ) {
    return this.digitalProductsService.create(
      request.user.userId,
      createDigitalProductDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() updateDigitalProductDto: UpdateDigitalProductDto,
  ) {
    return this.digitalProductsService.update(
      request.user.userId,
      id,
      updateDigitalProductDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/checkout')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.digitalProductsService.createCheckout(
      request.user.userId,
      id,
    );
  }

  @Get('checkout/:providerOrderId')
  findCheckout(@Param('providerOrderId') providerOrderId: string) {
    return this.digitalProductsService.findCheckout(providerOrderId);
  }

  @Post('paypal-orders/:paypalOrderId/capture')
  capturePayPalOrder(@Param('paypalOrderId') paypalOrderId: string) {
    return this.digitalProductsService.capturePayPalOrder(paypalOrderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('purchases/me')
  findMyPurchases(@Req() request: AuthenticatedRequest) {
    return this.digitalProductsService.findMyPurchases(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('purchases/:id/download')
  download(
    @Param('id', ParseIntPipe) id: number,
    @Query('assetId') assetId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.digitalProductsService.getDownloadUrl(
      request.user.userId,
      id,
      assetId ? Number(assetId) : undefined,
    );
  }
}
