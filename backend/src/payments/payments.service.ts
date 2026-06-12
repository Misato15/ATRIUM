
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { MailService } from '../mail/mail.service';
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrderRequest,
  OrdersController,
} from '@paypal/paypal-server-sdk';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private getArtistDisplayName(artistProfile: {
    artistName?: string | null;
    fullName?: string | null;
  }) {
    return artistProfile.artistName || artistProfile.fullName || 'artista';
  }

  private createPayPalClient() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment =
      process.env.PAYPAL_ENVIRONMENT === 'production'
        ? Environment.Production
        : Environment.Sandbox;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal no esta configurado en el backend');
    }

    return new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      environment,
      timeout: 0,
    });
  }

  private normalizePaymentAmount(amount: string) {
    const match = amount.match(/\d+(?:[.,]\d{1,2})?/);

    if (!match) {
      throw new BadRequestException('El monto debe incluir un numero valido');
    }

    const normalizedAmount = Number(match[0].replace(',', '.'));

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    return normalizedAmount.toFixed(2);
  }

    findCheckoutByPayPalOrderId(paypalOrderId: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: {
        providerOrderId: paypalOrderId,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        provider: true,
        providerOrderId: true,
        commissionRequest: {
          select: {
            id: true,
            clientName: true,
            message: true,
            artistResponse: true,
            quotedPrice: true,
            artistProfile: {
              select: {
                id: true,
                fullName: true,
                artistName: true,
                location: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });
  }
  async createPendingTransaction(
    commissionRequestId: number,
    artistUserId: number,
    createPaymentTransactionDto: CreatePaymentTransactionDto,
  ) {
    const commissionRequest = await this.prisma.commissionRequest.findUnique({
      where: { id: commissionRequestId },
      include: {
        artistProfile: true,
      },
    });

    if (!commissionRequest) {
      throw new NotFoundException('Solicitud de comision no encontrada');
    }

    if (commissionRequest.artistProfile.userId !== artistUserId) {
      throw new ForbiddenException('No puedes crear pagos para esta solicitud');
    }

    if (commissionRequest.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Solo puedes generar pago para comisiones aceptadas',
      );
    }

    const existingPaymentTransaction =
      await this.prisma.paymentTransaction.findFirst({
        where: {
          commissionRequestId,
        },
      });

    if (existingPaymentTransaction) {
      throw new ConflictException(
        'Esta solicitud ya tiene un pago registrado',
      );
    }

    return this.prisma.paymentTransaction.create({
      data: {
        commissionRequestId,
        amount: this.normalizePaymentAmount(createPaymentTransactionDto.amount),
        currency: createPaymentTransactionDto.currency ?? 'USD',
      },
    });
  }
    findMyTransactions(artistUserId: number) {
    return this.prisma.paymentTransaction.findMany({
      where: {
        commissionRequest: {
          artistProfile: {
            userId: artistUserId,
          },
        },
      },
      include: {
        commissionRequest: {
          select: {
            id: true,
            clientName: true,
            clientEmail: true,
            message: true,
            status: true,
            quotedPrice: true,
            artistResponse: true,
            artistProfile: {
              select: {
                id: true,
                fullName: true,
                artistName: true,
                location: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
    async createPayPalOrder(paymentTransactionId: number, artistUserId: number) {
    const paymentTransaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      include: {
        commissionRequest: {
          include: {
            artistProfile: true,
          },
        },
      },
    });

    if (!paymentTransaction) {
      throw new NotFoundException('Transaccion de pago no encontrada');
    }

    if (paymentTransaction.commissionRequest.artistProfile.userId !== artistUserId) {
      throw new ForbiddenException('No puedes crear esta orden de pago');
    }

    if (paymentTransaction.status !== 'PENDING') {
      throw new ConflictException('Solo se pueden pagar transacciones pendientes');
    }

    if (paymentTransaction.providerOrderId) {
      return this.prisma.paymentTransaction.findUnique({
        where: { id: paymentTransaction.id },
        include: {
          commissionRequest: {
            select: {
              id: true,
              clientName: true,
              clientEmail: true,
              status: true,
              quotedPrice: true,
              artistResponse: true,
            },
          },
        },
      });
    }

    const paypalClient = this.createPayPalClient();
    const paypalAmount = this.normalizePaymentAmount(paymentTransaction.amount);

    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: `atrium-payment-${paymentTransaction.id}`,
          customId: String(paymentTransaction.id),
          description: `Comision Atrium #${paymentTransaction.commissionRequest.id}`,
          amount: {
            currencyCode: paymentTransaction.currency,
            value: paypalAmount,
          },
        },
      ],
    };

   const ordersController = new OrdersController(paypalClient);

    let orderResponse;

    try {
      orderResponse = await ordersController.createOrder({
        body: orderRequest,
        prefer: 'return=representation',
      });
    } catch (error) {
      const paypalError = error as {
        result?: { message?: string; details?: { description?: string }[] };
      };
      const detail = paypalError.result?.details?.[0]?.description;

      throw new BadRequestException(
        detail || paypalError.result?.message || 'PayPal rechazo la orden',
      );
    }

    const paypalOrderId = orderResponse.result.id;

    if (!paypalOrderId) {
      throw new Error('PayPal no devolvio un id de orden');
    }

    const updatedPaymentTransaction = await this.prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: {
        amount: paypalAmount,
        providerOrderId: paypalOrderId,
      },
      include: {
        commissionRequest: {
          select: {
            id: true,
            clientName: true,
            clientEmail: true,
            message: true,
            status: true,
            quotedPrice: true,
            artistResponse: true,
            artistProfile: {
              select: {
                id: true,
                fullName: true,
                artistName: true,
                location: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });

    await this.mailService
      .sendPaymentLinkEmail({
        to: paymentTransaction.commissionRequest.clientEmail,
        clientName: paymentTransaction.commissionRequest.clientName,
        artistName: this.getArtistDisplayName(
          paymentTransaction.commissionRequest.artistProfile,
        ),
        amount: paypalAmount,
        currency: paymentTransaction.currency,
        paymentUrl: `${this.getFrontendUrl()}/payments/checkout/${paypalOrderId}`,
      })
      .catch(() => undefined);

    return updatedPaymentTransaction;
  }
    async capturePayPalOrder(paypalOrderId: string) {
    const paymentTransaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        providerOrderId: paypalOrderId,
      },
      include: {
        commissionRequest: {
          include: {
            artistProfile: true,
          },
        },
      },
    });

    if (!paymentTransaction) {
      throw new NotFoundException('Transaccion de pago no encontrada');
    }

    if (paymentTransaction.status !== 'PENDING') {
      throw new ConflictException('Solo se pueden capturar pagos pendientes');
    }

    const paypalClient = this.createPayPalClient();
    const ordersController = new OrdersController(paypalClient);

    let captureResponse;

    try {
      captureResponse = await ordersController.captureOrder({
        id: paypalOrderId,
        prefer: 'return=representation',
      });
    } catch (error) {
      const paypalError = error as {
        result?: { message?: string; details?: { description?: string }[] };
      };
      const detail = paypalError.result?.details?.[0]?.description;

      throw new BadRequestException(
        detail || paypalError.result?.message || 'PayPal rechazo la captura',
      );
    }

    const nextStatus =
      captureResponse.result.status === 'COMPLETED' ? 'PAID' : 'FAILED';

    return this.prisma.paymentTransaction.update({
      where: {
        id: paymentTransaction.id,
      },
      data: {
        status: nextStatus,
      },
      include: {
        commissionRequest: {
          select: {
            id: true,
            clientName: true,
            clientEmail: true,
            status: true,
            quotedPrice: true,
            artistResponse: true,
          },
        },
      },
    });
  }
  
}
