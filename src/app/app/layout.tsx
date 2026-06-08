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
      <div className="flex-1 w-full mx-auto max-w-[1200px] pt-16 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="w-full pt-8">
          <AppContentWrapper>
            {children}
          </AppContentWrapper>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
