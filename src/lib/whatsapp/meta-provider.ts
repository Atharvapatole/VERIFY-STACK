import { env } from "@/lib/env";

export interface MetaSendOtpParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string; // E.164 without leading plus or with, Meta accepts digits
  templateName: string;
  templateLanguage?: string;
  otpCode: string;
  addCopyButton?: boolean;
}

export interface MetaProviderResponse {
  success: boolean;
  messageId?: string;
  status: "accepted" | "failed" | "simulated";
  error?: {
    code: string | number;
    message: string;
    details?: string;
  };
}

/**
 * Normalizes phone number for Meta WhatsApp Cloud API.
 * Meta expects digits only with country code (no '+' prefix).
 */
export function formatPhoneForMeta(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/**
 * Builds the official WhatsApp Cloud API payload for an Authentication/OTP template.
 *
 * WhatsApp Cloud API Authentication template rules:
 * - Template type must be AUTHENTICATION
 * - Components must include body with one parameter (the OTP code)
 * - If copy-code button is configured, button parameter is passed.
 */
export function buildAuthenticationPayload(
  recipientPhone: string,
  templateName: string,
  languageCode: string,
  otpCode: string,
  addCopyButton = false
) {
  const components: any[] = [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: otpCode,
        },
      ],
    },
  ];

  if (addCopyButton) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: otpCode,
        },
      ],
    });
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formatPhoneForMeta(recipientPhone),
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode || "en_US",
      },
      components,
    },
  };
}

/**
 * Sends an official WhatsApp Authentication OTP message via Meta Cloud API.
 * Uses bounded retries strictly for transient network errors (never retries 4xx client errors).
 */
export async function sendAuthenticationTemplate(
  params: MetaSendOtpParams,
  maxRetries = 2
): Promise<MetaProviderResponse> {
  const version = env.META_GRAPH_API_VERSION || "v22.0";
  const url = `https://graph.facebook.com/${version}/${params.phoneNumberId}/messages`;

  const payload = buildAuthenticationPayload(
    params.recipientPhone,
    params.templateName,
    params.templateLanguage || "en_US",
    params.otpCode,
    params.addCopyButton ?? false
  );

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.json().catch(() => null);

      if (response.ok && responseBody?.messages?.[0]?.id) {
        return {
          success: true,
          messageId: responseBody.messages[0].id,
          status: "accepted",
        };
      }

      // Handle Meta Error Payload
      const metaError = responseBody?.error;
      const statusCode = response.status;
      const errorCode = metaError?.code || statusCode;
      const errorMessage = metaError?.message || response.statusText || "Meta Cloud API error";
      const errorSubcode = metaError?.error_subcode ? ` (Subcode: ${metaError.error_subcode})` : "";

      // Sanitized, safe error message without leaking headers or access token
      const sanitizedError = {
        code: errorCode,
        message: `${errorMessage}${errorSubcode}`,
        details: metaError?.error_user_msg || metaError?.error_data?.details || undefined,
      };

      // 4xx errors indicate client / config error (bad template, invalid phone, unauthorized)
      // NEVER retry 4xx errors! Retrying can cause double billing or account bans.
      if (statusCode >= 400 && statusCode < 500) {
        return {
          success: false,
          status: "failed",
          error: sanitizedError,
        };
      }

      // For 5xx errors or network glitches, record and attempt retry if bounded
      lastError = sanitizedError;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      lastError = {
        code: isTimeout ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
        message: isTimeout ? "Meta Cloud API timed out after 10 seconds" : "Network connection failed",
      };

      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
    }
  }

  return {
    success: false,
    status: "failed",
    error: lastError || {
      code: "UNKNOWN_PROVIDER_ERROR",
      message: "Failed to send message via Meta Cloud API after bounded retries",
    },
  };
}
