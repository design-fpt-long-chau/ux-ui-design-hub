import Link from "next/link";
import { Baby, Building2, FlaskConical, Store, Syringe, type LucideIcon } from "lucide-react";
import type { BusinessUnit } from "@/types/design-library";
import styles from "./business-unit-quick-access.module.css";

const appearance: Record<string, { icon: LucideIcon; tone: string }> = {
  pharmacy: { icon: Store, tone: styles.blue },
  testing: { icon: FlaskConical, tone: styles.teal },
  vaccination: { icon: Syringe, tone: styles.purple },
  "mother-baby": { icon: Baby, tone: styles.pink },
};

export function BusinessUnitQuickAccess({ units }: { units: BusinessUnit[] }) {
  return <nav aria-label="Business Unit quick access" className={styles.row}>
    {units.map(unit => {
      const { icon: Icon, tone } = appearance[unit.id] ?? { icon: Building2, tone: "" };
      return <Link key={unit.id} href={`/screens/${unit.slug}`} className={`${styles.card} ${tone}`} title={unit.name}>
        <span className={styles.icon}><Icon aria-hidden size={22} strokeWidth={1.75}/></span>
        <span className={styles.name}>{unit.name}</span>
      </Link>;
    })}
  </nav>;
}
