import { exportFigmaFramePng, figmaErrorResponse } from "@/lib/server/figma-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const image = await exportFigmaFramePng(searchParams.get("fileKey") ?? "", searchParams.get("nodeId") ?? "");
    return new Response(image.body, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (cause) { return figmaErrorResponse(cause); }
}
