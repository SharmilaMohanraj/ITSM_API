import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TemplateService } from './template.service';

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

  constructor(
    private configService: ConfigService,
    private templateService: TemplateService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<number>('SMTP_PORT') === 465,//false for port 587 and true for port 465
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
    templateName: string,
  ): Promise<void> {
    const template = this.templateService.render(templateName, {
      userName,
      ticketNumber,
      oldStatus,
      newStatus,
    });

    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTicketResolvedEmail(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    templateName: string,
    comment?: string,
  ): Promise<void> {
    const template = this.templateService.render(templateName, {
      userName,
      ticketNumber,
      comment,
    });

    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTicketAssignedEmail(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    ticketTitle: string,
    ticketCategory: string,
    ticketPriority: string,
    templateName: string,
  ): Promise<void> {
    const template = this.templateService.render(templateName, {
      userName,
      ticketNumber,
      ticketTitle,
      ticketCategory,
      ticketPriority,
    });

    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTicketCreatedEmail(
    userEmail: string,
    userName: string,
    ticketNumber: string,
    ticketTitle: string,
    ticketCategory: string,
    ticketPriority: string,
    ticketStatus: string,
    templateName: string,
  ): Promise<void> {
    const template = this.templateService.render(templateName, {
      userName,
      ticketNumber,
      ticketTitle,
      ticketCategory,
      ticketPriority,
      ticketStatus,
    });

    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

}
