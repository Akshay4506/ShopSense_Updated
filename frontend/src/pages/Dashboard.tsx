import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Store, Package, Receipt, Calendar, BarChart3, History } from "lucide-react";
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
  totalSales: number;
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
    totalSales: 0,
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
    try {
      const data = await apiClient.get('/profile');
      if (data) setProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const [inventoryData, billsData] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/reports/bills')
      ]);

      let totalItems = 0;
      let totalValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalSales = 0;

      if (Array.isArray(inventoryData)) {
        totalItems = inventoryData.length;
        totalValue = inventoryData.reduce((sum: number, item: any) => sum + (item.selling_price * item.quantity), 0);
        lowStockCount = inventoryData.filter((item: any) => item.quantity > 0 && item.quantity <= 5).length;
        outOfStockCount = inventoryData.filter((item: any) => item.quantity === 0).length;
      }

      if (Array.isArray(billsData)) {
        totalSales = billsData.reduce((sum: number, b: any) => sum + b.total_amount, 0);
      }

      setStats({ totalItems, totalValue, lowStockCount, outOfStockCount, totalSales });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-green-700">
            <Store className="h-6 w-6" />
            <span className="text-xl font-bold text-foreground">ShopSense</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserProfile initialProfile={profile} onProfileUpdate={fetchProfile} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome, {profile?.shopkeeper_name || "Shopkeeper"}!
          </h1>
          <p className="text-muted-foreground text-lg">{profile?.shop_name || "Loading..."}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Items</p>
              <p className="text-4xl font-semibold text-foreground">{stats.totalItems}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Sales</p>
              <p className="text-4xl font-semibold text-foreground">₹{stats.totalSales.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Inventory Value</p>
              <p className="text-4xl font-semibold text-foreground">₹{stats.totalValue.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Low Stock</p>
              <p className="text-4xl font-semibold text-foreground">{stats.lowStockCount}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Out of Stock</p>
              <p className="text-4xl font-semibold text-foreground">{stats.outOfStockCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <ActionCard
            icon={<Package className="h-5 w-5" />}
            title="Inventory"
            onClick={() => navigate("/inventory")}
          />
          <ActionCard
            icon={<Receipt className="h-5 w-5" />}
            title="Billing"
            onClick={() => navigate("/billing")}
          />
          <ActionCard
            icon={<Calendar className="h-5 w-5" />}
            title="Daily Ops"
            onClick={() => navigate("/daily-operations")}
          />
          <ActionCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Reports"
            onClick={() => navigate("/reports")}
          />
          <ActionCard
            icon={<History className="h-5 w-5" />}
            title="Bill History"
            onClick={() => navigate("/bill-history")}
          />
        </div>
      </main>
    </div>
  );
}

function ActionCard({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center gap-3 text-foreground font-medium">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md text-green-700 dark:text-green-400">
            {icon}
          </div>
          <span>{title}</span>
        </div>
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
          onClick={onClick}
        >
          Open
        </Button>
      </CardContent>
    </Card>
  );
}
