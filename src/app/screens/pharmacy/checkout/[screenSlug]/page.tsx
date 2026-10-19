import { Suspense } from "react";

import { DynamicScreenDetail } from "@/components/screens/dynamic-screen-detail";
import { checkoutScreens } from "@/lib/design-library";

export function generateStaticParams() { return checkoutScreens.map((screen) => ({ screenSlug: screen.slug })); }

export default async function CheckoutScreenPage({ params }: { params: Promise<{ screenSlug: string }> }) {
  const { screenSlug } = await params;
  return (
    <Suspense fallback={null}>
      <DynamicScreenDetail unitSlug="pharmacy" groupSlug="checkout" screenSlug={screenSlug} checkout />
    </Suspense>
  );
}
