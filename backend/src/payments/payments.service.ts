
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
import { PayPalService } from '../paypal/paypal.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly paypalService: PayPalService,
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
        purpose: true,
        description: true,
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
          purpose: 'COMMISSION',
        },
      });

    if (existingPaymentTransaction) {
      throw new ConflictException(
        'Esta solicitud ya tiene un pago registrado',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const paymentTransaction = await transaction.paymentTransaction.create({
        data: {
          commissionRequestId,
          amount: this.paypalService.normalizeAmount(
            createPaymentTransactionDto.amount,
          ),
          currency: createPaymentTransactionDto.currency ?? 'USD',
          purpose: 'COMMISSION',
        },
      });

      await transaction.commissionRequest.update({
        where: {
          id: commissionRequestId,
        },
        data: {
          status: 'PAYMENT_PENDING',
        },
      });

      return paymentTransaction;
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
    async createPayPalOrder(paymentTransactionId: number, userId: number) {
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

    const canManagePayment =
      paymentTransaction.commissionRequest.artistProfile.userId === userId ||
      paymentTransaction.commissionRequest.clientUserId === userId;

    if (!canManagePayment) {
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

    const paypalAmount = this.paypalService.normalizeAmount(
      paymentTransaction.amount,
    );
    const paypalOrderId = await this.paypalService.createOrder({
      referenceId: `atrium-payment-${paymentTransaction.id}`,
      customId: String(paymentTransaction.id),
      description:
        paymentTransaction.description ||
        `Comision Atrium #${paymentTransaction.commissionRequest.id}`,
      currency: paymentTransaction.currency,
      amount: paypalAmount,
    });

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

    const nextStatus = (await this.paypalService.captureOrder(paypalOrderId))
      ? 'PAID'
      : 'FAILED';

    return this.prisma.$transaction(async (transaction) => {
      await transaction.paymentTransaction.update({
        where: {
          id: paymentTransaction.id,
        },
        data: {
          status: nextStatus,
        },
      });

      if (nextStatus === 'PAID') {
        if (paymentTransaction.purpose === 'COMMISSION') {
          await transaction.commissionRequest.update({
            where: {
              id: paymentTransaction.commissionRequestId,
            },
            data: {
              status: 'IN_PROGRESS',
            },
          });
        }
      }

      return transaction.paymentTransaction.findUnique({
        where: {
          id: paymentTransaction.id,
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
    });
  }
  
}
