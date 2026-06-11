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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = this.createTransporter();

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
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

    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;
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
}
