import { ScreenExplorer } from "@/components/search/screen-explorer";
export default async function ScreensPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] : "";
  return <ScreenExplorer initialQuery={value("q")} initialProduct={value("product")} initialGroup={value("group")} initialScope={value("platform")} initialStatus={value("status")} initialSort={value("sort")}/>;
}
