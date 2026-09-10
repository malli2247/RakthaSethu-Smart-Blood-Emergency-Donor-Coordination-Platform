import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (config.email.provider === 'smtp' && config.email.smtpUser && config.email.smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465,
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass,
        },
      });
      return this.transporter;
    }

    return null;
  }

  static async sendMail(options: SendMailOptions): Promise<{ success: boolean; simulated?: boolean }> {
    const { to, subject, html, text } = options;
    const plainText = text || html.replace(/<[^>]+>/g, ' ');

    try {
      const transporter = this.getTransporter();

      if (!transporter || config.email.provider === 'mock') {
        logger.info('[Email Service - Simulated Mode] To: ' + to + ' | Subject: "' + subject + '"');
        return { success: true, simulated: true };
      }

      await transporter.sendMail({
        from: config.email.fromAddress,
        to,
        subject,
        html,
        text: plainText,
      });

      logger.info('[Email Service - Dispatched] To: ' + to + ' | Subject: "' + subject + '"');
      return { success: true };
    } catch (error: any) {
      logger.error('[Email Service - Dispatch Failure] Failed sending to ' + to + ' ("' + subject + '")', error);
      return { success: false };
    }
  }

  static async sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
    const verifyUrl = config.frontendUrl + '/verify-email?token=' + token;
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
      '<div style="background-color: #e11d48; padding: 16px; border-radius: 6px; text-align: center; color: white;">' +
      '<h1 style="margin: 0; font-size: 24px;">RakthaSethu</h1>' +
      '<p style="margin: 4px 0 0; font-size: 14px;">Humanitarian Blood Donation Network</p>' +
      '</div>' +
      '<div style="padding: 24px 0;">' +
      '<h2 style="color: #0f172a;">Welcome, ' + name + '!</h2>' +
      '<p style="color: #475569; line-height: 1.6;">Thank you for joining RakthaSethu. Please confirm your email address to activate your account.</p>' +
      '<div style="text-align: center; margin: 30px 0;">' +
      '<a href="' + verifyUrl + '" style="background-color: #e11d48; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>' +
      '</div>' +
      '</div>' +
      '</div>';
    const res = await this.sendMail({ to, subject: 'Verify Your RakthaSethu Account', html });
    return res.success;
  }

  static async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = config.frontendUrl + '/reset-password?token=' + token;
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
      '<div style="background-color: #e11d48; padding: 16px; border-radius: 6px; text-align: center; color: white;">' +
      '<h1 style="margin: 0; font-size: 24px;">RakthaSethu</h1>' +
      '<p style="margin: 4px 0 0; font-size: 14px;">Password Recovery</p>' +
      '</div>' +
      '<div style="padding: 24px 0;">' +
      '<h2 style="color: #0f172a;">Hello, ' + name + '</h2>' +
      '<p style="color: #475569; line-height: 1.6;">We received a request to reset your RakthaSethu password. This link expires in 1 hour.</p>' +
      '<div style="text-align: center; margin: 30px 0;">' +
      '<a href="' + resetUrl + '" style="background-color: #0f172a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>' +
      '</div>' +
      '</div>' +
      '</div>';
    const res = await this.sendMail({ to, subject: 'Password Reset Request - RakthaSethu', html });
    return res.success;
  }

  static async sendEmergencyRequestAlert(to: string, donorName: string, request: any): Promise<boolean> {
    const actionUrl = config.frontendUrl + '/donor/requests';
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecdd3; border-radius: 8px; background-color: #fff1f2;">' +
      '<div style="background-color: #be123c; padding: 16px; border-radius: 6px; text-align: center; color: white;">' +
      '<h1 style="margin: 0; font-size: 24px;">URGENT BLOOD ALERT</h1>' +
      '<p style="margin: 4px 0 0; font-size: 14px;">Urgency: ' + request.urgency + '</p>' +
      '</div>' +
      '<div style="padding: 24px 0; background-color: white; padding: 20px; border-radius: 6px; margin-top: 16px;">' +
      '<h2 style="color: #be123c; margin-top: 0;">Dear ' + donorName + ', You Are a Compatible Match!</h2>' +
      '<p style="color: #334155; line-height: 1.6;">A patient urgently requires <strong>' + request.unitsRequired + ' unit(s) of ' + request.bloodGroup + '</strong> at <strong>' + request.hospitalName + ' (' + request.hospitalCity + ')</strong>.</p>' +
      '<div style="text-align: center; margin: 24px 0;">' +
      '<a href="' + actionUrl + '" style="background-color: #e11d48; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Respond to Request</a>' +
      '</div>' +
      '</div>' +
      '</div>';
    const res = await this.sendMail({ to, subject: 'Urgent Blood Request: ' + request.bloodGroup + ' Needed', html });
    return res.success;
  }

  static async sendUrgentMatchAlert(to: string, donorName: string, request: any): Promise<boolean> {
    return this.sendEmergencyRequestAlert(to, donorName, request);
  }

  static async sendDonorAcceptedAlert(to: string, requesterName: string, donorName: string, bloodGroup: string, phone: string): Promise<boolean> {
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #bbf7d0; border-radius: 8px; background-color: #f0fdf4;">' +
      '<div style="background-color: #15803d; padding: 16px; border-radius: 6px; text-align: center; color: white;">' +
      '<h1 style="margin: 0; font-size: 24px;">Donor Accepted Your Request!</h1>' +
      '</div>' +
      '<div style="padding: 20px; background-color: white; border-radius: 6px; margin-top: 16px;">' +
      '<p style="color: #1e293b; font-size: 16px;">Dear ' + requesterName + ',</p>' +
      '<p style="color: #334155; line-height: 1.6;">A voluntary donor has accepted your blood request:</p>' +
      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">' +
      '<p style="margin: 4px 0;"><strong>Donor Name:</strong> ' + donorName + '</p>' +
      '<p style="margin: 4px 0;"><strong>Blood Group:</strong> ' + bloodGroup + '</p>' +
      '<p style="margin: 4px 0;"><strong>Phone Number:</strong> ' + phone + '</p>' +
      '</div>' +
      '</div>' +
      '</div>';
    const res = await this.sendMail({ to, subject: 'Good News: Donor Accepted Your Blood Request (' + bloodGroup + ')', html });
    return res.success;
  }

  static async sendDonationConfirmedEmail(to: string, donorName: string, certificateCode: string, hospitalName: string, units: number): Promise<boolean> {
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
      '<div style="background-color: #be123c; padding: 20px; border-radius: 6px; text-align: center; color: white;">' +
      '<h1 style="margin: 0; font-size: 24px;">Official Donation Certificate</h1>' +
      '<p style="margin: 4px 0 0; font-size: 14px;">Certificate ID: ' + certificateCode + '</p>' +
      '</div>' +
      '<div style="padding: 24px 0; text-align: center;">' +
      '<h2 style="color: #0f172a;">Heartfelt Gratitude, ' + donorName + '!</h2>' +
      '<p style="color: #475569; line-height: 1.6;">Your donation of <strong>' + units + ' unit(s)</strong> of life-saving blood at <strong>' + hospitalName + '</strong> has been officially confirmed.</p>' +
      '</div>' +
      '</div>';
    const res = await this.sendMail({ to, subject: 'Donation Confirmed! Certificate: ' + certificateCode, html });
    return res.success;
  }
}