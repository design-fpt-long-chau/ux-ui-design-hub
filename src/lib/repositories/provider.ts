import { localPortability } from "@/lib/adapters/local/portability";
import { localPreferences } from "@/lib/adapters/local/preferences";
import type { LibraryRepositories } from "@/lib/repositories/contracts";
import { localScreens, localFlows, localGroups, localProducts, localNoteTypes, localInventoryNotice } from "@/lib/adapters/local/inventory";
import { localComponentTags } from "@/lib/adapters/local/component-tags";
import { localAssets } from "@/lib/adapters/local/assets";
import { localIdentity } from "@/lib/adapters/local/identity";
import { localFigmaIntegration } from "@/lib/adapters/local/figma";
import { unconfiguredIdentity } from "@/lib/adapters/company/unconfigured-identity";
// Sole composition point. Company selection is configuration, not a login bypass.
// No backend or storage migration is implemented here.
export const repositories: LibraryRepositories = {
  figma: localFigmaIntegration,
  portability: localPortability,
  preferences: localPreferences, screens: localScreens, flows: localFlows, groups: localGroups, products: localProducts,
  noteTypes: localNoteTypes, componentTags: localComponentTags, assets: localAssets,
  identity: typeof process !== "undefined" && process.env.NEXT_PUBLIC_LIBRARY_MODE === "company" ? unconfiguredIdentity : localIdentity,
  persistenceNotice: localInventoryNotice,
};
