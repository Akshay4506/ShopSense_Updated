import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, inventory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const inventoryList = inventory.map((item: any) => 
      `- ${item.item_name} (₹${item.selling_price}/${item.unit}, stock: ${item.quantity})`
    ).join('\n');

    const systemPrompt = `You are a smart shop assistant that parses customer orders in any language (Hindi, English, Hinglish, Tenglish, etc.).

Available inventory:
${inventoryList}

Parse the user's input and extract:
1. Item name (match to closest inventory item)
2. Quantity (number)
3. Unit (convert if needed: 1000g=1kg, 1000ml=1litre)

Examples:
- "2kg chawal" → item: "Rice", quantity: 2, unit: "kg"
- "rice 2 kilo" → item: "Rice", quantity: 2, unit: "kg"
- "500g sugar" → item: "Sugar", quantity: 500, unit: "g"
- "ek litre doodh" → item: "Milk", quantity: 1, unit: "litre"
- "2 packet namak" → item: "Salt", quantity: 2, unit: "pack"

Return ONLY a JSON object with these fields:
- found: boolean (true if item matched inventory)
- item_name: string (matched item name from inventory, or parsed name if not found)
- quantity: number
- unit: string (normalized unit)
- original_input: string (the original input)
- error: string (only if parsing failed)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      parsed = {
        found: false,
        item_name: input,
        quantity: 1,
        unit: "pcs",
        original_input: input,
        error: "Could not parse input"
      };
    }

    console.log("Parsed item:", parsed);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-item:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      found: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
