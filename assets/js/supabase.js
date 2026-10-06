/* =========================================================
   CONEXÃO COM SUPABASE
   AGENDA COMPRADOR
========================================================= */

const SUPABASE_URL =
    "https://twecykohucvtcyjkuqbo.supabase.co";


const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Fb82p8wNs2PZa1KJTWJcUg_bNgqBDl2";


/* =========================================================
   CLIENTE SUPABASE
========================================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


console.log(
    "Supabase conectado com sucesso:",
    supabaseClient
);