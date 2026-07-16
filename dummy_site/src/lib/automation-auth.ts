import "server-only";

/**
 * Returns a Response to short-circuit with if the request isn't authorized
 * for the AUTOMATION_API_KEY-gated routes, or null if it's clear to proceed.
 */
export function authorizeAutomationRequest(request: Request): Response | null {
  const expectedKey = process.env.AUTOMATION_API_KEY;
  if (!expectedKey) {
    return Response.json(
      { error: "AUTOMATION_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (providedKey !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
