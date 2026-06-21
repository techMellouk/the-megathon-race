import { getErrorMessage } from "@/lib/utils";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  getAppUrl,
  getMollieClient,
  getPaymentAmount,
  modelIdFromUrl,
} from "@/lib/mollie";

export const runtime = "nodejs";

type CreatePaymentBody = {
  modelUrl?: unknown;
  prompt?: unknown;
};

export async function POST(request: Request) {
  let body: CreatePaymentBody;

  try {
    body = (await request.json()) as CreatePaymentBody;
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const modelUrl = typeof body.modelUrl === "string" ? body.modelUrl.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const modelId = modelIdFromUrl(modelUrl);

  if (!modelId) {
    return jsonError("A valid modelUrl is required.", 400);
  }

  try {
    const client = getMollieClient();
    const baseUrl = getAppUrl(request);
    const amount = getPaymentAmount();

    const payment = await client.payments.create({
      paymentRequest: {
        amount,
        description: "Megathon 3D model download",
        redirectUrl: `${baseUrl}/payment/success`,
        metadata: {
          modelId,
          prompt: prompt.slice(0, 200),
        },
      },
    });

    const checkoutUrl = payment.links?.checkout?.href;

    if (!checkoutUrl) {
      return jsonError("Mollie did not return a checkout URL.", 502);
    }

    return jsonSuccess({
      paymentId: payment.id,
      checkoutUrl,
    });
  } catch (error) {
    return jsonError(getErrorMessage(error, "Could not create payment."), 502);
  }
}
