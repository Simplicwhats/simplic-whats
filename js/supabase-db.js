// Configurações do Supabase do SIMPLIC
const SUPABASE_URL = "https://kgidkxaqvgcqiqwqxvut.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWRreGFxdmdjcWlxd3F4dnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODc0MzAsImV4cCI6MjA5ODA2MzQzMH0.DLQoO8_q_QeW-a084ZDCFRc0OIeuEDaYpkUg2tSCB0E";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estados Globais Compartilhados entre os scripts
let contatos = [];
let whatsappAccounts = [];
let listaScripts = [];
let contaEditandoIndex = null;
let usuarioLogado = "";
let abaWhatsAppReferencia = null; 
let previewTimerInterval = null;