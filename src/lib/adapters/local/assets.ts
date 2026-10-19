import type { AssetRepository } from "@/lib/repositories/contracts";
export const localAssets: AssetRepository = {
  importFile(file, ready, failed) {
    const reader = new FileReader();
    reader.onload = () => ready(String(reader.result));
    if (failed) reader.onerror = failed;
    reader.readAsDataURL(file);
  },
  resolve: reference => reference,
};
