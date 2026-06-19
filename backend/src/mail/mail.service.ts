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
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly resendFrom =
    process.env.RESEND_FROM ||
    process.env.MAIL_FROM ||
    'Atrium <onboarding@resend.dev>';

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
    return Boolean(this.resendApiKey || this.transporter);
  }

  async verifyConnection() {
    if (this.resendApiKey) {
      return {
        configured: true,
        message: 'Resend configurado correctamente',
      };
    }

    if (!this.transporter) {
      return {
        configured: false,
        message: 'Correo no configurado. Agrega RESEND_API_KEY.',
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
        'Si recibiste este mensaje, la configuracion de correo esta funcionando.',
      ],
    });

    return {
      sent: true,
      to,
    };
  }

  async sendEmailVerificationEmail(input: {
    to: string;
    name: string;
    verificationUrl: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Verifica tu correo en Atrium',
      lines: [
        `Hola ${input.name},`,
        '',
        'Confirma tu correo para activar tu cuenta de Atrium.',
        '',
        `Verificar correo: ${input.verificationUrl}`,
        '',
        'Este enlace vence en 24 horas.',
      ],
    });
  }

  private async sendBasicEmail(input: SendBasicEmailInput): Promise<void> {
    if (this.resendApiKey) {
      await this.sendWithResend(input);
      return;
    }

    if (!this.transporter) {
      this.logger.log(
        `Correo omitido para ${input.to}: RESEND_API_KEY no configurado. Asunto: ${input.subject}`,
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

  private async sendWithResend(input: SendBasicEmailInput): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.resendFrom,
        to: [input.to],
        subject: input.subject,
        text: input.lines.join('\n'),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `Resend no pudo enviar correo a ${input.to}. Status ${response.status}. ${errorBody}`,
      );
      throw new Error('Resend no pudo enviar el correo');
    }
  }

  async sendCommissionRequestEmail(
    input: SendCommissionRequestEmailInput,
  ): Promise<void> {
    const subject = `Nueva solicitud de comision en Atrium`;

    await this.sendBasicEmail({
      to: input.to,
      subject,
      lines: [
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
      ],
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

  async sendCommissionDeliveryEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    deliveryMessage: string;
    deliveryUrl?: string | null;
    clientResponseDeadline?: Date | null;
    reviewUrl: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Tu comision esta lista para revision en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} envio una entrega para tu comision.`,
        '',
        'Mensaje del artista:',
        input.deliveryMessage,
        '',
        input.deliveryUrl
          ? `Vista previa protegida: ${input.deliveryUrl}`
          : 'El artista no adjunto una vista previa externa.',
        input.clientResponseDeadline
          ? `Fecha limite para responder: ${input.clientResponseDeadline.toLocaleString('es-HN')}`
          : 'Responde desde Atrium para aprobar o pedir cambios.',
        '',
        `Revisa la entrega aqui: ${input.reviewUrl}`,
        'El archivo final se habilita cuando la entrega sea aprobada.',
      ],
    });
  }

  async sendJobApplicationEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    jobTitle: string;
    proposedPrice: string;
    message: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Nueva aplicacion a tu oferta en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} aplico a tu oferta "${input.jobTitle}".`,
        `Precio propuesto: ${input.proposedPrice}`,
        '',
        'Mensaje:',
        input.message,
        '',
        'Entra a Atrium para revisar la propuesta.',
      ],
    });
  }

  async sendJobApplicationDecisionEmail(input: {
    to: string;
    artistName: string;
    jobTitle: string;
    decision: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
  }) {
    const labels = {
      SHORTLISTED: 'preseleccionada',
      ACCEPTED: 'aceptada',
      REJECTED: 'rechazada',
    };

    await this.sendBasicEmail({
      to: input.to,
      subject: `Tu aplicacion fue ${labels[input.decision]} en Atrium`,
      lines: [
        `Hola ${input.artistName},`,
        '',
        `Tu aplicacion para "${input.jobTitle}" fue ${labels[input.decision]}.`,
        '',
        'Entra a Atrium para revisar el estado.',
      ],
    });
  }

  async sendJobApplicationWithdrawnEmail(input: {
    to: string;
    clientName: string;
    artistName: string;
    jobTitle: string;
  }) {
    await this.sendBasicEmail({
      to: input.to,
      subject: 'Una aplicacion fue retirada en Atrium',
      lines: [
        `Hola ${input.clientName},`,
        '',
        `${input.artistName} retiro su aplicacion para "${input.jobTitle}".`,
        '',
        'Entra a Atrium para revisar tus ofertas activas.',
      ],
    });
  }
}
