// Supabase Configuration - IDEMPOTENT VERSION
// Safe to load multiple times without errors

// Only initialize if not already done
if (typeof window.supabaseClient === 'undefined') {
    const SUPABASE_URL = 'https://xfswosnhewblxdtvtbcz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3dvc25oZXdibHhkdHZ0YmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDg5NjEsImV4cCI6MjA4MDcyNDk2MX0.xghqZwlpxQ6Gu0nz98wVUOOtz-Hqiw5NPNJ0mAE9TLc';
    
    // Stripe Configuration  
    const STRIPE_PUBLIC_KEY = 'pk_live_51SaqPKL1Zz9xnRn7G1aXYaSm3oBmhoweyi9YTLlBGzdSzcpmVh1Ldla4rWWPLaNJqtbTOTILTzCSA4iBK6j6s4dx00SRABq1lW';
    
    // Initialize on window to avoid "already declared" errors
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    });
    
    // Initialize Stripe
    window.stripeClient = typeof Stripe !== 'undefined' ? Stripe(STRIPE_PUBLIC_KEY) : null;
    
    console.log('✓ Supabase initialized');
}

// Create aliases for backwards compatibility
const supabase = window.supabaseClient;
const stripe = window.stripeClient;
