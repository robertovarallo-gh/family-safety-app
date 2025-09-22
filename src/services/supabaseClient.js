// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Variables de entorno para el frontend (diferentes al backend)

 const supabaseUrl = 'https://brqffinwgfyixgatbmgr.supabase.co';
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycWZmaW53Z2Z5aXhnYXRibWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTc4NDgsImV4cCI6MjA3Mjg3Mzg0OH0.WVH3XW0JVwLxUK2NFpbEqre50JHT_ebzYe1foda9s2E';

export const supabase = createClient(supabaseUrl, supabaseKey);