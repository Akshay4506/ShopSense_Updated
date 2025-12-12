import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Store, ArrowLeft, Plus, Trash2, Printer, Loader2 } from "lucide-react";

interface InventoryItem {
  id: string;
  item_name: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  unit: string;
}

interface CartItem {
  inventory_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  available_stock: number;
}

interface Profile {
  shopkeeper_name: string;
  shop_name: string;
  address: string;
  phone_number: string;
}

export default function Billing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchProfile();
    }
  }, [user]);

  const fetchInventory = async () => {
    try {
      const data: any = await apiClient.get('/inventory');
      setInventory(data || []);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const data: any = await apiClient.get('/profile');
      setProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  // Simple client-side parser to replace the Edge Function
  const parseItemInput = (input: string, inventory: InventoryItem[]) => {
    // Regex for: <quantity><unit?> <itemname> OR <itemname> <quantity><unit?>
    // e.g., "2kg rice", "rice 2kg", "2 rice"
    const quantityRegex = /(\d+(\.\d+)?)\s*([a-zA-Z]+)?/;

    // Attempt to match quantity at start
    let quantity = 1;
    let unit = "";
    let itemName = input;

    const match = input.match(quantityRegex);
    if (match) {
      // This is a naive implementation. For robust parsing, we'd need more logic.
      // For now, let's assume if we find a number, that's the quantity.
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        // If number is at start
        if (input.startsWith(match[0])) {
          quantity = num;
          unit = match[3] || "";
          itemName = input.substring(match[0].length).trim();
        }
        // If number is at end (not implementing complex regex right now, sticking to basics)
        // Simple fallback: Check if item exists exactly as typed first
      }
    }

    // Direct match check in inventory
    const exactMatch = inventory.find(i => i.item_name.toLowerCase() === input.toLowerCase());
    if (exactMatch) return { item_name: exactMatch.item_name, quantity: 1, unit: exactMatch.unit };

    // Regex match in inventory
    const itemMatch = inventory.find(i => i.item_name.toLowerCase().includes(itemName.toLowerCase()));

    return {
      item_name: itemMatch ? itemMatch.item_name : itemName, // fallback to parsed name
      quantity: quantity,
      unit: unit || (itemMatch ? itemMatch.unit : "pcs")
    };
  };

  const handleAddItem = async () => {
    if (!inputValue.trim()) return;

    setIsProcessing(true);

    try {
      // Use local parser instead of Supabase Edge Function
      const data = parseItemInput(inputValue, inventory);

      // Find matching inventory item
      const matchedItem = inventory.find(
        item => item.item_name.toLowerCase() === data.item_name.toLowerCase()
      );

      if (!matchedItem) {
        toast({
          title: "Item not found",
          description: `"${data.item_name}" is not in your inventory.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (matchedItem.quantity === 0) {
        toast({
          title: "Out of Stock",
          description: `${matchedItem.item_name} is out of stock.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Check if item already in cart
      const existingIndex = cart.findIndex(
        item => item.inventory_id === matchedItem.id
      );

      if (existingIndex >= 0) {
        // Update quantity
        const newCart = [...cart];
        const newQty = newCart[existingIndex].quantity + data.quantity;

        if (newQty > matchedItem.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${matchedItem.quantity} ${matchedItem.unit} available.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        newCart[existingIndex].quantity = newQty;
        setCart(newCart);
      } else {
        // Add new item
        if (data.quantity > matchedItem.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${matchedItem.quantity} ${matchedItem.unit} available.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        setCart([...cart, {
          inventory_id: matchedItem.id,
          item_name: matchedItem.item_name,
          quantity: data.quantity,
          unit: matchedItem.unit,
          cost_price: matchedItem.cost_price,
          selling_price: matchedItem.selling_price,
          available_stock: matchedItem.quantity,
        }]);
      }

      toast({
        title: "Added to cart",
        description: `${data.quantity} ${matchedItem.unit} ${matchedItem.item_name}`,
      });

      setInputValue("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error parsing item:", error);
      toast({
        title: "Error",
        description: "Failed to process item.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isProcessing) {
      handleAddItem();
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (newQty > item.available_stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${item.available_stock} ${item.unit} available.`,
        variant: "destructive",
      });
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  };

  /*
  const getTotalCost = () => {
    return cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
  };
  */

  const printBill = (billNumber: number, billDate: Date) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill #${billNumber}</title>
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
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${profile?.shop_name || "Shop Name"}</div>
          <div class="shop-details">${profile?.address || ""}</div>
          <div class="shop-details">Ph: ${profile?.phone_number || ""}</div>
        </div>
        
        <div class="bill-info">
          <div><strong>Bill #:</strong> ${billNumber}</div>
          <div><strong>Date:</strong> ${billDate.toLocaleDateString("en-IN")} ${billDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
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
            ${cart.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td class="qty">${item.quantity} ${item.unit}</td>
                <td class="price">₹${item.selling_price * item.quantity}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td class="price">₹${getTotal()}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Thank you for shopping!<br>
          Visit again
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.write('<script>window.onload = function() { window.print(); window.close(); }</script>');
      printWindow.document.close();
    }
  };

  const generateBill = async () => {
    if (cart.length === 0) return;

    setIsGeneratingBill(true);

    try {
      const billData = {
        total_amount: getTotal(),
        total_cost: cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0),
        items: cart
      };

      const result: any = await apiClient.post('/billing', billData);

      // Print the bill
      printBill(result.bill_number || 0, new Date());

      toast({
        title: "Bill Generated!",
        description: `Bill #${result.bill_number} - Total: ₹${getTotal()}`,
      });

      // Clear cart and refresh inventory
      setCart([]);
      fetchInventory();
    } catch (error: any) {
      console.error("Error generating bill:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bill.",
        variant: "destructive",
      });
    }

    setIsGeneratingBill(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">Billing</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        {/* Input Section */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder='Type item (e.g., "2kg rice")'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button onClick={handleAddItem} disabled={isProcessing || !inputValue.trim()}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Type items like '2kg chawal', 'rice 2 kilo', 'ek litre doodh'
            </p>
          </CardContent>
        </Card>

        {/* Cart Section */}
        <Card className="flex-1 flex flex-col mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cart ({cart.length} items)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Cart is empty. Add items using the input above.
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.selling_price}/{item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(index, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">
                        {item.quantity} {item.unit}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(index, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <span className="w-20 text-right font-semibold">
                        ₹{item.selling_price * item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total & Generate Bill */}
        <Card>
          <CardContent className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">₹{getTotal()}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={generateBill}
              disabled={cart.length === 0 || isGeneratingBill}
            >
              {isGeneratingBill ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Printer className="h-5 w-5 mr-2" />
              )}
              Generate Bill
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
