import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGEM_LOCAL = "http://127.0.0.1:5500";

const URL_CONVITE =
    "http://127.0.0.1:5500/definir-senha.html";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": ORIGEM_LOCAL,
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
};

function resposta(
    dados: unknown,
    status = 200
): Response {
    return new Response(JSON.stringify(dados), {
        status,
        headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
        },
    });
}

/* =========================================
   OBTER A CHAVE PRIVILEGIADA DO SERVIDOR
   NUNCA COLOCAR ESSA CHAVE NO NAVEGADOR
========================================= */

function obterChaveServidor(): string {
    const chaveDireta =
        Deno.env.get("SUPABASE_SECRET_KEY") ||
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (chaveDireta) {
        return chaveDireta;
    }

    const chavesJson =
        Deno.env.get("SUPABASE_SECRET_KEYS");

    if (chavesJson) {
        const chaves = JSON.parse(chavesJson);

        if (typeof chaves.default === "string") {
            return chaves.default;
        }

        const valores = Object.values(chaves).filter(
            (valor): valor is string =>
                typeof valor === "string"
        );

        if (valores.length === 1) {
            return valores[0];
        }
    }

    throw new Error(
        "Chave privilegiada não encontrada no servidor."
    );
}

/* =========================================
   PROCESSAR SOLICITAÇÕES
========================================= */

