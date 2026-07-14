import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ToolsGrid } from "@/components/landing/ToolsGrid";
import { ClarityQuest } from "@/components/landing/ClarityQuest";
import { HeartfeltLetters } from "@/components/landing/HeartfeltLetters";
import { NewFeatures } from "@/components/landing/NewFeatures";
import { WhySection } from "@/components/landing/WhySection";
import { AICompanions } from "@/components/landing/AICompanions";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ToolsGrid />
      <ClarityQuest />
      <HeartfeltLetters />
      <NewFeatures />
      <WhySection />
      <AICompanions />
      <FAQSection />
      <Footer />
    </div>
  );
}
