import { AuthError } from "@/lib/auth";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return json({ error: error.message }, error.status);
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  return json({ error: message }, 400);
}
