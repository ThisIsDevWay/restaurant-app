import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (anon key) used only for Realtime subscriptions
 * in the internal POS (waiter/caja). Singleton — never instantiate per render.
 * Do NOT use the service-role client (src/lib/supabase.ts) in the browser.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  },
);
