import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Store,
  ArrowLeft,
  Download,
  Loader2,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { Receipt } from '@/components/Receipt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Bill {
  id: string;
  bill_number: number;
  total_amount: number;
  total_cost: number;
  created_at: string;
  // In a real app, you'd fetch items too. For now we print summary.
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
  const { toast } = useToast();

  // Ref for capture
  const receiptRef = useRef<HTMLDivElement>(null);

  const [bills, setBills] = useState<Bill[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for preview/capture
  const [billToPreview, setBillToPreview] = useState<Bill | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const [billsData, profileData] = await Promise.all([
        apiClient.get('/billing'),
        apiClient.get('/profile'),
      ]);

      setBills(billsData || []);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch bill history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const openPreview = async (billSummary: Bill) => {
    setIsPreviewLoading(true);
    try {
      const fullBill: any = await apiClient.get(`/billing/${billSummary.id}`);
      setBillToPreview(fullBill);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Failed to fetch bill details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bill details.',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const downloadBillImage = async () => {
    if (!receiptRef.current || !billToPreview) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Bill-${billToPreview.bill_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsPreviewOpen(false);

      toast({
        title: 'Bill Downloaded',
        description: `Bill #${billToPreview.bill_number} saved as image.`,
      });
    } catch (error) {
      console.error('Image generation failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not generate the bill image.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">
                Bill History
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {bills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bills generated yet.</p>
              <Button className="mt-4" onClick={() => navigate('/billing')}>
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
                        <p className="font-semibold">
                          Bill #{bill.bill_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(bill.created_at)} at{' '}
                          {formatTime(bill.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">₹{bill.total_amount}</p>
                          <p
                            className={`text-xs ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}
                          >
                            {profit >= 0 ? '+' : ''}₹{profit} profit
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openPreview(bill)}
                          disabled={isPreviewLoading}
                        >
                          {isPreviewLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
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

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>

          <div className="border p-2 bg-gray-100 flex justify-center">
            {/* The Receipt component to be captured */}
            {billToPreview && profile && (
              <Receipt ref={receiptRef} bill={billToPreview} shop={profile} />
            )}
          </div>

          <DialogFooter className="flex-col sm:justify-center gap-2">
            <Button className="w-full" onClick={downloadBillImage}>
              <Download className="mr-2 h-4 w-4" /> Download Image
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
