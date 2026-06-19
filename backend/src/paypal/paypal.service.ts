import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrderRequest,
  OrdersController,
} from '@paypal/paypal-server-sdk';

@Injectable()
export class PayPalService {
  normalizeAmount(amount?: string | null, message = 'El monto debe incluir un numero valido') {
    const match = amount?.match(/\d+(?:[.,]\d{1,2})?/);

    if (!match) {
      throw new BadRequestException(message);
    }

    const normalizedAmount = Number(match[0].replace(',', '.'));

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    return normalizedAmount.toFixed(2);
  }

  async createOrder(input: {
    referenceId: string;
    customId: string;
    description: string;
    currency: string;
    amount: string;
  }) {
    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: input.referenceId,
          customId: input.customId,
          description: input.description,
          amount: {
            currencyCode: input.currency,
            value: input.amount,
          },
        },
      ],
    };

    const orderResponse = await this.withPayPalError(
      () =>
        new OrdersController(this.createClient()).createOrder({
          body: orderRequest,
          prefer: 'return=representation',
        }),
      'PayPal rechazo la orden',
    );

    const orderId = orderResponse.result.id;

    if (!orderId) {
      throw new Error('PayPal no devolvio un id de orden');
    }

    return orderId;
  }

  async captureOrder(orderId: string) {
    const captureResponse = await this.withPayPalError(
      () =>
        new OrdersController(this.createClient()).captureOrder({
          id: orderId,
          prefer: 'return=representation',
        }),
      'PayPal rechazo la captura',
    );

    return captureResponse.result.status === 'COMPLETED';
  }

  private createClient() {
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

  private async withPayPalError<T>(callback: () => Promise<T>, fallback: string) {
    try {
      return await callback();
    } catch (error) {
      const paypalError = error as {
        result?: { message?: string; details?: { description?: string }[] };
      };
      const detail = paypalError.result?.details?.[0]?.description;

      throw new BadRequestException(
        detail || paypalError.result?.message || fallback,
      );
    }
  }
}
