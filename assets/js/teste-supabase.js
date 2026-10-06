console.log("TESTE-SUPABASE.JS FOI CARREGADO");


/* =========================================================
   TESTE DE LEITURA DO SUPABASE
========================================================= */

async function testarSupabase() {

    const { data, error } =
        await supabaseClient
            .from("grupos")
            .select("codigo, nome")
            .order("nome");


    if (error) {

        console.error(
            "Erro ao consultar grupos:",
            error
        );

        return;

    }


    console.log(
        "Grupos encontrados no Supabase:",
        data
    );

}


testarSupabase();