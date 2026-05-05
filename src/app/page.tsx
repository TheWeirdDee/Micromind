import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ToolsGrid } from "@/components/landing/ToolsGrid";
import { WhySection } from "@/components/landing/WhySection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ToolsGrid />
      <WhySection />
      <Footer />
    </div>
  );
}
