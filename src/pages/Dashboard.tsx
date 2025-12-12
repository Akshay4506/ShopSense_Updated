import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Store, Package, Receipt, Calendar, BarChart3, History, AlertTriangle } from "lucide-react";
import { UserProfile } from "@/components/UserProfile";

interface Profile {
  shopkeeper_name: string;
  shop_name: string;
  address: string;
  phone_number: string;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchInventoryStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const fetchInventoryStats = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", user!.id);

    if (data) {
      const totalItems = data.length;
      const totalValue = data.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
      const lowStockCount = data.filter(item => item.quantity > 0 && item.quantity <= 5).length;
      const outOfStockCount = data.filter(item => item.quantity === 0).length;

      setStats({ totalItems, totalValue, lowStockCount, outOfStockCount });
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">ShopSense</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserProfile
              initialProfile={profile}
              onProfileUpdate={setProfile}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {profile && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome, {profile.shopkeeper_name}!
            </h1>
            <p className="text-muted-foreground">{profile.shop_name}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-3xl">{stats.totalItems}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inventory Value</CardDescription>
              <CardTitle className="text-3xl">₹{stats.totalValue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>

          <Card className={stats.lowStockCount > 0 ? "border-yellow-500" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                {stats.lowStockCount > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                Low Stock
              </CardDescription>
              <CardTitle className="text-3xl">{stats.lowStockCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className={stats.outOfStockCount > 0 ? "border-destructive" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                {stats.outOfStockCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                Out of Stock
              </CardDescription>
              <CardTitle className="text-3xl">{stats.outOfStockCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/inventory")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="sm">Open</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/billing")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-primary" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="sm">Open</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/daily-operations")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                Daily Ops
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="sm">Open</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/reports")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-primary" />
                Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="sm">Open</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/bill-history")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4 text-primary" />
                Bill History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="sm">Open</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
