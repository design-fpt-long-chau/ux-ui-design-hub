import { getFigmaIntegrationStatus } from "@/lib/server/figma-api";

export const dynamic = "force-dynamic";

export function GET() {
  const status = getFigmaIntegrationStatus();
  return Response.json(
    { message: `FIGMA INTEGRATION: ${status}`, status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
