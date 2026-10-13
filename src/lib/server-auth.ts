export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
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

export function routeError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  console.error("Hypecast route error", { status, message });
  return Response.json({ error: message }, { status });
}
