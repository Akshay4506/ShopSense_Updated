import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Store,
  Package,
  Receipt,
  BarChart3,
  History,
  Bell,
} from 'lucide-react';
import { UserProfile } from '@/components/UserProfile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CrazyLoader } from '@/components/CrazyLoader';

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

interface Notification {
  type: 'low_stock' | 'low_profit' | 'loss';
  message: string;
  severity: 'warning' | 'alert' | 'critical';
}

interface InventoryItem {
  selling_price: number;
  quantity: number;
}

interface Bill {
  total_amount: number | string;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = (await apiClient.get('/profile')) as Profile;
      if (data) setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  const fetchInventoryStats = useCallback(async () => {
    try {
      console.log('Fetching stats...');
      const [inventoryData, billsData] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/reports/bills'),
      ]);

      let totalItems = 0;
      let totalValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalSales = 0;

      const inv = inventoryData as InventoryItem[];
      const bills = billsData as Bill[];

      if (Array.isArray(inv)) {
        totalItems = inv.length;
        totalValue = inv.reduce(
          (sum: number, item) => sum + item.selling_price * item.quantity,
          0,
        );
        lowStockCount = inv.filter(
          (item) => item.quantity > 0 && item.quantity <= 5,
        ).length;
        outOfStockCount = inv.filter((item) => item.quantity === 0).length;
      }

      if (Array.isArray(bills)) {
        totalSales = bills.reduce(
          (sum: number, b) => sum + Number(b.total_amount),
          0,
        );
      }

      setStats({
        totalItems,
        totalValue,
        lowStockCount,
        outOfStockCount,
        totalSales,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = (await apiClient.get('/notifications')) as Notification[];
      if (Array.isArray(data)) setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchInventoryStats();
      fetchNotifications();
    }
  }, [user, fetchProfile, fetchInventoryStats, fetchNotifications]);

  if (loading) {
    return <CrazyLoader />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card text-card-foreground py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Store className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">ShopSense</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b font-medium">Notifications</div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif, i) => (
                    <div
                      key={i}
                      className="p-4 border-b last:border-0 flex gap-3 hover:bg-muted/50"
                    >
                      <div
                        className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                          notif.severity === 'critical'
                            ? 'bg-red-500'
                            : notif.severity === 'alert'
                              ? 'bg-orange-500'
                              : 'bg-yellow-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium leading-none mb-1">
                          {notif.type === 'low_stock'
                            ? 'Low Stock'
                            : notif.type === 'low_profit'
                              ? 'Low Profit'
                              : 'Attention'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle />
          <UserProfile
            initialProfile={profile}
            onProfileUpdate={fetchProfile}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 container mx-auto">
        {/* Welcome Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold mb-1">
            Welcome, {profile?.shopkeeper_name || 'Shopkeeper'}!
          </h2>
          <p className="text-muted-foreground text-lg">
            {profile?.shop_name || 'Loading...'}
          </p>
        </section>

        {/* Inventory Stats */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Items
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.totalItems}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Sales
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  ₹{stats.totalSales.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Inventory Value
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  ₹{stats.totalValue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.lowStockCount}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Out of Stock
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.outOfStockCount}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Actions Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            icon={<Package className="h-5 w-5" />}
            title="Inventory"
            onClick={() => navigate('/inventory')}
          />
          <ActionCard
            icon={<Receipt className="h-5 w-5" />}
            title="Billing"
            onClick={() => navigate('/billing')}
          />
          <ActionCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Reports"
            onClick={() => navigate('/reports')}
          />
          <ActionCard
            icon={<History className="h-5 w-5" />}
            title="Bill History"
            onClick={() => navigate('/bill-history')}
          />
        </div>
      </main>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center gap-3 text-foreground font-medium">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md text-green-700 dark:text-green-400">
            {icon}
          </div>
          <span>{title}</span>
        </div>
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Open
        </Button>
      </CardContent>
    </Card>
  );
}
