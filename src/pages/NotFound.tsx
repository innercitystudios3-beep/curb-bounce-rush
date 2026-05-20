import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-2 text-7xl font-black text-primary tracking-tight">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! This curb doesn't exist.</p>
        <Button asChild size="lg" className="min-h-11">
          <a href="/" aria-label="Return to home page">Return Home</a>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
