// Supabase Configuration
const SUPABASE_URL = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3dvc25oZXdibHhkdHZ0YmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDg5NjEsImV4cCI6MjA4MDcyNDk2MX0.xghqZwlpxQ6Gu0nz98wVUOOtz-Hqiw5NPNJ0mAE9TLc';

// Stripe Configuration  
const STRIPE_PUBLIC_KEY = 'pk_live_51SaqPKL1Zz9xnRn7G1aXYaSm3oBmhoweyi9YTLlBGzdSzcpmVh1Ldla4rWWPLaNJqtbTOTILTzCSA4iBK6j6s4dx00SRABq1lW';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize Stripe
const stripe = typeof Stripe !== 'undefined' ? Stripe(STRIPE_PUBLIC_KEY) : null;
