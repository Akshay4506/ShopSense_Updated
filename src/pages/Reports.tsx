import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Store, ArrowLeft, Download, TrendingUp, TrendingDown, Package, AlertTriangle, Loader2 } from "lucide-react";

interface Bill {
  id: string;
  total_amount: number;
  total_cost: number;
  created_at: string;
}

interface BillItem {
  item_name: string;
  quantity: number;
  selling_price: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  selling_price: number;
}

interface DailySales {
  date: string;
  sales: number;
  profit: number;
}

interface Profile {
  shopkeeper_name: string;
  shop_name: string;
  address: string;
  phone_number: string;
}

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(142, 60%, 45%)', 'hsl(142, 50%, 55%)', 'hsl(142, 40%, 65%)', 'hsl(142, 30%, 75%)'];

export default function Reports() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bills, setBills] = useState<Bill[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchBills(), fetchInventory(), fetchProfile()]);
    setIsLoading(false);
  };

  const fetchBills = async () => {
    const { data: billsData } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    setBills(billsData || []);

    // Fetch all bill items for top sellers
    if (billsData && billsData.length > 0) {
      const billIds = billsData.map(b => b.id);
      const { data: itemsData } = await supabase
        .from("bill_items")
        .select("item_name, quantity, selling_price")
        .in("bill_id", billIds);

      setBillItems(itemsData || []);
    }
  };

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", user!.id);

    setInventory(data || []);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    setProfile(data);
  };

  // Calculate statistics
  const getStats = () => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = bills
      .filter(b => new Date(b.created_at).toDateString() === today)
      .reduce((sum, b) => sum + b.total_amount, 0);

    const weekSales = bills
      .filter(b => new Date(b.created_at) >= weekAgo)
      .reduce((sum, b) => sum + b.total_amount, 0);

    const monthSales = bills
      .filter(b => new Date(b.created_at) >= monthAgo)
      .reduce((sum, b) => sum + b.total_amount, 0);

    const totalProfit = bills.reduce((sum, b) => sum + (b.total_amount - b.total_cost), 0);

    return { todaySales, weekSales, monthSales, totalProfit };
  };

  // Get daily sales data for chart
  const getDailySalesData = (): DailySales[] => {
    const last7Days: DailySales[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toDateString();
      const dayBills = bills.filter(b => new Date(b.created_at).toDateString() === dateStr);
      
      last7Days.push({
        date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        sales: dayBills.reduce((sum, b) => sum + b.total_amount, 0),
        profit: dayBills.reduce((sum, b) => sum + (b.total_amount - b.total_cost), 0),
      });
    }

    return last7Days;
  };

  // Get top selling items
  const getTopSellers = () => {
    const itemMap = new Map<string, { quantity: number; revenue: number }>();

    billItems.forEach(item => {
      const existing = itemMap.get(item.item_name) || { quantity: 0, revenue: 0 };
      itemMap.set(item.item_name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.selling_price * item.quantity),
      });
    });

    return Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Get low stock items
  const getLowStockItems = () => {
    return inventory
      .filter(item => item.quantity <= 5)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);
  };

  // Get GST data for year
  const getGSTData = (year: number) => {
    const yearBills = bills.filter(b => new Date(b.created_at).getFullYear() === year);
    
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthBills = yearBills.filter(b => new Date(b.created_at).getMonth() === i);
      const totalSales = monthBills.reduce((sum, b) => sum + b.total_amount, 0);
      const totalCost = monthBills.reduce((sum, b) => sum + b.total_cost, 0);
      
      return {
        month: new Date(year, i).toLocaleDateString("en-IN", { month: "short" }),
        sales: totalSales,
        cost: totalCost,
        profit: totalSales - totalCost,
        gst: Math.round(totalSales * 0.18), // 18% GST estimation
      };
    });

    const totals = monthlyData.reduce(
      (acc, m) => ({
        sales: acc.sales + m.sales,
        cost: acc.cost + m.cost,
        profit: acc.profit + m.profit,
        gst: acc.gst + m.gst,
      }),
      { sales: 0, cost: 0, profit: 0, gst: 0 }
    );

    return { monthlyData, totals };
  };

  // Generate GST PDF
  const generateGSTPdf = () => {
    setIsGeneratingPdf(true);
    
    const year = parseInt(selectedYear);
    const { monthlyData, totals } = getGSTData(year);

    // Create printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GST Summary - ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .shop-name { font-size: 24px; font-weight: bold; color: #16a34a; }
          .shop-details { color: #666; margin-top: 5px; }
          .title { font-size: 20px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
          th { background-color: #f0fdf4; }
          td:first-child, th:first-child { text-align: left; }
          .totals { font-weight: bold; background-color: #dcfce7; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${profile?.shop_name || "Shop Name"}</div>
          <div class="shop-details">${profile?.address || ""}</div>
          <div class="shop-details">Phone: ${profile?.phone_number || ""}</div>
          <div class="title">GST Summary Report - ${year}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Sales (₹)</th>
              <th>Total Cost (₹)</th>
              <th>Profit (₹)</th>
              <th>Est. GST @18% (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map(m => `
              <tr>
                <td>${m.month}</td>
                <td>${m.sales.toLocaleString()}</td>
                <td>${m.cost.toLocaleString()}</td>
                <td>${m.profit.toLocaleString()}</td>
                <td>${m.gst.toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr class="totals">
              <td>TOTAL</td>
              <td>₹${totals.sales.toLocaleString()}</td>
              <td>₹${totals.cost.toLocaleString()}</td>
              <td>₹${totals.profit.toLocaleString()}</td>
              <td>₹${totals.gst.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Generated on ${new Date().toLocaleDateString("en-IN")} | ShopSense - Smart Dukaan Management
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "GST Report Generated",
      description: `Report for ${year} is ready to print/save as PDF.`,
    });

    setIsGeneratingPdf(false);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = getStats();
  const dailySalesData = getDailySalesData();
  const topSellers = getTopSellers();
  const lowStockItems = getLowStockItems();
  const availableYears = Array.from(
    new Set(bills.map(b => new Date(b.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear());
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">Reports & Analytics</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today</CardDescription>
              <CardTitle className="text-2xl">₹{stats.todaySales.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Week</CardDescription>
              <CardTitle className="text-2xl">₹{stats.weekSales.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Month</CardDescription>
              <CardTitle className="text-2xl">₹{stats.monthSales.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>

          <Card className={stats.totalProfit >= 0 ? "border-primary" : "border-destructive"}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                {stats.totalProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                Total Profit
              </CardDescription>
              <CardTitle className={`text-2xl ${stats.totalProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                ₹{Math.abs(stats.totalProfit).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="sales" fill="hsl(142, 76%, 36%)" name="Sales (₹)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                    name="Profit (₹)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Sellers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topSellers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No sales data yet</p>
              ) : (
                <div className="space-y-3">
                  {topSellers.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{item.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">All items well stocked!</p>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span>{item.item_name}</span>
                      <span className={`font-medium ${item.quantity === 0 ? "text-destructive" : "text-yellow-600"}`}>
                        {item.quantity === 0 ? "Out of stock" : `${item.quantity} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GST Report Section */}
        <Card>
          <CardHeader>
            <CardTitle>GST Summary Report</CardTitle>
            <CardDescription>
              Download yearly GST summary for tax filing and loan applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={generateGSTPdf} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download GST Report
              </Button>
            </div>

            {/* Year Preview */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">{selectedYear} Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const { totals } = getGSTData(parseInt(selectedYear));
                  return (
                    <>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-lg font-semibold">₹{totals.sales.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-semibold">₹{totals.cost.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <p className={`text-lg font-semibold ${totals.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                          ₹{totals.profit.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Est. GST @18%</p>
                        <p className="text-lg font-semibold">₹{totals.gst.toLocaleString()}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
