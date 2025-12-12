import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Store, Package, Receipt, TrendingUp, ArrowRight, Loader2 } from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">ShopSense</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Smart Dukaan Management
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The simple, powerful way to manage your kirana store. Track inventory, 
              create bills, and grow your business.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-12">
              Everything Your Shop Needs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg border border-border text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Inventory Management
                </h3>
                <p className="text-muted-foreground">
                  Track your stock, set prices, and get alerts when items run low.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Easy Billing
                </h3>
                <p className="text-muted-foreground">
                  Create professional bills quickly. Supports Hindi, English & Hinglish.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Daily Profit Tracking
                </h3>
                <p className="text-muted-foreground">
                  See your daily profit/loss at a glance. Make smarter business decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of shopkeepers already using ShopSense.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start Free Today
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 px-4">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          © 2024 ShopSense. Made with ❤️ for Indian shopkeepers.
        </div>
      </footer>
    </div>
  );
}
