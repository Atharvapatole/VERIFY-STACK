import { env } from "@/lib/env";

export interface MetaTemplateButton {
  type: string;
  text?: string;
  url?: string;
  otp_type?: string;
  autofill_text?: string;
  package_name?: string;
  signature_hash?: string;
}

export interface MetaTemplateComponent {
  type: string; // "BODY", "HEADER", "FOOTER", "BUTTONS"
  text?: string;
  format?: string;
  buttons?: MetaTemplateButton[];
  example?: any;
}

export interface MetaMessageTemplate {
  id?: string;
  name: string;
  status: string; // "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED"
  category: string; // "AUTHENTICATION" | "UTILITY" | "MARKETING"
  language: string; // "en_US", "en", "hi", etc.
  components?: MetaTemplateComponent[];
}

export interface MetaSendOtpParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string; // E.164 without leading plus or with, Meta accepts digits
  templateName: string;
  templateLanguage?: string;
  otpCode: string;
  addCopyButton?: boolean;
  templateComponents?: MetaTemplateComponent[];
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

export interface FetchTemplatesResult {
  success: boolean;
  templates?: MetaMessageTemplate[];
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
 * - Template type must be AUTHENTICATION (or UTILITY with OTP parameters)
 * - Components must include body with one parameter (the OTP code)
 * - If copy-code/OTP button is configured in the template, button parameter is passed.
 * - If NO button is in the template, NEVER send an extraneous button component (avoids #100).
 */
export function buildAuthenticationPayload(
  recipientPhone: string,
  templateName: string,
  languageCode: string,
  otpCode: string,
  addCopyButtonOrComponents?: boolean | MetaTemplateComponent[]
) {
  let hasButton = false;

  if (Array.isArray(addCopyButtonOrComponents)) {
    const buttonComp = addCopyButtonOrComponents.find((c) => c.type?.toUpperCase() === "BUTTONS");
    hasButton = Boolean(buttonComp?.buttons && buttonComp.buttons.length > 0);
  } else if (typeof addCopyButtonOrComponents === "boolean") {
    hasButton = addCopyButtonOrComponents;
  }

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

  if (hasButton) {
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
 * Fetches message templates directly from Meta WhatsApp Business Account (WABA).
 * Uses pagination to retrieve all templates up to 500 records.
 */
export async function fetchWabaMessageTemplates(
  wabaId: string,
  accessToken: string
): Promise<FetchTemplatesResult> {
  const version = env.META_GRAPH_API_VERSION || "v22.0";
  let url: string | null = `https://graph.facebook.com/${version}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`;
  const allTemplates: MetaMessageTemplate[] = [];
  let pageCount = 0;
  const maxPages = 5;

  while (url && pageCount < maxPages) {
    pageCount++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response: Response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data: any = await response.json().catch(() => null);

      if (!response.ok || !data) {
        const metaError = data?.error;
        const code = metaError?.code || response.status;
        const msg = metaError?.message || response.statusText || "Failed to fetch templates from Meta";

        let friendlyMsg = msg;
        if (code === 190) {
          friendlyMsg =
            "Invalid or expired Meta System User Access Token. Please update your token in the Integrations tab.";
        } else if (code === 100 || code === 200 || code === 10) {
          friendlyMsg =
            "Missing whatsapp_business_management permission or invalid WABA Account ID. Verify your System User permissions in Meta Business Manager.";
        }

        return {
          success: false,
          error: {
            code,
            message: friendlyMsg,
            details: metaError?.error_user_msg || metaError?.error_data?.details,
          },
        };
      }

      if (Array.isArray(data.data)) {
        allTemplates.push(...data.data);
      }

      url = data.paging?.next || null;
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      return {
        success: false,
        error: {
          code: isTimeout ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
          message: isTimeout
            ? "Meta Cloud API timed out after 10 seconds while loading templates."
            : "Network connection failed while communicating with Meta.",
        },
      };
    }
  }

  return {
    success: true,
    templates: allTemplates,
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
    params.templateComponents || params.addCopyButton || false
  );

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response: Response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody: any = await response.json().catch(() => null);

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

      let enrichedMessage = `${errorMessage}${errorSubcode}`;
      if (errorCode === 132001) {
        enrichedMessage = `Template Not Found or Not Approved: Template '${params.templateName}' in language '${params.templateLanguage || "en_US"}' does not exist or is not approved in your Meta WhatsApp Business Account. Please select an approved template or create one in WhatsApp Manager.`;
      } else if (errorCode === 100 && errorMessage.includes("button")) {
        enrichedMessage = `Template Button Component Mismatch: ${errorMessage}. The template definition in WhatsApp Manager differs from the sent button configuration.`;
      }

      // Sanitized, safe error message without leaking headers or access token
      const sanitizedError = {
        code: errorCode,
        message: enrichedMessage,
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
