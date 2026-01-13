import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'noreply@itsm.com'),
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html || emailData.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${emailData.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      throw error;
    }
  }

  async sendTicketStatusChangeEmail(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    const subject = `Ticket ${ticketNumber} Status Updated`;
    const text = `Hello ${userName},\n\nYour ticket ${ticketNumber} status has been changed from ${oldStatus} to ${newStatus}.\n\nThank you for using our ITSM system.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Status Update</h2>
        <p>Hello ${userName},</p>
        <p>Your ticket <strong>${ticketNumber}</strong> status has been changed:</p>
        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
          <strong>Previous Status:</strong> ${oldStatus}<br>
          <strong>New Status:</strong> ${newStatus}
        </p>
        <p>Thank you for using our ITSM system.</p>
      </div>
    `;

    await this.sendEmail({ to: userEmail, subject, text, html });
  }

  async sendTicketResolvedEmail(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    comment?: string,
  ): Promise<void> {
    const subject = `Ticket ${ticketNumber} Has Been Resolved`;
    const text = `Hello ${userName},\n\nYour ticket ${ticketNumber} has been resolved.\n${comment ? `\nComment: ${comment}\n` : ''}\nThank you for using our ITSM system.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Ticket Resolved</h2>
        <p>Hello ${userName},</p>
        <p>Your ticket <strong>${ticketNumber}</strong> has been <strong style="color: #28a745;">resolved</strong>.</p>
        ${comment ? `<p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${comment}</p>` : ''}
        <p>Thank you for using our ITSM system.</p>
      </div>
    `;

    await this.sendEmail({ to: userEmail, subject, text, html });
  }
}
