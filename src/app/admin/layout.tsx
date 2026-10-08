import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration ADEMIG" },
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <div className="flex-1 bg-papier text-encre">{children}</div>;
}
