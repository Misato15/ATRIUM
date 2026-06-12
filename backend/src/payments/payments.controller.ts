import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & {
    user: {
        userId: number;
        email: string;
    };
};

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @UseGuards(JwtAuthGuard)
    @Post('commissions/:commissionRequestId')
    createPendingTransaction(
        @Param('commissionRequestId', ParseIntPipe) commissionRequestId: number,
        @Body() createPaymentTransactionDto: CreatePaymentTransactionDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.paymentsService.createPendingTransaction(
            commissionRequestId,
            request.user.userId,
            createPaymentTransactionDto,
        );

    }
    @UseGuards(JwtAuthGuard)
    @Get('me')
    findMyTransactions(@Req() request: AuthenticatedRequest) {
        return this.paymentsService.findMyTransactions(request.user.userId);
    }

    @Get('checkout/:providerOrderId')
    findCheckoutByPayPalOrderId(
        @Param('providerOrderId') providerOrderId: string,
    ) {
        return this.paymentsService.findCheckoutByPayPalOrderId(providerOrderId);
    }

    @Post('paypal-orders/:paypalOrderId/capture')
    capturePayPalOrder(
        @Param('paypalOrderId') paypalOrderId: string,
    ) {
        return this.paymentsService.capturePayPalOrder(paypalOrderId);
    }

  @UseGuards(JwtAuthGuard)
  @Post(':paymentTransactionId/paypal-order')
  createPayPalOrder(
    @Param('paymentTransactionId', ParseIntPipe) paymentTransactionId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPayPalOrder(
      paymentTransactionId,
      request.user.userId,
    );
  }
}
