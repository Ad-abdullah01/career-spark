import SparkLogo from "@/components/SparkLogo";
import { ArrowRight } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <SparkLogo size={24} />
            <span className="font-heading text-base font-semibold tracking-normal text-foreground">CareerSpark</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center px-5 py-6 sm:px-6 sm:py-8">
        <section className="w-full text-center">
          <div className="flex items-center justify-center gap-3">
            <SparkLogo size={38} />
            <span className="font-heading text-xl font-semibold tracking-normal text-foreground sm:text-2xl">CareerSpark</span>
          </div>

          <h1 className="mx-auto mt-8 max-w-5xl font-heading text-5xl font-semibold leading-none tracking-normal text-foreground sm:mt-10 sm:text-7xl lg:text-8xl">
            career{" "}
            <span className="bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent">
              spark
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:mt-6 sm:text-xl sm:leading-8">
            Explore career directions with AI that asks focused questions, captures your evidence, and keeps the answer practical.
          </p>

          <button
            onClick={onGetStarted}
            className="mt-8 inline-flex min-h-14 min-w-56 items-center justify-center gap-2 rounded-lg bg-foreground px-7 text-base font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Begin assessment
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
