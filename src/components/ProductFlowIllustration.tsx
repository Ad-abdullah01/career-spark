import { Fragment } from "react";
import { ArrowDown, ArrowRight, BriefcaseBusiness, CheckCircle2, GraduationCap, MessageSquareText, Route } from "lucide-react";

const ProductFlowIllustration = () => {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-2xl shadow-primary/10">
        <div className="flex items-start gap-3 rounded-2xl bg-muted/70 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText size={18} />
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-36 rounded-full bg-foreground/20" />
            <div className="h-2.5 w-48 rounded-full bg-foreground/10" />
            <div className="flex flex-wrap gap-2 pt-1">
              {["skills", "context", "goals"].map(item => (
                <span key={item} className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="my-4 flex justify-center text-primary">
          <ArrowDown size={22} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BriefcaseBusiness, title: "UX Researcher", score: "87%" },
            { icon: GraduationCap, title: "Developer", score: "82%" },
            { icon: CheckCircle2, title: "Data Analyst", score: "76%" },
          ].map(item => (
            <div key={item.title} className="rounded-2xl border border-border bg-background p-3">
              <item.icon size={17} className="mb-2 text-primary" />
              <p className="text-xs font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.score} match</p>
            </div>
          ))}
        </div>

        <div className="my-4 flex justify-center text-primary">
          <ArrowDown size={22} />
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Route size={17} className="text-primary" />
            Personal pathway
          </div>
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
            {["Learn", "Portfolio", "Apply"].map((step, i) => (
              <Fragment key={step}>
                <div key={`${step}-dot`} className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-xs font-bold text-primary">
                  {i + 1}
                </div>
                {i < 2 && <ArrowRight key={`${step}-arrow`} size={16} className="text-muted-foreground" />}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFlowIllustration;
