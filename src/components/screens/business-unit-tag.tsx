"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import styles from "./business-unit-tag.module.css";

const unitColors: Record<string, string> = {
  pharmacy: styles.pharmacy,
  vaccination: styles.vaccination,
  testing: styles.testing,
  "mother-baby": styles.motherBaby,
};

export function BusinessUnitTag({ businessUnitId, dark = false }: { businessUnitId: string; dark?: boolean }) {
  const businessUnits = useBusinessUnitInventory();
  const label = businessUnits.find(unit => unit.id === businessUnitId)?.name ?? "Unknown Business Unit";
  return <span title={label} className={`${styles.tag} ${unitColors[businessUnitId] ?? ""} ${dark ? styles.dark : ""}`}>{label}</span>;
}
