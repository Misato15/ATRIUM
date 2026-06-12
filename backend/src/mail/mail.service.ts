import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

type SendCommissionRequestEmailInput = {
  to: string;
  artistName: string;
  clientName: string;
  clientEmail: string;
  message: string;
  budget?: string | null;
};

type SendBasicEmailInput = {
  to: string;
  subject: string;
  lines: string[];
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = this.createTransporter();

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      },
    });
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  async verifyConnection() {
    if (!this.transporter) {
      return {
        configured: false,
        message: 'SMTP no esta configurado',
      };
    }

    await this.transporter.verify();

    return {
      configured: true,
      message: 'SMTP configurado correctamente',
    };
  }

  async sendTestEmail(to: string) {
    await this.sendBasicEmail({
      to,
      subject: 'Prueba de correo de Atrium',
      lines: [
        'Hola,',
        '',
        'Este es un correo de prueba de Atrium.',
        'Si recibiste este mensaje, la configuracion SMTP esta funcionando.',
      ],
    });

    return {
      sent: true,
      to,
    };
  }

  private async sendBasicEmail(input: SendBasicEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `Correo omitido para ${input.to}: SMTP no configurado. Asunto: ${input.subject}`,
      );
      return;
    }

    const from =
      process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER;

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.lines.join('\n'),
    });
  }

  async sendCommissionRequestEmail(
    input: SendCommissionRequestEmailInput,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `Correo de comision omitido para ${input.to}: SMTP no configurado.`,
      );
      return;
    }

    const from =
      process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER;
    const subject = `Nueva solicitud de comision en Atrium`;

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject,
      text: [
        `Hola ${input.artistName},`,
        '',
        `${input.clientName} envio una nueva solicitud de comision desde Atrium.`,
        '',
        `Correo del cliente: ${input.clientEmail}`,
        `Presupuesto: ${input.budget || 'No especificado'}`,
        '',
        'Mensaje:',
        input.message,
        '',
        'Entra a tu dashboard para revisar, aceptar o rechazar la solicitud.',
      ].join('\n'),
    });
  }

  async sendCommissionReviewEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Tu solicitud esta en revision en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} marco tu solicitud como en revision.`,
        'Te notificaremos cuando el artista envie una propuesta o tome una decision.',
      ],
    });
  }

  async sendCommissionProposalEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    quotedPrice?: string | null;
    artistResponse?: string | null;
    proposalUrl: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Recibiste una propuesta de comision en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} envio una propuesta para tu solicitud.`,
        `Cotizacion: ${input.quotedPrice || 'No especificada'}`,
        '',
        'Mensaje del artista:',
        input.artistResponse || 'Sin mensaje adicional.',
        '',
        `Revisa y responde la propuesta aqui: ${input.proposalUrl}`,
      ],
    });
  }

  async sendCommissionRejectedEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    rejectionReason: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Tu solicitud de comision fue rechazada en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} rechazo tu solicitud de comision.`,
        '',
        'Motivo:',
        input.rejectionReason,
      ],
    });
  }

  async sendPaymentLinkEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    amount: string;
    currency: string;
    paymentUrl: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Enlace de pago para tu comision en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} confirmo tu comision.`,
        `Monto: ${input.amount} ${input.currency}`,
        '',
        `Puedes completar el pago aqui: ${input.paymentUrl}`,
      ],
    });
  }
}
