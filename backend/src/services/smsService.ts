import { config } from '../config';
import { logger } from '../utils/logger';

export class SmsService {
  /**
   * Dispatches SMS alert with strict credential validation and resilience.
   */
  static async sendSms(to: string, message: string): Promise<{ success: boolean; unconfigured?: boolean; simulated?: boolean }> {
    if (config.sms.provider === 'mock') {
      const maskedPhone = to.length > 5 ? `${to.slice(0, 3)}****${to.slice(-2)}` : to;
      logger.info(`[SMS Service - Simulated Mode] To: ${maskedPhone} | Length: ${message.length} chars`);
      return { success: true, simulated: true };
    }

    if (config.sms.provider === 'twilio') {
      if (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken || !config.sms.twilioPhoneNumber) {
        logger.warn('[SMS Service] Twilio provider selected but credentials not configured. SMS not sent.');
        return { success: false, unconfigured: true };
      }

      try {
        const auth = Buffer.from(`${config.sms.twilioAccountSid}:${config.sms.twilioAuthToken}`).toString('base64');
        const body = new URLSearchParams({
          To: to,
          From: config.sms.twilioPhoneNumber,
          Body: message,
        });

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.sms.twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        );

        if (!res.ok) {
          const errData = await res.text();
          logger.error(`[SMS Service - Twilio Error] HTTP ${res.status}: ${errData}`);
          return { success: false };
        }

        logger.info(`[SMS Service] Twilio message dispatched successfully to ${to.slice(0, 4)}****`);
        return { success: true };
      } catch (err) {
        logger.error('[SMS Service - Dispatch Exception]', err);
        return { success: false };
      }
    }

    return { success: false, unconfigured: true };
  }
}
