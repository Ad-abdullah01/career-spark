import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">404</p>
        <h1 className="mb-3 text-3xl font-semibold text-foreground">Page not found</h1>
        <p className="mb-6 text-sm leading-6 text-muted-foreground">The route you opened does not exist in CareerSpark.</p>
        <a href="/" className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
