
declare namespace Deno {
  interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  }

  interface EdgeRuntime {
    waitUntil(promise: Promise<any>): void;
  }
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}
