import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import {
  Store,
  ArrowLeft,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
} from 'lucide-react';

interface DailySession {
  id: string;
  start_time: string;
  end_time: string | null;
  total_sales: number;
  total_cost: number;
  status: string;
}

interface Bill {
  total_amount: number;
  total_cost: number;
  created_at: string;
}

export default function DailyOperations() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeSession, setActiveSession] = useState<DailySession | null>(null);
  const [todaysBills, setTodaysBills] = useState<Bill[]>([]);
  const [pastSessions, setPastSessions] = useState<DailySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

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
    await Promise.all([fetchActiveSession(), fetchPastSessions()]);
    setIsLoading(false);
  };

  const fetchActiveSession = async () => {
    try {
      const session: any = await apiClient.get('/daily-operations/active');
      setActiveSession(session);

      if (session) {
        // Fetch bills created during this session
        const bills: any = await apiClient.get(
          `/daily-operations/today-bills?startTime=${session.start_time}`,
        );
        setTodaysBills(bills || []);
      } else {
        setTodaysBills([]);
      }
    } catch (error) {
      console.error('Failed to fetch active session', error);
    }
  };

  const fetchPastSessions = async () => {
    try {
      const sessions: any = await apiClient.get('/daily-operations/past');
      setPastSessions(sessions || []);
    } catch (error) {
      console.error('Failed to fetch past sessions', error);
    }
  };

  const startDay = async () => {
    if (activeSession) {
      toast({
        title: 'Day Already Started',
        description: 'End the current day before starting a new one.',
        variant: 'destructive',
      });
      return;
    }

    setIsStarting(true);

    try {
      const newSession: any = await apiClient.post(
        '/daily-operations/start',
        {},
      );

      setActiveSession(newSession);
      setTodaysBills([]);
      toast({
        title: 'Day Started!',
        description: "Good luck with today's sales!",
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start day. Please try again.',
        variant: 'destructive',
      });
    }

    setIsStarting(false);
  };

  const endDay = async () => {
    if (!activeSession) return;

    setIsEnding(true);

    const totalSales = todaysBills.reduce((sum, b) => sum + b.total_amount, 0);
    const totalCost = todaysBills.reduce((sum, b) => sum + b.total_cost, 0);

    try {
      await apiClient.put('/daily-operations/end', {
        id: activeSession.id,
        total_sales: totalSales,
        total_cost: totalCost,
      });

      const profit = totalSales - totalCost;
      toast({
        title: 'Day Ended!',
        description:
          profit >= 0
            ? `Today's Profit: ₹${profit}`
            : `Today's Loss: ₹${Math.abs(profit)}`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to end day. Please try again.',
        variant: 'destructive',
      });
    }

    setIsEnding(false);
  };

  const getTodayStats = () => {
    const totalSales = todaysBills.reduce((sum, b) => sum + b.total_amount, 0);
    const totalCost = todaysBills.reduce((sum, b) => sum + b.total_cost, 0);
    const profit = totalSales - totalCost;
    return { totalSales, totalCost, profit, billCount: todaysBills.length };
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = getTodayStats();

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
                Daily Operations
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Start/End Day Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Session</CardTitle>
            <CardDescription>
              {activeSession
                ? `Started at ${formatTime(activeSession.start_time)}`
                : 'Start a new day to track sales'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!activeSession ? (
              <Button
                onClick={startDay}
                className="w-full"
                size="lg"
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                Start Day
              </Button>
            ) : (
              <Button
                onClick={endDay}
                variant="destructive"
                className="w-full"
                size="lg"
                disabled={isEnding}
              >
                {isEnding ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Square className="h-5 w-5 mr-2" />
                )}
                End Day
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        {activeSession && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Today's Summary</h2>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Sales</CardDescription>
                  <CardTitle className="text-2xl text-primary">
                    ₹{stats.totalSales}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Bills Generated</CardDescription>
                  <CardTitle className="text-2xl">{stats.billCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card
              className={
                stats.profit >= 0 ? 'border-primary' : 'border-destructive'
              }
            >
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  {stats.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  {stats.profit >= 0 ? 'Profit' : 'Loss'}
                </CardDescription>
                <CardTitle
                  className={`text-3xl ${stats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}
                >
                  {stats.profit >= 0 ? '₹' : '-₹'}
                  {Math.abs(stats.profit)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Total Sales:</span>
                    <span>₹{stats.totalSales}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span>₹{stats.totalCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recent Days</h2>
            <div className="space-y-2">
              {pastSessions.map((session) => {
                const profit = session.total_sales - session.total_cost;
                return (
                  <Card key={session.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {formatDate(session.start_time)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)} -{' '}
                            {formatTime(session.end_time!)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Sales: ₹{session.total_sales}
                          </p>
                          <p
                            className={`font-semibold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}
                          >
                            {profit >= 0 ? 'Profit' : 'Loss'}: ₹
                            {Math.abs(profit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
