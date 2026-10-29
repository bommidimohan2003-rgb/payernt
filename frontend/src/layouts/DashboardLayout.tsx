import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShareProductModal } from "@/components/common/ShareProductModal";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-32">
      <Navbar />
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-8 flex gap-8 flex-1">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <ShareProductModal />
    </div>
  );
}
