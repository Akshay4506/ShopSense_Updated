import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Mail, Lock, User, KeyRound, Loader2, MapPin, Phone, Building2, Timer } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiClient } from "@/api/client";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopkeeperName, setShopkeeperName] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);

  // Views: "login", "signup", "forgot-password", "reset-password", "login-otp-send", "login-otp-verify"
  const [view, setView] = useState("login");

  // OTP State
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [countdown, setCountdown] = useState(0); // Resend timer

  const { login: authLogin, loginWithToken, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Timer logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const startTimer = () => setCountdown(60);

  // --- Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authLogin(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to login" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/auth/register", {
        email,
        password,
        shopkeeper_name: shopkeeperName,
        shop_name: shopName,
        address: address,
        phone: phone
      });
      toast({ title: "Success", description: "Account created! Please login." });
      setView("login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.error || "Failed to create account" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/send-login-otp", { email });
      toast({ title: "Code Sent", description: "Check your email for the login code." });
      setView("login-otp-verify");
      startTimer();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.error || "Failed to send code" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login-with-otp", { email, otp });
      // console.log("OTP Login Response:", res);
      loginWithToken(res.token, res.user);
      navigate("/dashboard");
    } catch (error: any) {
      // console.error("OTP Login Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || error.message || "Invalid code"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      toast({ title: "OTP Sent", description: "Check your email for the verification code." });
      setView("reset-password");
      startTimer();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.error || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { email, otp, newPassword });
      toast({ title: "Password Reset", description: "Your password has been changed. Please login." });
      setView("login");
      setPassword("");
      setNewPassword("");
      setOtp("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.error || "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px] mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Store className="h-8 w-8" />
          <span className="text-2xl font-bold">ShopSense</span>
        </div>

        {/* Dynamic Headers */}
        {(view === "login" || view === "signup") && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to ShopSense</h1>
            <p className="text-sm text-muted-foreground">Smart Dukaan Management System</p>
          </div>
        )}
        {view === "login-otp-send" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Login with OTP</h1>
            <p className="text-sm text-muted-foreground">Enter your email to receive a login code</p>
          </div>
        )}
        {view === "login-otp-verify" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Verify Login</h1>
            <p className="text-sm text-muted-foreground">Enter the code sent to {email}</p>
          </div>
        )}
        {view === "forgot-password" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Enter your email to verify your identity</p>
          </div>
        )}
        {view === "reset-password" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">New Password</h1>
            <p className="text-sm text-muted-foreground">Enter the OTP sent to your email</p>
          </div>
        )}
      </div>

      <Card className="w-full max-w-[420px] border-border/40 shadow-xl">
        <CardContent className="pt-6">
          {view === "login" || view === "signup" ? (
            <Tabs value={view} onValueChange={(v) => setView(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Button variant="link" className="p-0 h-auto text-muted-foreground" type="button" onClick={() => setView("login-otp-send")}>
                      Login with OTP
                    </Button>
                    <Button variant="link" className="p-0 h-auto text-primary" type="button" onClick={() => setView("forgot-password")}>
                      Forgot password?
                    </Button>
                  </div>

                  <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="shopkeeperName">Shopkeeper Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="shopkeeperName" className="pl-9" placeholder="Your Name" value={shopkeeperName} onChange={(e) => setShopkeeperName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="shopName" className="pl-9" placeholder="My Awesome Shop" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" className="pl-9" placeholder="1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Shop Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="address" className="pl-9" placeholder="123 Main St, City" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" className="pl-9" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" className="pl-9" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                  </div>

                  <Button className="w-full bg-primary hover:bg-primary/90" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : null}

          {/* Login with OTP - Send */}
          {view === "login-otp-send" && (
            <form onSubmit={handleSendLoginOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-otp-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="login-otp-email" className="pl-9" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={loading || countdown > 0}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (countdown > 0 ? `Resend in ${countdown}s` : "Send Verification Code")}
              </Button>
              <Button variant="ghost" className="w-full" type="button" onClick={() => setView("login")}>Back to Login</Button>
            </form>
          )}

          {/* Login with OTP - Verify */}
          {view === "login-otp-verify" && (
            <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-otp-code">Verification Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="login-otp-code" className="pl-9 tracking-widest font-mono" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
                </div>
              </div>

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Login"}
              </Button>

              <div className="text-center text-sm">
                {countdown > 0 ? (
                  <span className="text-muted-foreground flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> Resend available in {countdown}s</span>
                ) : (
                  <Button variant="link" className="h-auto p-0" type="button" onClick={handleSendLoginOtp}>Resend Code</Button>
                )}
              </div>

              <Button variant="ghost" className="w-full" type="button" onClick={() => setView("login")}>Back to Login</Button>
            </form>
          )}

          {/* Forgot Password - Send */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="reset-email" className="pl-9" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={loading || countdown > 0}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (countdown > 0 ? `Resend in ${countdown}s` : "Send Verification Code")}
              </Button>
              <Button variant="ghost" className="w-full" type="button" onClick={() => setView("login")}>Back to Login</Button>
            </form>
          )}

          {/* Forgot Password - Verify & Reset */}
          {view === "reset-password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code (OTP)</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="otp" className="pl-9 tracking-widest font-mono" placeholder="123456" value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="new-password" type="password" className="pl-9" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
              </div>

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
              </Button>

              <div className="text-center text-sm">
                {countdown > 0 ? (
                  <span className="text-muted-foreground flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> Resend available in {countdown}s</span>
                ) : (
                  <Button variant="link" className="h-auto p-0" type="button" onClick={handleForgotPassword}>Resend Code</Button>
                )}
              </div>

              <Button variant="ghost" className="w-full" type="button" onClick={() => setView("forgot-password")}>Back</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ShopSense. All rights reserved.</p>
      </div>
    </div>
  );
}
