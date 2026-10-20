/* =========================================
   DEFINIR SENHA — AGENDA COMPRADOR
========================================= */

"use strict";

const passwordForm = document.getElementById("setPasswordForm");

const newPasswordInput = document.getElementById("newPassword");

const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordMessage = document.getElementById("passwordMessage");

const savePasswordButton = document.getElementById("savePasswordButton");


let conviteValidado = false;
let processamentoEmAndamento = false;


/* =========================================
   MENSAGENS
========================================= */

function mostrarMensagemSenha(mensagem) {
    if (passwordMessage) {
        passwordMessage.textContent = mensagem;
    }
}


/* =========================================
   CONTROLE DO FORMULÁRIO
========================================= */

function bloquearFormulario(bloquear) {
    if (newPasswordInput) {
        newPasswordInput.disabled = bloquear;
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.disabled = bloquear;
    }

    if (savePasswordButton) {
        savePasswordButton.disabled = bloquear;
    }
}


/* =========================================
   IDENTIFICAR ERROS DO CONVITE
========================================= */

function verificarErroNaUrl() {
    const parametros = [
        new URLSearchParams(window.location.search),
        new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        )
    ];

    for (const params of parametros) {
        const erro = params.get("error");
        const codigoErro = params.get("error_code");
        const descricao = params.get("error_description");

        if (erro || codigoErro || descricao) {
            return true;
        }
    }

    return false;
}


/* =========================================
   VALIDAR SESSÃO DO CONVITE
========================================= */

async function inicializarDefinicaoSenha() {
    bloquearFormulario(true);

    if (typeof supabaseClient === "undefined") {
        mostrarMensagemSenha(
            "Não foi possível conectar ao serviço de autenticação."
        );

        return;
    }

    if (verificarErroNaUrl()) {
        mostrarMensagemSenha(
            "O link recebido por e-mail pode ter expirado ou ser inválido. " +
            "Solicite ao administrador um novo convite."
        );

        return;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (!data.session || !data.session.user) {
            mostrarMensagemSenha(
                "Não encontramos uma sessão válida. " +
                "Abra o link recebido por e-mail para configurar sua senha."
            );

            return;
        }

        conviteValidado = true;

        bloquearFormulario(false);

        mostrarMensagemSenha(
            "Acesso validado. Cadastre uma senha com pelo menos 8 caracteres."
        );

    } catch (error) {
        console.error(
            "Erro ao validar o convite:",
            error
        );

        mostrarMensagemSenha(
            "Não foi possível validar o acesso. " +
            "Tente abrir novamente o link recebido por e-mail."
        );
    }
}


/* =========================================
   LINK PARA VOLTAR AO LOGIN
========================================= */

function mostrarLinkLogin() {
    const linkExistente = document.getElementById(
        "loginAfterPasswordLink"
    );

    if (linkExistente) {
        return;
    }

    const loginLink = document.createElement("a");

    loginLink.id = "loginAfterPasswordLink";
    loginLink.href = "./login.html";
    loginLink.textContent = "Ir para o login";

    loginLink.style.display = "inline-block";
    loginLink.style.marginTop = "16px";

    passwordForm.appendChild(loginLink);
}


/* =========================================
   SALVAR NOVA SENHA
========================================= */

if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (processamentoEmAndamento) {
            return;
        }

        if (!conviteValidado) {
            mostrarMensagemSenha(
                "Valide seu acesso pelo link recebido por e-mail."
            );

            return;
        }

        const novaSenha = newPasswordInput.value;
        const confirmarSenha = confirmPasswordInput.value;

        if (novaSenha.length < 8) {
            mostrarMensagemSenha(
                "A senha precisa ter pelo menos 8 caracteres."
            );

            return;
        }

        if (novaSenha !== confirmarSenha) {
            mostrarMensagemSenha(
                "As senhas informadas não são iguais."
            );

            return;
        }

        processamentoEmAndamento = true;

        bloquearFormulario(true);

        if (savePasswordButton) {
            savePasswordButton.textContent = "Salvando...";
        }

        try {
            // Confirmar que existe um usuário autenticado.
            const {
                data: userData,
                error: userError
            } = await supabaseClient.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!userData.user) {
                conviteValidado = false;

                throw new Error("SESSAO_INVALIDA");
            }

            // O Supabase valida a sessão e atualiza a senha.
            const {
                error: updateError
            } = await supabaseClient.auth.updateUser({
                password: novaSenha
            });

            if (updateError) {
                throw updateError;
            }

            // O primeiro acesso foi concluído.
            mostrarMensagemSenha(
                "Senha definida com sucesso! " +
                "Agora entre na Agenda Comprador com seu e-mail e a nova senha."
            );

            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            conviteValidado = false;

            if (savePasswordButton) {
                savePasswordButton.hidden = true;
            }

            mostrarLinkLogin();

            // Encerrar somente a sessão local, sem afetar
            // sessões de outros dispositivos.
            const {
                error: signOutError
            } = await supabaseClient.auth.signOut({
                scope: "local"
            });

            if (signOutError) {
                console.error(
                    "Aviso ao encerrar a sessão local:",
                    signOutError
                );
            }

        } catch (error) {
            console.error(
                "Erro ao definir senha:",
                error
            );

            if (error.message === "SESSAO_INVALIDA") {
                mostrarMensagemSenha(
                    "Sua sessão expirou. Solicite um novo convite ao administrador."
                );
            } else {
                mostrarMensagemSenha(
                    "Não foi possível salvar a senha. " +
                    "Verifique o link recebido por e-mail e tente novamente."
                );
            }

            if (savePasswordButton) {
                savePasswordButton.hidden = false;
            }

            bloquearFormulario(!conviteValidado);

        } finally {
            processamentoEmAndamento = false;

            if (savePasswordButton && !savePasswordButton.hidden) {
                savePasswordButton.disabled = !conviteValidado;
                savePasswordButton.textContent = "Salvar senha";
            }
        }
    });
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

inicializarDefinicaoSenha();