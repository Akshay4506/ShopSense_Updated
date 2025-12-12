import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Store, ArrowLeft, Printer, Loader2, Receipt } from "lucide-react";

interface Bill {
  id: string;
  bill_number: number;
  total_amount: number;
  total_cost: number;
  created_at: string;
}

interface BillItem {
  item_name: string;
  quantity: number;
  unit: string;
  selling_price: number;
}

interface Profile {
  shopkeeper_name: string;
  shop_name: string;
  address: string;
  phone_number: string;
}

export default function BillHistory() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills] = useState<Bill[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    
    const [billsRes, profileRes] = await Promise.all([
      supabase
        .from("bills")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle()
    ]);

    setBills(billsRes.data || []);
    setProfile(profileRes.data);
    setIsLoading(false);
  };

  const reprintBill = async (bill: Bill) => {
    // Fetch bill items
    const { data: items } = await supabase
      .from("bill_items")
      .select("item_name, quantity, unit, selling_price")
      .eq("bill_id", bill.id);

    if (!items) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill #${bill.bill_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .shop-name { font-size: 18px; font-weight: bold; }
          .shop-details { font-size: 11px; color: #444; margin-top: 3px; }
          .bill-info { font-size: 11px; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
          td { padding: 4px 0; }
          .qty { width: 40px; }
          .price { text-align: right; }
          .total-row { border-top: 1px dashed #000; font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
          .reprint { text-align: center; font-size: 10px; color: #666; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${profile?.shop_name || "Shop Name"}</div>
          <div class="shop-details">${profile?.address || ""}</div>
          <div class="shop-details">Ph: ${profile?.phone_number || ""}</div>
        </div>
        
        <div class="bill-info">
          <div><strong>Bill #:</strong> ${bill.bill_number}</div>
          <div><strong>Date:</strong> ${new Date(bill.created_at).toLocaleDateString("en-IN")} ${new Date(bill.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty">Qty</th>
              <th class="price">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td class="qty">${item.quantity} ${item.unit}</td>
                <td class="price">₹${item.selling_price * item.quantity}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td class="price">₹${bill.total_amount}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Thank you for shopping!<br>
          Visit again
        </div>
        <div class="reprint">*** REPRINT ***</div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
              <span className="text-lg font-bold text-foreground">Bill History</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {bills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bills generated yet.</p>
              <Button className="mt-4" onClick={() => navigate("/billing")}>
                Start Billing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bills.map((bill) => {
              const profit = bill.total_amount - bill.total_cost;
              return (
                <Card key={bill.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Bill #{bill.bill_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(bill.created_at)} at {formatTime(bill.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">₹{bill.total_amount}</p>
                          <p className={`text-xs ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                            {profit >= 0 ? "+" : ""}₹{profit} profit
                          </p>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => reprintBill(bill)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
