import { useState } from "react";
import TabNav from "@/components/TabNav";
import LandingPage from "./LandingPage";
import AssessmentPage from "./AssessmentPage";
import ResultsPage from "./ResultsPage";
import PathwayPage from "./PathwayPage";
import { CareerRecommendation } from "@/lib/assessmentTypes";

type View = "landing" | "assessment" | "results" | "pathway";

const Index = () => {
  const [view, setView] = useState<View>("landing");
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCareer, setSelectedCareer] = useState<CareerRecommendation | null>(null);

  const showNav = view !== "landing";

  const handleTabChange = (tab: number) => {
    setActiveTab(tab);
    if (tab === 0) setView("assessment");
    else if (tab === 1) setView("results");
    else if (tab === 2) setView("pathway");
  };

  const handleGetStarted = () => {
    setView("assessment");
    setActiveTab(0);
  };

  const handleAssessmentComplete = () => {
    setView("results");
    setActiveTab(1);
  };

  const handleViewPathway = (career: CareerRecommendation) => {
    setSelectedCareer(career);
    setView("pathway");
    setActiveTab(2);
  };

  const handleBackToResults = () => {
    setView("results");
    setActiveTab(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showNav && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}

      {view === "landing" && <LandingPage onGetStarted={handleGetStarted} />}
      {view === "assessment" && <AssessmentPage onComplete={handleAssessmentComplete} />}
      {view === "results" && <ResultsPage onViewPathway={handleViewPathway} />}
      {view === "pathway" && <PathwayPage career={selectedCareer} onBack={handleBackToResults} />}
    </div>
  );
};

export default Index;
