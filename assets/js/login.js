/* =========================================
   LOGIN — AGENDA COMPRADOR
========================================= */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

const loginButton = loginForm?.querySelector(
    'button[type="submit"]'
);


/* =========================================
   DESTINOS APÓS O LOGIN

   ADM: página administrativa que criaremos.
   Comprador: página principal existente.
========================================= */

const ROTAS_PERFIL = {
    adm: "./adm.html",
    comprador: "./index.html"
};


/* =========================================
   MENSAGENS
========================================= */

function mostrarMensagem(mensagem) {
    if (loginMessage) {
        loginMessage.textContent = mensagem;
    }
}


/* =========================================
   MOSTRAR / OCULTAR SENHA
========================================= */

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const senhaVisivel = passwordInput.type === "text";

        passwordInput.type = senhaVisivel
            ? "password"
            : "text";

        togglePassword.textContent = senhaVisivel
            ? "Mostrar"
            : "Ocultar";
    });
}


/* =========================================
   AUTENTICAÇÃO
========================================= */

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        mostrarMensagem("");

        // O supabase.js precisa ter sido carregado antes.
        if (typeof supabaseClient === "undefined") {
            mostrarMensagem(
                "Não foi possível conectar ao serviço de autenticação."
            );

            console.error(
                "Cliente Supabase não encontrado."
            );

            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        let autenticado = false;

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Entrando...";
        }

        try {
            /* 1. Validar e-mail e senha */

            const {
                data: authData,
                error: authError
            } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw new Error("CREDENCIAIS_INVALIDAS");
            }

            autenticado = true;

            /* 2. Consultar o perfil do usuário */

            const {
                data: perfil,
                error: perfilError
            } = await supabaseClient
                .from("perfis_usuario")
                .select("perfil, ativo, nome")
                .eq("user_id", authData.user.id)
                .maybeSingle();

            if (perfilError) {
                console.error(
                    "Erro ao consultar perfil:",
                    perfilError
                );

                throw new Error("ERRO_AO_CONSULTAR_PERFIL");
            }

            /* 3. Verificar se possui perfil ativo */

            if (!perfil || perfil.ativo !== true) {
                throw new Error("PERFIL_NAO_AUTORIZADO");
            }

            const tipoPerfil = String(perfil.perfil)
                .trim()
                .toLowerCase();

            /* 4. Direcionar conforme o perfil */

            const destino = ROTAS_PERFIL[tipoPerfil];

            if (!destino) {
                throw new Error("PERFIL_INVALIDO");
            }

            window.location.replace(destino);

        } catch (error) {
            console.error("Falha no login:", error);

            // Encerra a sessão se a autenticação ocorreu,
            // mas o perfil não foi autorizado.
            if (autenticado) {
                const { error: signOutError } =
                    await supabaseClient.auth.signOut();

                if (signOutError) {
                    console.error(
                        "Não foi possível encerrar a sessão:",
                        signOutError
                    );
                }
            }

            const mensagens = {
                CREDENCIAIS_INVALIDAS:
                    "E-mail ou senha inválidos.",

                ERRO_AO_CONSULTAR_PERFIL:
                    "Não foi possível verificar seu perfil. Tente novamente.",

                PERFIL_NAO_AUTORIZADO:
                    "Seu usuário não possui um perfil ativo. Procure o administrador.",

                PERFIL_INVALIDO:
                    "Seu perfil não possui um destino autorizado."
            };

            mostrarMensagem(
                mensagens[error.message] ||
                "Não foi possível realizar o login."
            );

        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Entrar";
            }
        }
    });
}