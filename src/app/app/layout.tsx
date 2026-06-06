import { AppHeader } from "@/components/app/AppHeader";
import { BottomNav } from "@/components/app/BottomNav";
import { AppContentWrapper } from "@/components/app/AppContentWrapper";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-[430px] mx-auto w-full pt-16 pb-32">
        <div className="px-6 pt-8">
          <AppContentWrapper>
            {children}
          </AppContentWrapper>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
