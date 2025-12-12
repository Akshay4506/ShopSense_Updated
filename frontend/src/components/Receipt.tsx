import React, { forwardRef } from "react";

interface BillItem {
    item_name: string;
    quantity: number;
    unit: string;
    selling_price: number;
}

interface BillData {
    bill_number: number;
    created_at: string | Date;
    total_amount: number;
    items?: BillItem[];
}

interface ShopProfile {
    shop_name: string;
    address: string;
    phone_number: string;
}

interface ReceiptProps {
    bill: BillData;
    shop: ShopProfile;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ bill, shop }, ref) => {
    const dateObj = new Date(bill.created_at);
    const dateStr = dateObj.toLocaleDateString("en-IN");
    const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    return (
        <div
            ref={ref}
            className="bg-white text-black p-4 mx-auto"
            style={{
                width: "300px", // Standard thermal width approx
                fontFamily: "'Courier New', Courier, monospace", // Monospace looks more like thermal print
                fontSize: "12px",
                lineHeight: "1.4",
            }}
        >
            {/* Header */}
            <div className="text-center mb-2">
                <h2 className="font-bold text-lg uppercase mb-1">{shop.shop_name}</h2>
                <p className="text-[10px] text-gray-600 break-words w-3/4 mx-auto">{shop.address}</p>
                <p className="text-[10px] mt-1">Ph: {shop.phone_number}</p>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-black my-2"></div>

            {/* Bill Info */}
            <div className="flex justify-between text-[10px] mb-2">
                <div>
                    <p>Bill #: {bill.bill_number}</p>
                    <p>Date: {dateStr} {timeStr}</p>
                </div>
            </div>

            {/* Table Header */}
            <div className="flex border-b border-dashed border-black pb-1 mb-1 font-bold text-[10px]">
                <div className="flex-[2] text-left">Item</div>
                <div className="flex-1 text-center">Qty</div>
                <div className="flex-1 text-right">Amount</div>
            </div>

            {/* Items */}
            <div className="mb-2">
                {bill.items && bill.items.length > 0 ? (
                    bill.items.map((item, index) => (
                        <div key={index} className="flex text-[10px] mb-1">
                            <div className="flex-[2] text-left truncate pr-1">{item.item_name}</div>
                            <div className="flex-1 text-center whitespace-nowrap">
                                {item.quantity} {item.unit}
                            </div>
                            <div className="flex-1 text-right">
                                ₹{item.selling_price * item.quantity}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center italic text-gray-500 py-2">
                        (Summary only - Items list unavailable)
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-black my-2"></div>

            {/* Total */}
            <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>₹{bill.total_amount}</span>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-black my-2 mt-4 pt-2 text-center text-[10px]">
                <p>Thank you for shopping!</p>
                <p className="mt-1">Visit again</p>
                <p className="text-[8px] text-gray-400 mt-2">*** SHOP SENSE ***</p>
            </div>
        </div>
    );
});

Receipt.displayName = "Receipt";
