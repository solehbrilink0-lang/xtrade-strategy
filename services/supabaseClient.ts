import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI PENGEMBANG ---

// 1. PROJECT URL:
// Dapatkan di: Settings -> API -> Project URL
export const SUPABASE_PROJECT_URL = "https://xcoaqykpbmaiaawheefj.supabase.co";

// 2. ANON PUBLIC KEY:
// Dapatkan di: Settings -> API -> Project API keys -> anon public
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjb2FxeWtwYm1haWFhd2hlZWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTM0MjMsImV4cCI6MjA4NTkyOTQyM30.YnfHI0bmoiZRWUHEvsarlB5CyA1_qNtvLD5Oos8pWCI";

export const supabase = (SUPABASE_PROJECT_URL && SUPABASE_ANON_KEY && SUPABASE_PROJECT_URL.startsWith('http')) 
  ? createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY) 
  : null;