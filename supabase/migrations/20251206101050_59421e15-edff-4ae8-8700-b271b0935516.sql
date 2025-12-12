-- Create bills table
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_number SERIAL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bills
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Bills policies
CREATE POLICY "Users can view their own bills" 
ON public.bills FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills" 
ON public.bills FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create bill_items table
CREATE TABLE public.bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  cost_price INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bill_items
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Bill items policies (access through bills)
CREATE POLICY "Users can view their own bill items" 
ON public.bill_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bills 
    WHERE bills.id = bill_items.bill_id 
    AND bills.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create bill items for their bills" 
ON public.bill_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bills 
    WHERE bills.id = bill_items.bill_id 
    AND bills.user_id = auth.uid()
  )
);