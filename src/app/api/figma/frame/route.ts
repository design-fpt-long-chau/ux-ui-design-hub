import { figmaErrorResponse, verifyFigmaFrame } from "@/lib/server/figma-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const fileKey = searchParams.get("fileKey") ?? "";
    const nodeId = searchParams.get("nodeId") ?? "";
    const metadata = await verifyFigmaFrame(fileKey, nodeId);
    return Response.json(metadata, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) { return figmaErrorResponse(cause); }
}
