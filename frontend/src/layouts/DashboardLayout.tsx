import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShareProductModal } from "@/components/common/ShareProductModal";

export function DashboardLayout({
  children,
  showSidebar = true,
}: {
  children: ReactNode;
  showSidebar?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col pb-[calc(10rem+env(safe-area-inset-bottom,0px))] md:pb-48 bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <div
        className={`mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 flex-1 max-w-7xl xl:max-w-[1440px] ${
          showSidebar ? "flex gap-6 lg:gap-8" : ""
        }`}
      >
        {showSidebar && <Sidebar />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <ShareProductModal />
    </div>
  );
}
