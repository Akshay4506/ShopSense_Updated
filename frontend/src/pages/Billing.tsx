import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Store, ArrowLeft, Plus, Trash2, Download, Loader2, Mic, MicOff } from "lucide-react";
import html2canvas from "html2canvas";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { Receipt } from "@/components/Receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Ref for the receipt element inside modal
  const receiptRef = useRef<HTMLDivElement>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [billPreview, setBillPreview] = useState<any>(null);

  // State to hold bill data for the receipt capture
  const [billToCapture, setBillToCapture] = useState<any>(null);

  // 1. Helper Functions
  const parseItemInput = (input: string, inventory: InventoryItem[]) => {
    // Normalize input: remove special chars (except dots for decimals) and convert words to numbers
    // This helps with "One kg sugar" -> "1 kg sugar"
    let normalizedInput = input.trim();

    // Map common number words to digits
    // Map common number words to digits (English & Telugu)
    const numberMap: { [key: string]: string } = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'a': '1', 'an': '1',
      // Telugu numbers
      'ఒక': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4', 'ఐదు': '5',
      'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9', 'పది': '10',
      'okati': '1', 'oka': '1'
    };

    // Replace number words at the start of string
    // e.g. "One kg" -> "1 kg", "ఒక కిలో" -> "1 కిలో"
    const firstWord = normalizedInput.split(' ')[0].toLowerCase();
    if (numberMap[firstWord]) {
      normalizedInput = normalizedInput.replace(new RegExp(`^${firstWord}`, 'i'), numberMap[firstWord]);
    }

    // Regex updated to allow non-English letters in unit (e.g. కిలో)
    // (\d+(\.\d+)?) -> Captures number (1.5)
    // \s* -> Spaces
    // ([^\s\d]+)? -> Captures unit (anything not space or digit, e.g. kg, lbs, కిలో)
    const quantityRegex = /(\d+(\.\d+)?)\s*([^\s\d]+)?/;
    let quantity = 1;
    let unit = "";
    let itemName = normalizedInput;

    const match = normalizedInput.match(quantityRegex);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        if (normalizedInput.startsWith(match[0])) {
          quantity = num;
          unit = match[3] || "";
          itemName = normalizedInput.substring(match[0].length).trim();
        }
      }
    }

    // Clean up punctuation from itemName
    itemName = itemName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

    // Translation Map (Telugu -> English)
    const translationMap: { [key: string]: string } = {
        'బియ్యం': 'rice', 'biyyam': 'rice',
        'పప్పు': 'dal', 'pappu': 'dal',
        'పాలు': 'milk', 'paalu': 'milk',
        'పంచదార': 'sugar', 'panchadara': 'sugar', 'చెక్కర': 'sugar', 'chekkara': 'sugar',
        'టమాటా': 'tomato', 'tamata': 'tomato',
        'ఉల్లిపాయ': 'onion', 'ullipaya': 'onion',
        'బంగాళాదుంప': 'potato', 'bangaladumpa': 'potato',
        'నూనె': 'oil', 'nune': 'oil',
        'ఉప్పు': 'salt', 'uppu': 'salt'
    };

    // Auto-translate if applicable
    // Check exact match first
    if (translationMap[itemName.toLowerCase()]) {
        itemName = translationMap[itemName.toLowerCase()];
    } else {
        // Check partial match (e.g. "sona masoori biyyam" -> contains biyyam)
        // Simple heuristic: if the phrase contains a known key, replace it or assume that's the item.
        // For accurate matching, let's substitute known words.
        Object.keys(translationMap).forEach(key => {
            if (itemName.toLowerCase().includes(key)) {
                itemName = itemName.toLowerCase().replace(key, translationMap[key]);
            }
        });
    }

    const exactMatch = inventory.find(i => i.item_name.toLowerCase() === input.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim());
    if (exactMatch) return { item_name: exactMatch.item_name, quantity: 1, unit: exactMatch.unit };

    const itemMatch = inventory.find(i => i.item_name.toLowerCase().includes(itemName.toLowerCase()));

    return {
      item_name: itemMatch ? itemMatch.item_name : itemName,
      quantity: quantity,
      unit: unit || (itemMatch ? itemMatch.unit : "pcs")
    };
  };

  const processAddItem = async (inputSafe: string): Promise<boolean> => {
    if (!inputSafe) return false;
    setIsProcessing(true);

    try {
      const data = parseItemInput(inputSafe, inventory);
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
        return false;
      }

      if (matchedItem.quantity === 0) {
        toast({
          title: "Out of Stock",
          description: `${matchedItem.item_name} is out of stock.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return false;
      }

      const existingIndex = cart.findIndex(
        item => item.inventory_id === matchedItem.id
      );

      if (existingIndex >= 0) {
        const newCart = [...cart];
        const newQty = newCart[existingIndex].quantity + data.quantity;

        if (newQty > matchedItem.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${matchedItem.quantity} ${matchedItem.unit} available.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return false;
        }

        newCart[existingIndex].quantity = newQty;
        setCart(newCart);
      } else {
        if (data.quantity > matchedItem.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${matchedItem.quantity} ${matchedItem.unit} available.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return false;
        }

        setCart(prev => [...prev, {
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

      return true;

    } catch (error) {
      console.error("Error parsing item:", error);
      toast({
        title: "Error",
        description: "Failed to process item.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Voice Handling (Calls Helper)
  const handleVoiceData = async (transcript: string) => {
    // Determine input by removing trailing dot if present (common in voice)
    const cleanTranscript = transcript.replace(/\.$/, "");

    setInputValue(cleanTranscript);
    toast({
      title: "Heard:",
      description: cleanTranscript,
    });
    const success = await processAddItem(cleanTranscript);
    if (success) {
      // Clear input after short delay to show what was recognized
      setTimeout(() => setInputValue(""), 1000);
    }
  };

  const [language, setLanguage] = useState("en-IN");

  // 3. Custom Hook (Must be top level, unconditional)
  const { isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition(handleVoiceData, language);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      toast({
        title: "Listening...",
        description: language === 'te-IN' ? "Matladandi..." : "Speak items...",
        variant: "default",
      });
    }
  };

  // 4. Effects
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

  // 5. Event Handlers
  const handleAddItem = async () => {
    if (!inputValue.trim()) return;
    await processAddItem(inputValue);
    setInputValue("");
    inputRef.current?.focus();
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

  const downloadBillImage = async () => {
    if (!receiptRef.current || !billPreview) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2 // Higher resolution
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Bill-${billPreview.bill_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsPreviewOpen(false);

      toast({
        title: "Downloaded",
        description: "Bill image saved successfully.",
      });

    } catch (error) {
      console.error("Image generation failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate the bill image.",
        variant: "destructive"
      });
    }
  };

  const generateBill = async () => {
    if (cart.length === 0) return;

    setIsGeneratingBill(true);

    try {
      const totalAmount = getTotal();
      const billDataPayload = {
        total_amount: totalAmount,
        total_cost: cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0),
        items: cart
      };

      const result: any = await apiClient.post('/billing', billDataPayload);

      // Prepare preview data
      const previewData = {
        bill_number: result.bill_number || 0,
        created_at: new Date(),
        total_amount: totalAmount,
        items: [...cart]
      };

      setBillPreview(previewData);
      setIsPreviewOpen(true); // Open modal

      toast({
        title: "Bill Generated!",
        description: `Bill #${result.bill_number} created.`,
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

  // 6. Conditional Render (Must be last)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 7. Main Render
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
              {/* Language Selector */}
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English</SelectItem>
                  <SelectItem value="te-IN">Telugu</SelectItem>
                </SelectContent>
              </Select>

              {/* Mic Icon */}
              {hasRecognitionSupport && (
                <Button
                  variant={isListening ? "destructive" : "secondary"}
                  onClick={toggleListening}
                  disabled={isProcessing}
                  title={isListening ? "Stop Listening" : "Start Voice Input"}
                  className={isListening ? "animate-pulse" : ""}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}

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
                <Download className="h-5 w-5 mr-2" />
              )}
              Generate Bill
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>

          <div className="border p-2 bg-gray-100 flex justify-center">
            {/* The Receipt component to be captured */}
            {billPreview && profile && (
              <Receipt ref={receiptRef} bill={billPreview} shop={profile} />
            )}
          </div>

          <DialogFooter className="flex-col sm:justify-center gap-2">
            <Button className="w-full" onClick={downloadBillImage}>
              <Download className="mr-2 h-4 w-4" /> Download Image
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
