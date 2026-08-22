import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Better Auth catch-all — email/password + OAuth callbacks live here.
 * Do not put React UI on this path.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
