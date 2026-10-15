import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
    public action?: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function requireGenerationAccess() {
  if (process.env.CLERK_SECRET_KEY) {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) throw new HttpError("Sign in before generating media.", 401);
    return userId;
  }
  if (process.env.NODE_ENV === "production") {
    throw new HttpError("Live generation is paused until authentication is configured.", 503);
  }
  return "local-development";
}

type PublicError = {
  status: number;
  error: string;
  action: string;
  code: string;
  retryable: boolean;
};

function defaultAction(status: number) {
  if (status === 401) return "Sign in again, then retry.";
  if (status === 402) return "Check your video-credit balance or contact support.";
  if (status === 404) return "Return to the studio, select the item again, and retry.";
  if (status === 409) return "Refresh the studio and try again.";
  if (status === 503) return "Try again shortly, or send us a support ticket if it continues.";
  return "Review the request and try again.";
}

function numericStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  const value = Number(error.status);
  return Number.isFinite(value) ? value : undefined;
}

export function describeRouteError(error: unknown): PublicError {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      error: error.message,
      action: error.action || defaultAction(error.status),
      code: error.code || `HTTP_${error.status}`,
      retryable: error.status === 408 || error.status === 429 || error.status >= 500,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      error: "Some information was incomplete or invalid.",
      action: "Review the fields you entered and try again.",
      code: "INVALID_INPUT",
      retryable: false,
    };
  }

  const providerStatus = numericStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const timedOut =
    error instanceof Error &&
    (error.name === "AbortError" || message.includes("timeout") || message.includes("timed out"));

  if (timedOut || providerStatus === 408) {
    return {
      status: 504,
      error: "The AI service took too long to respond.",
      action: "Wait a moment and try again. Your saved project is safe.",
      code: "PROVIDER_TIMEOUT",
      retryable: true,
    };
  }

  if (providerStatus === 429) {
    return {
      status: 429,
      error: "The AI service is temporarily busy.",
      action: "Wait one minute and try again. Failed generations do not use a video credit.",
      code: "PROVIDER_BUSY",
      retryable: true,
    };
  }

  if (providerStatus === 400) {
    return {
      status: 400,
      error: "The AI service could not process that request.",
      action: "Try a shorter or simpler prompt. If it fails again, send the error through Help.",
      code: "PROVIDER_REJECTED_REQUEST",
      retryable: false,
    };
  }

  if (providerStatus === 401 || providerStatus === 403) {
    return {
      status: 502,
      error: "The AI service connection needs attention.",
      action: "Your work is saved. Send a support ticket and we’ll check the connection.",
      code: "PROVIDER_AUTH_ERROR",
      retryable: false,
    };
  }

  if (providerStatus && providerStatus >= 500) {
    return {
      status: 502,
      error: "The AI service is temporarily unavailable.",
      action: "Try again shortly. If it repeats, send a support ticket.",
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    };
  }

  return {
    status: 500,
    error: "CueFace could not complete that action.",
    action: "Try again once. If it repeats, open Help and send the error details.",
    code: "INTERNAL_ERROR",
    retryable: true,
  };
}

export function routeError(error: unknown) {
  const details = describeRouteError(error);
  console.error("CueFace route error", {
    publicCode: details.code,
    publicStatus: details.status,
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return Response.json(
    {
      error: details.error,
      action: details.action,
      code: details.code,
      retryable: details.retryable,
    },
    { status: details.status },
  );
}
