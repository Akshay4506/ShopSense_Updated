import { Store, ShoppingCart, Package } from "lucide-react";

export function CrazyLoader() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative">
                {/* Bouncing Store Icon */}
                <div className="animate-bounce">
                    <Store className="h-16 w-16 text-primary" />
                </div>

                {/* Orbiting Elements */}
                <div className="absolute top-0 left-0 h-16 w-16 animate-spin-slow">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <ShoppingCart className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                        <Package className="h-6 w-6 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Loading Text with Pulse */}
            <h2 className="mt-8 text-2xl font-bold animate-pulse bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Setting up Shop...
            </h2>
            <p className="text-sm text-muted-foreground mt-2 animate-bounce delay-100">
                Stocking shelves...
            </p>
        </div>
    );
}
