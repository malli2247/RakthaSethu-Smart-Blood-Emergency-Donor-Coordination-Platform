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

    // 3. Twilio (Verify API or Messages API)
    if (activeProvider === 'twilio') {
      if (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken) {
        logger.warn('[SMS Service] Twilio provider selected but credentials not configured. SMS not sent.');
        return {
          success: false,
          unconfigured: true,
          userMessage: defaultUserUnavailableMessage,
        };
      }

      // 3A. Twilio Verify Service (Dedicated OTP Route)
      if (config.sms.twilioVerifyServiceId) {
        try {
          const auth = Buffer.from(
            `${config.sms.twilioAccountSid}:${config.sms.twilioAuthToken}`
          ).toString('base64');
          const body = new URLSearchParams({
            To: cleanTo.startsWith('+') ? cleanTo : `+91${cleanTo.replace(/\D/g, '').slice(-10)}`,
            Channel: 'sms',
          });

          const res = await fetch(
            `https://verify.twilio.com/v2/Services/${config.sms.twilioVerifyServiceId}/Verifications`,
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
            logger.error(`[SMS Service - Twilio Verify Error] HTTP ${res.status}: ${errData}`);
            return { success: false, error: errData, provider: 'twilio-verify' };
          }

          logger.info(`[SMS Service] Twilio Verify dispatched successfully to ${maskedPhone}`);
          return { success: true, provider: 'twilio-verify' };
        } catch (err: any) {
          logger.error('[SMS Service - Twilio Verify Exception]', err);
          return { success: false, error: err?.message, provider: 'twilio-verify' };
        }
      }

      // 3B. Standard Twilio Messages API
      if (!config.sms.twilioPhoneNumber) {
        logger.warn('[SMS Service] Twilio provider selected but TWILIO_PHONE_NUMBER is missing.');
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

  /**
   * Health and connectivity check for active SMS / OTP provider without dispatching real SMS.
   * Never leaks auth tokens or private keys.
   */
  static async checkHealth(): Promise<{
    status: 'configured' | 'unavailable' | 'needs verification';
    provider: string;
    details: string;
    latencyMs?: number;
  }> {
    const activeProvider = config.sms.provider;
    const start = Date.now();

    // 1. Twilio Health Check
    if (activeProvider === 'twilio') {
      if (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken) {
        return {
          status: 'unavailable',
          provider: 'twilio',
          details: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing.',
        };
      }

      if (!config.sms.twilioPhoneNumber && !config.sms.twilioVerifyServiceId) {
        return {
          status: 'needs verification',
          provider: 'twilio',
          details: 'Neither TWILIO_PHONE_NUMBER nor OTP_VERIFY_SERVICE_ID is configured.',
        };
      }

      try {
        const auth = Buffer.from(
          `${config.sms.twilioAccountSid}:${config.sms.twilioAuthToken}`
        ).toString('base64');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.sms.twilioAccountSid)}.json`,
          {
            method: 'GET',
            headers: { Authorization: `Basic ${auth}` },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;

        if (res.ok) {
          const type = config.sms.twilioVerifyServiceId ? 'Verify Service' : 'SMS Messaging';
          return {
            status: 'configured',
            provider: 'twilio',
            details: `Twilio API connection verified (${type}).`,
            latencyMs,
          };
        } else if (res.status === 401 || res.status === 403) {
          return {
            status: 'needs verification',
            provider: 'twilio',
            details: 'Twilio credentials rejected (HTTP 401/403). Verify Account SID and Auth Token.',
            latencyMs,
          };
        } else {
          return {
            status: 'needs verification',
            provider: 'twilio',
            details: `Twilio API returned HTTP ${res.status}.`,
            latencyMs,
          };
        }
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
          status: 'unavailable',
          provider: 'twilio',
          details: err?.name === 'AbortError' ? 'Twilio API request timed out (4s).' : 'Unable to reach Twilio API.',
          latencyMs,
        };
      }
    }

    // 2. Fast2SMS Health Check
    if (activeProvider === 'fast2sms') {
      if (!config.sms.fast2smsApiKey) {
        return {
          status: 'unavailable',
          provider: 'fast2sms',
          details: 'FAST2SMS_API_KEY is missing.',
        };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('https://www.fast2sms.com/dev/wallet', {
          method: 'POST',
          headers: { authorization: config.sms.fast2smsApiKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;

        if (res.ok) {
          return {
            status: 'configured',
            provider: 'fast2sms',
            details: 'Fast2SMS API connection verified.',
            latencyMs,
          };
        } else {
          return {
            status: 'needs verification',
            provider: 'fast2sms',
            details: `Fast2SMS API returned HTTP ${res.status}.`,
            latencyMs,
          };
        }
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
          status: 'unavailable',
          provider: 'fast2sms',
          details: 'Unable to reach Fast2SMS API.',
          latencyMs,
        };
      }
    }

    // 3. MSG91 Health Check
    if (activeProvider === 'msg91') {
      if (!config.sms.msg91AuthKey) {
        return {
          status: 'unavailable',
          provider: 'msg91',
          details: 'MSG91_AUTH_KEY is missing.',
        };
      }
      return {
        status: 'configured',
        provider: 'msg91',
        details: 'MSG91 Auth Key configured.',
      };
    }

    // 4. Mock / Simulated
    if (activeProvider === 'mock') {
      if (config.isProduction && process.env.OTP_DEV_MODE !== 'true') {
        return {
          status: 'unavailable',
          provider: 'mock',
          details: 'SMS provider is set to mock in production without OTP_DEV_MODE=true. Real SMS provider required.',
        };
      }
      return {
        status: 'configured',
        provider: 'mock',
        details: 'Simulated / Safe Mode active. OTP codes logged safely to server logs.',
      };
    }

    return {
      status: 'unavailable',
      provider: activeProvider || 'none',
      details: 'No valid SMS or OTP provider configured.',
    };
  }
}
