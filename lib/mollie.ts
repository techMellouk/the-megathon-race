import { Client } from "mollie-api-typescript";

function originFromRequest(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (/^(localhost|127\.0\.0\.1)/.test(host) ? "http" : "https");
  return `${proto}://${host}`.replace(/\/+$/, "");
}

/**
 * Base URL used to build the Mollie redirect. We must always send the user back
 * to the SAME origin they started checkout on (sessionStorage holds the payment
 * id there). A misconfigured NEXT_PUBLIC_APP_URL (e.g. localhost on Railway)
 * would otherwise redirect prod users to the wrong origin, so we prefer the
 * actual request origin unless an explicit non-local APP URL is configured.
 */
export function getAppUrl(request?: Request) {
  const envUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/+$/, "");
  const envIsLocal = !envUrl || /localhost|127\.0\.0\.1/.test(envUrl);

  if (!envIsLocal) return envUrl;

  if (request) {
    const origin = originFromRequest(request);
    if (origin) return origin;
  }

  return envUrl || "http://localhost:3000";
}

export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("MOLLIE_API_KEY is not configured on the server.");
  }

  // test_ / live_ keys already imply mode — do not pass testmode (causes 400 Invalid Authorization)
  return new Client({
    security: { apiKey },
  });
}

export function getPaymentAmount() {
  const value = process.env.MOLLIE_PAYMENT_AMOUNT || "1.00";
  const currency = process.env.MOLLIE_PAYMENT_CURRENCY || "EUR";
  return { currency, value };
}

export function modelIdFromUrl(modelUrl: string) {
  const match = modelUrl.match(/\/api\/models\/([^/?#]+)$/);
  return match?.[1] ?? null;
}
