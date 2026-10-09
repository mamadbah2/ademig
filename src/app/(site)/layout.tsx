import type { ReactNode } from "react";
import { CoquilleSite } from "@/components/coquille-site";

export default function LayoutSite({ children }: { children: ReactNode }) {
  return <CoquilleSite>{children}</CoquilleSite>;
}
