import { useState } from "react";
import { User, LogOut, Settings, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
    shopkeeper_name: string;
    shop_name: string;
    address: string;
    phone_number: string;
}

interface UserProfileProps {
    initialProfile: Profile | null;
    onProfileUpdate: (newProfile: Profile) => void;
}

export function UserProfile({ initialProfile, onProfileUpdate }: UserProfileProps) {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Profile Form State
    const [formData, setFormData] = useState<Profile>({
        shopkeeper_name: initialProfile?.shopkeeper_name || "",
        shop_name: initialProfile?.shop_name || "",
        address: initialProfile?.address || "",
        phone_number: initialProfile?.phone_number || "",
    });

    // Password Update State
    const [newPassword, setNewPassword] = useState("");

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast({
                title: "Error",
                description: "User not found",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update(formData)
            .eq("user_id", user.id);

        if (error) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Profile Updated",
                description: "Your profile details have been saved.",
            });
            onProfileUpdate(formData);
            setIsEditing(false);
        }
        setIsLoading(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast({
                title: "Invalid Password",
                description: "Password must be at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
            });
            setNewPassword("");
        }
        setIsLoading(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                        setFormData({
                            shopkeeper_name: initialProfile?.shopkeeper_name || "",
                            shop_name: initialProfile?.shop_name || "",
                            address: initialProfile?.address || "",
                            phone_number: initialProfile?.phone_number || "",
                        });
                        setIsDialogOpen(true);
                    }}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Profile Settings</DialogTitle>
                        <DialogDescription>
                            Manage your account settings and preferences.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Profile Details</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <div className="flex justify-end">
                                {!isEditing ? (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="shopkeeper">Shopkeeper Name</Label>
                                    <Input
                                        id="shopkeeper"
                                        value={formData.shopkeeper_name}
                                        onChange={(e) => setFormData({ ...formData, shopkeeper_name: e.target.value })}
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shopname">Shop Name</Label>
                                    <Input
                                        id="shopname"
                                        value={formData.shop_name}
                                        onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>

                                {isEditing && (
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                )}
                            </form>
                        </TabsContent>

                        <TabsContent value="security" className="space-y-4 mt-4">
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}
