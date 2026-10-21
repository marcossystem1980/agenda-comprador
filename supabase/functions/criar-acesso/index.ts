import { withSupabase } from "jsr:@supabase/server@^1";

const URL_CONVITE =
    "https://agenda-comprador.vercel.app/definir-senha.html";

type PerfilAcesso = "comprador" | "adm";

type CompradorExistente = {
    id: string;
    nome: string;
    email: string | null;
    cargo: string | null;
    ativo: boolean;
    auth_user_id: string | null;
};

function responder(
    dados: Record<string, unknown>,
    status = 200
): Response {
    return Response.json(dados, { status });
}

function texto(
    valor: unknown,
    limite: number
): string {
    return typeof valor === "string"
        ? valor.trim().slice(0, limite)
        : "";
}

export default {
    fetch: withSupabase(
        { auth: "user" },
        async (req, ctx) => {
            if (req.method !== "POST") {
                return responder(
                    { success: false, error: "Método não permitido." },
                    405
                );
            }

            /* =========================================
               1. VALIDAR SESSÃO E PERFIL ADM
            ========================================= */

            const userId = ctx.userClaims?.id;

            if (!userId) {
                return responder(
                    { success: false, error: "Sessão não identificada." },
                    401
                );
            }

            const {
                data: perfilSolicitante,
                error: erroPerfil
            } = await ctx.supabase
                .from("perfis_usuario")
                .select("perfil, ativo")
                .eq("user_id", userId)
                .maybeSingle();

            if (erroPerfil) {
                console.error(
                    "Erro ao verificar perfil do solicitante:",
                    erroPerfil
                );

                return responder(
                    {
                        success: false,
                        error: "Não foi possível verificar suas permissões."
                    },
                    500
                );
            }

            if (
                !perfilSolicitante ||
                perfilSolicitante.ativo !== true ||
                String(perfilSolicitante.perfil)
                    .trim()
                    .toLowerCase() !== "adm"
            ) {
                return responder(
                    {
                        success: false,
                        error: "Somente um ADM ativo pode criar acessos."
                    },
                    403
                );
            }

            /* =========================================
               2. VALIDAR DADOS DO FORMULÁRIO
            ========================================= */

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
                return responder(
                    {
                        success: false,
                        error: "Os dados enviados são inválidos."
                    },
                    400
                );
            }

            const nome = texto(body.nome, 120);
            const email = texto(body.email, 254).toLowerCase();
            const perfil = texto(body.perfil, 20).toLowerCase();
            const cargo = texto(body.cargo, 100);

            if (nome.length < 2) {
                return responder(
                    {
                        success: false,
                        error: "Informe um nome com pelo menos 2 caracteres."
                    },
                    400
                );
            }

            if (
                !email ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                return responder(
                    {
                        success: false,
                        error: "Informe um e-mail válido."
                    },
                    400
                );
            }

            if (perfil !== "comprador" && perfil !== "adm") {
                return responder(
                    {
                        success: false,
                        error: "O perfil deve ser comprador ou adm."
                    },
                    400
                );
            }

            /* =========================================
               3. VERIFICAR COMPRADOR EXISTENTE
            ========================================= */

            const {
                data: encontrados,
                error: erroBusca
            } = await ctx.supabaseAdmin
                .from("compradores")
                .select(
                    "id, nome, email, cargo, ativo, auth_user_id"
                )
                .ilike("email", email)
                .limit(1000);

            if (erroBusca) {
                console.error(
                    "Erro ao pesquisar compradores:",
                    erroBusca
                );

                return responder(
                    {
                        success: false,
                        error: "Não foi possível verificar os cadastros existentes."
                    },
                    500
                );
            }

            const correspondencias = (
                (encontrados || []) as CompradorExistente[]
            ).filter(
                comprador =>
                    (comprador.email || "")
                        .trim()
                        .toLowerCase() === email
            );

            if (correspondencias.length > 1) {
                return responder(
                    {
                        success: false,
                        error:
                            "Há mais de um comprador com esse e-mail. " +
                            "Revise os cadastros antes de continuar."
                    },
                    409
                );
            }

            const compradorExistente =
                correspondencias[0] || null;

            if (perfil === "adm" && compradorExistente) {
                return responder(
                    {
                        success: false,
                        error:
                            "Esse e-mail já consta no cadastro de compradores. " +
                            "Use outro e-mail para criar o ADM."
                    },
                    409
                );
            }

            if (
                perfil === "comprador" &&
                compradorExistente?.auth_user_id
            ) {
                return responder(
                    {
                        success: false,
                        error:
                            "Esse comprador já está vinculado a uma conta."
                    },
                    409
                );
            }

            if (
                perfil === "comprador" &&
                compradorExistente &&
                compradorExistente.ativo !== true
            ) {
                return responder(
                    {
                        success: false,
                        error:
                            "O cadastro desse comprador está inativo. " +
                            "Revise-o antes de criar o acesso."
                    },
                    409
                );
            }

            const nomeFinal =
                compradorExistente?.nome?.trim() || nome;

            /* =========================================
               4. CRIAR CONTA E ENVIAR CONVITE
            ========================================= */

            const {
                data: convite,
                error: erroConvite
            } = await ctx.supabaseAdmin.auth.admin
                .inviteUserByEmail(email, {
                    redirectTo: URL_CONVITE,
                    data: {
                        nome: nomeFinal
                    }
                });

            if (erroConvite) {
                console.error(
                    "Erro ao enviar convite:",
                    erroConvite
                );

                const mensagem =
                    erroConvite.message.toLowerCase();

                const duplicado =
                    mensagem.includes("already registered") ||
                    mensagem.includes("already exists") ||
                    mensagem.includes("already been registered") ||
                    mensagem.includes("email_exists");

                return responder(
                    {
                        success: false,
                        error: duplicado
                            ? "Esse e-mail já possui uma conta no sistema de autenticação. Verifique o cadastro existente antes de tentar novamente."
                            : "Não foi possível enviar o convite. Confira os logs da função antes de tentar novamente."
                    },
                    duplicado ? 409 : 502
                );
            }

            const novoUsuario = convite.user;

            if (!novoUsuario?.id) {
                console.error(
                    "Convite sem identificação de usuário retornada."
                );

                return responder(
                    {
                        success: false,
                        error:
                            "Não foi possível confirmar a criação da conta."
                    },
                    500
                );
            }

            /* =========================================
               5. REGISTRAR PERFIL E CADASTRO

               Guardamos o que foi criado para tentar
               desfazer operações se alguma etapa falhar.
            ========================================= */

            let perfilCriado = false;
            let compradorCriadoId: string | null = null;
            let compradorVinculadoId: string | null = null;

            try {
                const {
                    error: erroInserirPerfil
                } = await ctx.supabaseAdmin
                    .from("perfis_usuario")
                    .insert({
                        user_id: novoUsuario.id,
                        nome: nomeFinal,
                        perfil: perfil as PerfilAcesso,
                        ativo: true
                    });

                if (erroInserirPerfil) {
                    throw erroInserirPerfil;
                }

                perfilCriado = true;

                if (perfil === "comprador") {
                    if (compradorExistente) {
                        const {
                            data: vinculado,
                            error: erroVinculo
                        } = await ctx.supabaseAdmin
                            .from("compradores")
                            .update({
                                auth_user_id: novoUsuario.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", compradorExistente.id)
                            .is("auth_user_id", null)
                            .select("id")
                            .maybeSingle();

                        if (erroVinculo) {
                            throw erroVinculo;
                        }

                        if (!vinculado) {
                            throw new Error(
                                "O cadastro foi alterado durante a operação."
                            );
                        }

                        compradorVinculadoId = vinculado.id;
                    } else {
                        const {
                            data: criado,
                            error: erroCriarComprador
                        } = await ctx.supabaseAdmin
                            .from("compradores")
                            .insert({
                                nome: nomeFinal,
                                email,
                                cargo: cargo || "Comprador",
                                ativo: true,
                                auth_user_id: novoUsuario.id
                            })
                            .select("id")
                            .single();

                        if (erroCriarComprador) {
                            throw erroCriarComprador;
                        }

                        compradorCriadoId = criado.id;
                    }
                }

            } catch (erroProvisionamento) {
                console.error(
                    "Falha ao registrar perfil/cadastro:",
                    erroProvisionamento
                );

                /*
                 * Reverter em ordem segura.
                 * Nunca excluir um comprador antigo.
                 */

                const falhasReversao: string[] = [];

                if (compradorVinculadoId) {
                    const {
                        error
                    } = await ctx.supabaseAdmin
                        .from("compradores")
                        .update({
                            auth_user_id: null,
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", compradorVinculadoId)
                        .eq("auth_user_id", novoUsuario.id);

                    if (error) {
                        falhasReversao.push("desvincular comprador");
                        console.error("Falha ao desvincular:", error);
                    }
                }

                if (compradorCriadoId) {
                    const {
                        error
                    } = await ctx.supabaseAdmin
                        .from("compradores")
                        .delete()
                        .eq("id", compradorCriadoId);

                    if (error) {
                        falhasReversao.push("remover novo comprador");
                        console.error("Falha ao remover comprador:", error);
                    }
                }

                if (perfilCriado) {
                    const {
                        error
                    } = await ctx.supabaseAdmin
                        .from("perfis_usuario")
                        .delete()
                        .eq("user_id", novoUsuario.id);

                    if (error) {
                        falhasReversao.push("remover novo perfil");
                        console.error("Falha ao remover perfil:", error);
                    }
                }

                /*
                 * Só apagar a conta Auth se a reversão dos
                 * registros do banco não tiver apresentado falhas.
                 * Isso evita apagar uma conta que ainda esteja
                 * vinculada a registros que não foram revertidos.
                 */

                if (falhasReversao.length === 0) {
                    const {
                        error
                    } = await ctx.supabaseAdmin.auth.admin
                        .deleteUser(novoUsuario.id);

                    if (error) {
                        falhasReversao.push("remover nova conta Auth");
                        console.error("Falha ao remover conta:", error);
                    }
                }

                return responder(
                    {
                        success: false,
                        error:
                            "A conta foi iniciada, mas não foi possível " +
                            "concluir todos os registros. Verifique os logs " +
                            "antes de repetir a operação.",
                        reversaoConcluida:
                            falhasReversao.length === 0
                    },
                    500
                );
            }

            /* =========================================
               6. SUCESSO
            ========================================= */

            console.info(
                "Acesso criado:",
                {
                    userId: novoUsuario.id,
                    email,
                    perfil
                }
            );

            return responder(
                {
                    success: true,
                    message:
                        "Acesso criado e convite enviado por e-mail.",
                    email,
                    perfil,
                    compradorId:
                        compradorCriadoId || compradorVinculadoId
                },
                201
            );
        }
    )
};