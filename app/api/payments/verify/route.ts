import { getErrorMessage } from "@/lib/utils";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getMollieClient } from "@/lib/mollie";
import { modelExtension } from "@/lib/model-store";

export const runtime = "nodejs";

function metadataModelId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const modelId = (metadata as Record<string, unknown>).modelId;
  return typeof modelId === "string" ? modelId : null;
}

export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("paymentId");

  if (!paymentId) {
    return jsonError("paymentId is required.", 400);
  }

  try {
    const client = getMollieClient();
    const payment = await client.payments.get({ paymentId });
    const modelId = metadataModelId(payment.metadata);
    const paid = payment.status === "paid" || payment.status === "authorized";

    if (!modelId) {
      return jsonError("Payment metadata is missing model information.", 502);
    }

    const extension = modelExtension(modelId);

    return jsonSuccess({
      paid,
      status: payment.status,
      modelId,
      downloadUrl: `/api/models/${modelId}`,
      format: extension,
      prompt:
        payment.metadata &&
        typeof payment.metadata === "object" &&
        !Array.isArray(payment.metadata) &&
        typeof (payment.metadata as Record<string, unknown>).prompt === "string"
          ? ((payment.metadata as Record<string, unknown>).prompt as string)
          : null,
    });
  } catch (error) {
    return jsonError(getErrorMessage(error, "Could not verify payment."), 502);
  }
}
