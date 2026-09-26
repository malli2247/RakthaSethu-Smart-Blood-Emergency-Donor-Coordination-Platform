import { config } from '../config';
import { logger } from '../utils/logger';

export interface SmsSendResult {
  success: boolean;
  unconfigured?: boolean;
  simulated?: boolean;
  provider?: string;
  error?: string;
  userMessage?: string;
}

export class SmsService {
  /**
   * Dispatches SMS alert with strict multi-provider credential validation and resilience.
   * Supports Twilio, Fast2SMS (India DLT/OTP), MSG91, and Generic REST Gateways.
   */
  static async sendSms(
    to: string,
    message: string,
    otpCode?: string
  ): Promise<SmsSendResult> {
    const cleanTo = to.trim().replace(/\s+/g, '');
    const maskedPhone =
      cleanTo.length > 5 ? `${cleanTo.slice(0, 3)}****${cleanTo.slice(-2)}` : cleanTo;
    const defaultUserUnavailableMessage =
      'Mobile verification is temporarily unavailable. Please try again later.';

    // 1. Mock Mode (Dev/Testing only)
    if (config.sms.provider === 'mock') {
      if (process.env.NODE_ENV === 'production' && process.env.OTP_DEV_MODE !== 'true') {
        logger.warn(
          '[SMS Service] SMS provider is mock in production without OTP_DEV_MODE=true. Refusing to mock SMS delivery.'
        );
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }
      logger.info(`[SMS Service - Simulated Mode] To: ${maskedPhone} | Length: ${message.length} chars`);
      return { success: true, simulated: true, provider: 'mock' };
    }

    // 2. Identify active provider with smart fallback if credentials exist
    let activeProvider = config.sms.provider;
    if (activeProvider === 'twilio' && (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken)) {
      if (config.sms.fast2smsApiKey) activeProvider = 'fast2sms';
      else if (config.sms.msg91AuthKey) activeProvider = 'msg91';
      else if (config.sms.gatewayUrl) activeProvider = 'gateway';
    }

    // 3. Twilio
    if (activeProvider === 'twilio') {
      if (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken || !config.sms.twilioPhoneNumber) {
        logger.warn('[SMS Service] Twilio provider selected but credentials not configured. SMS not sent.');
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }

      try {
        const auth = Buffer.from(
          `${config.sms.twilioAccountSid}:${config.sms.twilioAuthToken}`
        ).toString('base64');
        const body = new URLSearchParams({
          To: cleanTo,
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
          return { success: false, error: errData, provider: 'twilio' };
        }

        logger.info(`[SMS Service] Twilio message dispatched successfully to ${maskedPhone}`);
        return { success: true, provider: 'twilio' };
      } catch (err: any) {
        logger.error('[SMS Service - Twilio Exception]', err);
        return { success: false, error: err?.message, provider: 'twilio' };
      }
    }

    // 4. Fast2SMS (Indian SMS Route - Quick SMS & Dedicated OTP Route)
    if (activeProvider === 'fast2sms') {
      if (!config.sms.fast2smsApiKey) {
        logger.warn('[SMS Service] Fast2SMS provider selected but FAST2SMS_API_KEY is missing.');
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }

      try {
        // Strip country code for Indian 10-digit format if necessary
        const indianPhone = cleanTo.replace(/\D/g, '').slice(-10);
        const payload: any = otpCode
          ? {
              route: 'otp',
              variables_values: otpCode,
              numbers: indianPhone,
            }
          : {
              route: 'q',
              message,
              flash: 0,
              numbers: indianPhone,
            };

        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: config.sms.fast2smsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: any = await res.json().catch(() => null);
        if (!res.ok || (data && data.return === false)) {
          logger.error('[SMS Service - Fast2SMS Error]', data || res.statusText);
          return { success: false, error: data?.message || res.statusText, provider: 'fast2sms' };
        }

        logger.info(`[SMS Service] Fast2SMS dispatched successfully to ${maskedPhone}`);
        return { success: true, provider: 'fast2sms' };
      } catch (err: any) {
        logger.error('[SMS Service - Fast2SMS Exception]', err);
        return { success: false, error: err?.message, provider: 'fast2sms' };
      }
    }

    // 5. MSG91 (Official V5 OTP / Transactional SMS)
    if (activeProvider === 'msg91') {
      if (!config.sms.msg91AuthKey) {
        logger.warn('[SMS Service] MSG91 provider selected but MSG91_AUTH_KEY is missing.');
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }

      try {
        const phoneWithCountry = cleanTo.replace(/\D/g, '');
        const payload: any = {
          mobile: phoneWithCountry,
          ...(otpCode && { otp: otpCode }),
          ...(config.sms.msg91TemplateId && { template_id: config.sms.msg91TemplateId }),
          ...(config.sms.msg91Sender && { sender: config.sms.msg91Sender }),
        };

        const res = await fetch('https://control.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: {
            authkey: config.sms.msg91AuthKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: any = await res.json().catch(() => null);
        if (!res.ok || (data && data.type === 'error')) {
          logger.error('[SMS Service - MSG91 Error]', data || res.statusText);
          return { success: false, error: data?.message || res.statusText, provider: 'msg91' };
        }

        logger.info(`[SMS Service] MSG91 message dispatched successfully to ${maskedPhone}`);
        return { success: true, provider: 'msg91' };
      } catch (err: any) {
        logger.error('[SMS Service - MSG91 Exception]', err);
        return { success: false, error: err?.message, provider: 'msg91' };
      }
    }

    // 6. Generic REST Gateway (Custom Webhook / SMS Gateway)
    if (activeProvider === 'gateway') {
      if (!config.sms.gatewayUrl) {
        logger.warn('[SMS Service] Generic Gateway selected but SMS_GATEWAY_URL is missing.');
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (config.sms.gatewayApiKey) {
          headers['Authorization'] = `Bearer ${config.sms.gatewayApiKey}`;
          headers['x-api-key'] = config.sms.gatewayApiKey;
        }

        const res = await fetch(config.sms.gatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: cleanTo,
            message,
            otp: otpCode,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          logger.error(`[SMS Service - Gateway Error] HTTP ${res.status}: ${errText}`);
          return { success: false, error: errText, provider: 'gateway' };
        }

        logger.info(`[SMS Service] Generic gateway message dispatched to ${maskedPhone}`);
        return { success: true, provider: 'gateway' };
      } catch (err: any) {
        logger.error('[SMS Service - Gateway Exception]', err);
        return { success: false, error: err?.message, provider: 'gateway' };
      }
    }

    // 7. Unconfigured Fallback
    logger.warn('[SMS Service] No active SMS provider configured. SMS delivery unavailable.');
    return {
      success: false,
      unconfigured: true,
      userMessage: defaultUserUnavailableMessage,
    };
  }
}
