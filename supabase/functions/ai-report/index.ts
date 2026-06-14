// Supabase Edge Function: ai-report
// Proxies a natural-language reporting question to the Anthropic API,
// grounding the answer in live data pulled from the BevCore database.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { question, outletId } = await req.json();
    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "question" in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const outletFilter = (q: any) => (outletId ? q.eq('outlet_id', outletId) : q);

    const [outlets, variance, lowStock, pourCost, recentAdjustments, recentDeliveries] =
      await Promise.all([
        supabase.from('outlets').select('id, name'),
        outletFilter(
          supabase
            .from('variance_report')
            .select(
              'outlet_name, ingredient_name, category, opening_stock_ml, theoretical_on_hand_ml, counted_ml, theoretical_consumed_ml, actual_variance_ml, variance_aed, status, count_date'
            )
            .order('variance_aed', { ascending: true })
            .limit(40)
        ),
        outletFilter(
          supabase
            .from('inventory_stock')
            .select('outlet_id, on_hand_ml, opening_stock_ml, ingredient_id, wine_id')
            .lt('on_hand_ml', 1000)
            .limit(40)
        ),
        supabase
          .from('recipes')
          .select('name, category, selling_price, cost, calculated_cost')
          .order('calculated_cost', { ascending: false })
          .limit(30),
        outletFilter(
          supabase
            .from('stock_adjustments')
            .select('type, ingredient_name, quantity_value, quantity_unit, wastage_reason, adjustment_date, item_category')
            .order('adjustment_date', { ascending: false })
            .limit(30)
        ),
        supabase
          .from('deliveries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

    const context = {
      outlets: outlets.data ?? [],
      variance_report_sample: variance.data ?? [],
      low_stock_items: lowStock.data ?? [],
      highest_cost_recipes: pourCost.data ?? [],
      recent_stock_adjustments: recentAdjustments.data ?? [],
      recent_deliveries: recentDeliveries.data ?? [],
    };

    const systemPrompt = `You are the AI reporting assistant for BevCore, a bar management system for Waldorf Astoria DIFC (4 outlets: Bull & Bear, St Trop, Peacock Alley, IRD).
You are given a JSON snapshot of live data from the database (variance reports, low stock, recipe costs, recent adjustments and deliveries).
Answer the user's question using ONLY this data. Be concise, use AED for currency, use tables/bullet points where useful.
If the data doesn't contain enough information to answer, say so plainly and suggest what data would be needed.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `DATA SNAPSHOT:\n${JSON.stringify(context)}\n\nQUESTION:\n${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Anthropic API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text ?? 'No response generated.';

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