Deno.serve(async (req: Request) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: CORS_HEADERS,
        });
    }

    if (req.method !== "POST") {
        return resposta({
            error: "Método não permitido.",
        }, 405);
    }

    const authorization =
        req.headers.get("Authorization") || "";

    const tokenMatch =
        authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
        return resposta({
            error: "Autenticação obrigatória.",
        }, 401);
    }

    const token = tokenMatch[1];

    const supabaseUrl =
        Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl) {
        console.error("SUPABASE_URL não configurada.");

        return resposta({
            error: "Configuração do servidor incompleta.",
        }, 500);
    }

    let chaveServidor: string;

    try {
        chaveServidor = obterChaveServidor();
    } catch (error) {
        console.error(
            "Erro ao obter chave do servidor:",
            error
        );

        return resposta({
            error: "Configuração segura do servidor indisponível.",
        }, 500);
    }

    const supabaseAdmin = createClient(
        supabaseUrl,
        chaveServidor,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        }
    );

    try {

        /* 1. Validar a identidade de quem solicitou */

        const {
            data: authData,
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authData.user) {
            return resposta({
                error: "Sessão inválida ou expirada.",
            }, 401);
        }

        const usuarioSolicitante = authData.user;

        /* 2. Confirmar que o solicitante é ADM ativo */

        const {
            data: perfilSolicitante,
            error: perfilError,
        } = await supabaseAdmin
            .from("perfis_usuario")
            .select("perfil, ativo")
            .eq("user_id", usuarioSolicitante.id)
            .maybeSingle();

        if (perfilError) {
            console.error(
                "Erro ao verificar perfil do solicitante:",
                perfilError
            );

            return resposta({
                error: "Não foi possível validar suas permissões.",
            }, 500);
        }

        if (
            !perfilSolicitante ||
            perfilSolicitante.ativo !== true ||
            String(perfilSolicitante.perfil)
                .trim()
                .toLowerCase() !== "adm"
        ) {
            return resposta({
                error: "Somente um ADM ativo pode criar acessos.",
            }, 403);
        }

        /* 3. Validar os dados recebidos */

        let body: Record<string, unknown>;

        try {
            const recebido: unknown = await req.json();

            if (
                typeof recebido !== "object" ||
                recebido === null ||
                Array.isArray(recebido)
            ) {
                throw new Error("JSON inválido.");
            }

            body = recebido as Record<string, unknown>;

        } catch {
            return resposta({
                error: "O corpo da solicitação é inválido.",
            }, 400);
        }

        const nome =
            typeof body.nome === "string"
                ? body.nome.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const perfil =
            typeof body.perfil === "string"
                ? body.perfil.trim().toLowerCase()
                : "";

        const cargo =
            typeof body.cargo === "string"
                ? body.cargo.trim()
                : "";

        if (nome.length < 2 || nome.length > 120) {
            return resposta({
                error: "Informe um nome entre 2 e 120 caracteres.",
            }, 400);
        }

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return resposta({
                error: "Informe um e-mail válido.",
            }, 400);
        }

        if (!["comprador", "adm"].includes(perfil)) {
            return resposta({
                error: "O tipo de acesso deve ser comprador ou adm.",
            }, 400);
        }

        if (cargo.length > 100) {
            return resposta({
                error: "O cargo não pode ultrapassar 100 caracteres.",
            }, 400);
        }

        /* 4. Verificar se já existe cadastro de comprador */

        const {
            data: compradoresEncontrados,
            error: buscaCompradorError,
        } = await supabaseAdmin
            .from("compradores")
            .select(
                "id, nome, email, cargo, ativo, auth_user_id"
            )
            .ilike("email", email)
            .limit(1000);

        if (buscaCompradorError) {
            console.error(
                "Erro ao consultar comprador existente:",
                buscaCompradorError
            );

            return resposta({
                error: "Não foi possível verificar os cadastros existentes.",
            }, 500);
        }

        const correspondencias =
            (compradoresEncontrados || []).filter(
                comprador =>
                    String(comprador.email || "")
                        .trim()
                        .toLowerCase() === email
            );

        if (correspondencias.length > 1) {
            return resposta({
                error:
                    "Existem vários cadastros para esse e-mail. " +
                    "Corrija-os antes de criar o acesso.",
            }, 409);
        }

        const compradorExistente =
            correspondencias[0] || null;

        if (perfil === "adm" && compradorExistente) {
            return resposta({
                error:
                    "Esse e-mail já consta no cadastro de compradores. " +
                    "Use outro e-mail ou revise o cadastro existente.",
            }, 409);
        }

        if (
            perfil === "comprador" &&
            compradorExistente?.auth_user_id
        ) {
            return resposta({
                error:
                    "Esse comprador já está vinculado a uma conta. " +
                    "Não foi criado outro acesso.",
            }, 409);
        }

        if (
            perfil === "comprador" &&
            compradorExistente &&
            compradorExistente.ativo !== true
        ) {
            return resposta({
                error:
                    "O cadastro desse comprador está inativo. " +
                    "Revise a situação antes de criar o acesso.",
            }, 409);
        }

        /*
         * Se já existe um comprador sem vínculo de autenticação,
         * preservamos seu registro e suas responsabilidades.
         */

        const nomeFinal =
            compradorExistente?.nome?.trim() || nome;

        /* 5. Enviar convite e criar a conta de autenticação */

        const {
            data: conviteData,
            error: conviteError,
        } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                redirectTo: URL_CONVITE,
                data: {
                    nome: nomeFinal,
                },
            }
        );

        if (conviteError) {
            console.error(
                "Erro no envio do convite:",
                conviteError
            );

            const mensagem =
                conviteError.message.toLowerCase();

            const duplicado =
                mensagem.includes("already registered") ||
                mensagem.includes("already exists") ||
                mensagem.includes("user already") ||
                mensagem.includes("email_exists");

            if (duplicado) {
                return resposta({
                    error:
                        "Esse e-mail já possui uma conta no Supabase Auth. " +
                        "Verifique o cadastro existente antes de continuar.",
                }, 409);
            }

            return resposta({
                error:
                    "Não foi possível concluir o convite. " +
                    "Confira os registros em Authentication → Users " +
                    "antes de tentar novamente.",
            }, 502);
        }

        const novoUsuario = conviteData.user;

        if (!novoUsuario?.id) {
            return resposta({
                error:
                    "O Supabase não retornou a identificação da conta criada.",
            }, 502);
        }

        /*
         * A conta Auth já foi criada.
         * Agora registramos o perfil e, se necessário, o comprador.
         */

        let novoCompradorId: string | null = null;

        try {

            /* 6. Criar o perfil de acesso */

            const {
                error: inserirPerfilError,
            } = await supabaseAdmin
                .from("perfis_usuario")
                .insert({
                    user_id: novoUsuario.id,
                    nome: nomeFinal,
                    perfil,
                    ativo: true,
                });

            if (inserirPerfilError) {
                throw inserirPerfilError;
            }

            /* 7. Vincular ou criar cadastro de comprador */

            if (perfil === "comprador") {

                if (compradorExistente) {

                    const {
                        data: compradorVinculado,
                        error: vinculoError,
                    } = await supabaseAdmin
                        .from("compradores")
                        .update({
                            auth_user_id: novoUsuario.id,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", compradorExistente.id)
                        .is("auth_user_id", null)
                        .select("id")
                        .maybeSingle();

                    if (vinculoError) {
                        throw vinculoError;
                    }

                    if (!compradorVinculado) {
                        throw new Error(
                            "O cadastro foi alterado durante a operação."
                        );
                    }

                    novoCompradorId =
                        compradorVinculado.id;

                } else {

                    const {
                        data: compradorCriado,
                        error: criarCompradorError,
                    } = await supabaseAdmin
                        .from("compradores")
                        .insert({
                            nome: nomeFinal,
                            email,
                            cargo: cargo || "Comprador",
                            ativo: true,
                            auth_user_id: novoUsuario.id,
                        })
                        .select("id")
                        .single();

                    if (criarCompradorError) {
                        throw criarCompradorError;
                    }

                    novoCompradorId =
                        compradorCriado.id;
                }
            }

        } catch (erroProvisionamento) {

            console.error(
                "Erro ao registrar o perfil ou comprador:",
                erroProvisionamento
            );

            /*
             * Reverter o que foi criado, preservando registros antigos.
             * Como auth_user_id usa ON DELETE CASCADE, confirmamos
             * que um cadastro antigo não ficará vinculado ao usuário
             * antes de excluir a conta de autenticação.
             */

            let reversaoSegura = true;

            if (
                perfil === "comprador" &&
                compradorExistente
            ) {

                const {
                    data: vinculoEncontrado,
                    error: verificarVinculoError,
                } = await supabaseAdmin
                    .from("compradores")
                    .select("id")
                    .eq("id", compradorExistente.id)
                    .eq("auth_user_id", novoUsuario.id)
                    .maybeSingle();

                if (verificarVinculoError) {

                    reversaoSegura = false;

                } else if (vinculoEncontrado) {

                    const {
                        data: desvinculado,
                        error: desvincularError,
                    } = await supabaseAdmin
                        .from("compradores")
                        .update({
                            auth_user_id: null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", compradorExistente.id)
                        .eq("auth_user_id", novoUsuario.id)
                        .select("id")
                        .maybeSingle();

                    if (desvincularError || !desvinculado) {
                        reversaoSegura = false;
                    }
                }
            }

            if (reversaoSegura) {

                if (novoCompradorId) {
                    const {
                        error: excluirCompradorError,
                    } = await supabaseAdmin
                        .from("compradores")
                        .delete()
                        .eq("id", novoCompradorId);

                    if (excluirCompradorError) {
                        console.error(
                            "Erro ao reverter novo comprador:",
                            excluirCompradorError
                        );
                    }
                }

                const {
                    error: excluirPerfilError,
                } = await supabaseAdmin
                    .from("perfis_usuario")
                    .delete()
                    .eq("user_id", novoUsuario.id);

                if (excluirPerfilError) {
                    console.error(
                        "Erro ao reverter perfil:",
                        excluirPerfilError
                    );
                }

                const {
                    error: excluirUsuarioError,
                } = await supabaseAdmin.auth.admin.deleteUser(
                    novoUsuario.id
                );

                if (excluirUsuarioError) {
                    console.error(
                        "Erro ao reverter conta Auth:",
                        excluirUsuarioError
                    );
                }

            } else {
                console.error(
                    "A reversão automática foi interrompida " +
                    "para preservar o cadastro de comprador."
                );
            }

            return resposta({
                error:
                    "Não foi possível concluir o cadastro. " +
                    "Consulte os logs da função antes de tentar novamente.",
            }, 500);
        }

        /* 8. Confirmar a operação */

        return resposta({
            success: true,
            message: "Convite enviado para o e-mail informado.",
            perfil,
            email,
            compradorId: novoCompradorId,
        }, 201);

    } catch (error) {

        console.error(
            "Erro inesperado na função criar-acesso:",
            error
        );

        return resposta({
            error: "Ocorreu um erro interno ao processar o cadastro.",
        }, 500);
    }
});