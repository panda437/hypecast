type ApiErrorPayload = {
  error?: string;
  action?: string;
  code?: string;
  retryable?: boolean;
};

export class ApiRequestError extends Error {
  constructor(
    public userMessage: string,
    public action?: string,
    public code = "REQUEST_FAILED",
    public retryable = false,
  ) {
    super(`${userMessage}${action ? `\n\nWhat you can do: ${action}` : ""}`);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(
      "CueFace could not reach the server.",
      "Check your internet connection, then try again. Your saved project is safe.",
      "NETWORK_ERROR",
      true,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  if (!response.ok) {
    throw new ApiRequestError(
      payload.error || "CueFace could not complete that request.",
      payload.action || "Try again. If it repeats, open Help and send a support ticket.",
      payload.code || `HTTP_${response.status}`,
      payload.retryable ?? response.status >= 500,
    );
  }
  return payload as T;
}
