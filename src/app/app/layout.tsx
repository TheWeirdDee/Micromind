import { AppHeader } from "@/components/app/AppHeader";
import { BottomNav } from "@/components/app/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-[430px] mx-auto w-full px-6 pt-24 pb-32">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
