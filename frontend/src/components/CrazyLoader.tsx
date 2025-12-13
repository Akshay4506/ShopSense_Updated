import { useEffect, useState } from "react";

export function CrazyLoader() {
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    // Reveal tagline after a short delay for effect
    const timer = setTimeout(() => setShowTagline(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center">
        {/* Logo Animation Container */}
        <div className="relative h-32 w-32 animate-logo-reveal">
          {/* Ring Animation */}
          <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping-slow"></div>
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin-slow"></div>

          {/* Logo (Using the Store Icon or SVG) */}
          <div className="absolute inset-2 bg-primary/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <img src="/icon.svg" alt="ShopSense Logo" className="h-16 w-16 animate-pulse-slow" />
          </div>
        </div>

        {/* Text Reveal */}
        <div className="mt-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground animate-fade-in-up">
            ShopSense
          </h1>
          <p className={`text-muted-foreground transition-all duration-1000 ${showTagline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Smart Dukaan Management
          </p>
        </div>
      </div>
    </div>
  );
}
