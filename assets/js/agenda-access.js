/* =====================================================
   AGENDA COMPRADOR
   Identificação do usuário e modo de visualização
===================================================== */

(() => {
    "use strict";

// Descobrir a raiz do projeto pela localização deste próprio script.
const accessScriptUrl = document.currentScript?.src;

const APP_ROOT_URL = accessScriptUrl
    ? new URL("../../", accessScriptUrl)
    : new URL("./", window.location.href);

const LOGIN_URL = new URL(
    "login.html",
    APP_ROOT_URL
).href;

const ADM_URL = new URL(
    "adm.html",
    APP_ROOT_URL
).href;

    let currentAccess = null;

    function redirectTo(url) {
        window.location.replace(url);
    }

    function showAccessError(message) {
        const render = () => {
            document.querySelector(".app")?.style.setProperty(
                "display",
                "none",
                "important"
            );

            let panel = document.getElementById(
                "agendaAccessError"
            );

            if (!panel) {
                panel = document.createElement("main");

                panel.id = "agendaAccessError";
                panel.style.cssText = [
                    "max-width:600px",
                    "margin:60px auto",
                    "padding:28px",
                    "font-family:Arial,sans-serif",
                    "color:#342820",
                    "background:#fff",
                    "border:1px solid #ddd3c7",
                    "border-radius:12px",
                    "line-height:1.6"
                ].join(";");

                document.body.appendChild(panel);
            }

            panel.replaceChildren();

            const title = document.createElement("h2");
            title.textContent = "Não foi possível abrir a agenda";

            const description = document.createElement("p");
            description.textContent = message;

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Voltar";

            button.style.cssText = [
                "padding:10px 16px",
                "border:0",
                "border-radius:7px",
                "background:#735543",
                "color:white",
                "cursor:pointer"
            ].join(";");

button.addEventListener("click", () => {
    redirectTo(LOGIN_URL);
});

            panel.append(title, description, button);
        };

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                render,
                { once: true }
            );
        } else {
            render();
        }
    }

    function showBuyerIdentity(access) {
        const name = access.compradorNome || "Comprador";

        const nameElement = document.querySelector(
            ".user-info strong"
        );

        const roleElement = document.querySelector(
            ".user-info span"
        );

        const avatarElement = document.querySelector(
            ".user-avatar"
        );

        if (nameElement) {
            nameElement.textContent = name;
        }

        if (roleElement) {
            // A página continua apresentando o ambiente normal
            // do comprador, sem uma faixa ou aviso administrativo.
            roleElement.textContent = "Comprador";
        }

        if (avatarElement) {
            avatarElement.textContent =
                name.trim().charAt(0).toUpperCase() || "C";
        }
    }

    function applyReadOnlyMode(access) {
        if (!access.readOnly) return;

        // Impedir criação de novos agendamentos pela interface.
        const newButton = document.getElementById(
            "newAppointmentButton"
        );

        if (newButton) {
            newButton.hidden = true;
            newButton.disabled = true;
        }

        const appointmentModal = document.getElementById(
            "appointmentModal"
        );

        if (appointmentModal) {
            appointmentModal.style.display = "none";
        }

document.querySelectorAll(
    ".sidebar-navigation a"
).forEach(link => {

    // Garantir que os itens do menu voltem a ficar visíveis.
    link.style.display = "";

    const href = link.getAttribute("href") || "";

    // Preservar links internos da própria página.
    if (!href || href.startsWith("#")) {
        return;
    }

            try {
                const targetUrl = new URL(
                    href,
                    window.location.href
                );

                // Não alterar links externos.
                if (
                    targetUrl.origin !== window.location.origin
                ) {
                    return;
                }

                // Aplicar o comprador selecionado às páginas HTML.
                if (/\.html$/i.test(targetUrl.pathname)) {
                    targetUrl.searchParams.set(
                        "comprador",
                        access.compradorId
                    );

                    link.href = targetUrl.toString();
                }

                // Não ocultar os demais itens do menu.
                link.style.display = "";

            } catch (error) {
                console.error(
                    "Erro ao preparar navegação administrativa:",
                    error
                );
            }
        });

        // O link do rodapé retorna ao painel ADM.
        const returnLink = document.querySelector(
            ".logout-button"
        );

        if (returnLink) {
            returnLink.setAttribute("href", ADM_URL);

            const icon = returnLink.querySelector(
                ".nav-icon"
            );

            const label = returnLink.querySelector(
                "span:last-child"
            );

            if (icon) icon.textContent = "↶";

            if (label) {
                label.textContent = "Voltar ao painel ADM";
            }
        }

        // Bloqueio adicional na interface: mesmo que algum
        // botão seja recriado dinamicamente, as ações de escrita
        // não serão processadas neste modo.
        document.addEventListener("click", event => {
            if (!(event.target instanceof Element)) return;

            const forbiddenControl = event.target.closest(
                [
                    "#newAppointmentButton",
                    "#saveAppointmentButton",
                    "#cancelAppointmentButton",
                    "[data-agenda-action]",
                    "#appointmentForm button[type='submit']"
                ].join(",")
            );

            if (forbiddenControl) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);

        document.addEventListener("submit", event => {
            if (
                event.target instanceof HTMLFormElement &&
                event.target.id === "appointmentForm"
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);

        // Impede que a função pública de abertura do formulário
        // seja usada acidentalmente em modo somente leitura.
        if (
            typeof window.abrirNovoAgendamento === "function"
        ) {
            window.abrirNovoAgendamento = () => undefined;
        }
    }

    async function initializeAgendaAccess() {
        if (typeof supabaseClient === "undefined") {
            showAccessError(
                "A conexão com o Supabase não foi inicializada."
            );

            return { allowed: false };
        }

        /* 1. Confirmar a sessão autenticada */

const {
    data: authData,
    error: authError
} = await supabaseClient.auth.getUser();

if (authError) {
    console.error(
        "Erro ao verificar a sessão:",
        authError
    );

    redirectTo(LOGIN_URL);

    return { allowed: false };
}

const user = authData?.user;

        if (!user) {
            redirectTo(LOGIN_URL);

            return { allowed: false };
        }

        /* 2. Consultar o perfil autenticado */

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("perfis_usuario")
            .select("nome, perfil, ativo")
            .eq("user_id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "Erro ao consultar perfil:",
                profileError
            );

            showAccessError(
                "Não foi possível validar seu perfil no Supabase."
            );

            return { allowed: false };
        }

        if (!profile || profile.ativo !== true) {
            await supabaseClient.auth.signOut();

            redirectTo(LOGIN_URL);

            return { allowed: false };
        }

        const role = String(profile.perfil || "")
            .trim()
            .toLowerCase();

        if (!["adm", "comprador"].includes(role)) {
            await supabaseClient.auth.signOut();

            redirectTo(LOGIN_URL);

            return { allowed: false };
        }

        /* 3. Ler o comprador solicitado pela URL */

        const params = new URLSearchParams(
            window.location.search
        );

        const requestedBuyerId = params.get("comprador");

        /* 4. ADM: consultar o comprador selecionado */

        if (role === "adm") {
            if (
                !requestedBuyerId ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                    .test(requestedBuyerId)
            ) {
                redirectTo(ADM_URL);

                return { allowed: false };
            }

            const {
                data: buyer,
                error: buyerError
            } = await supabaseClient
                .from("compradores")
                .select("id, nome, email, ativo")
                .eq("id", requestedBuyerId)
                .maybeSingle();

            if (buyerError) {
                console.error(
                    "Erro ao consultar o comprador:",
                    buyerError
                );

                showAccessError(
                    "Não foi possível consultar o comprador selecionado."
                );

                return { allowed: false };
            }

            if (!buyer) {
                redirectTo(ADM_URL);

                return { allowed: false };
            }

            return {
                allowed: true,
                role: "adm",
                readOnly: true,
                userId: user.id,
                compradorId: buyer.id,
                compradorNome: buyer.nome,
                compradorEmail: buyer.email
            };
        }

        /* 5. COMPRADOR: localizar o próprio cadastro */

        const {
            data: buyer,
            error: buyerError
        } = await supabaseClient
            .from("compradores")
            .select("id, nome, email, ativo")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (buyerError) {
            console.error(
                "Erro ao consultar o vínculo do comprador:",
                buyerError
            );

            showAccessError(
                "Não foi possível consultar seu cadastro de comprador."
            );

            return { allowed: false };
        }

        if (!buyer || buyer.ativo !== true) {
            showAccessError(
                "Sua conta ainda não está vinculada a um cadastro " +
                "ativo de comprador no sistema."
            );

            return { allowed: false };
        }

        // Um comprador não pode trocar de agenda alterando a URL.
        // Caso o parâmetro tenha sido informado, removemos o acesso
        // solicitado e mantemos o comprador autenticado.
        if (requestedBuyerId) {
            const cleanUrl = new URL(window.location.href);

            cleanUrl.searchParams.delete("comprador");

            window.history.replaceState(
                {},
                "",
                cleanUrl.pathname +
                cleanUrl.search +
                cleanUrl.hash
            );
        }

        return {
            allowed: true,
            role: "comprador",
            readOnly: false,
            userId: user.id,
            compradorId: buyer.id,
            compradorNome: buyer.nome,
            compradorEmail: buyer.email
        };
    }

    const ready = initializeAgendaAccess()
        .then(access => {
            currentAccess = access;

            if (!access?.allowed) return access;

const apply = () => {
    showBuyerIdentity(access);

    applyReadOnlyMode(access);

    // Exibir a página somente após validar a autenticação.
    const app = document.querySelector(".app");

    if (app) {
        app.style.visibility = "visible";
    }
};

            if (document.readyState === "loading") {
                document.addEventListener(
                    "DOMContentLoaded",
                    apply,
                    { once: true }
                );
            } else {
                apply();
            }

            return access;
        })
        .catch(error => {
            console.error(
                "Erro na inicialização do acesso à agenda:",
                error
            );

            showAccessError(
                "Ocorreu um erro ao validar o acesso à agenda."
            );

            return { allowed: false };
        });

    // Disponibiliza o contexto para agenda.js e os demais módulos.
    window.AgendaAccess = { ready };

    // Intercepta o link de retorno antes dos manipuladores comuns
    // do menu, sem encerrar a sessão do ADM.
    document.addEventListener("click", event => {
        if (!currentAccess?.readOnly) return;
        if (!(event.target instanceof Element)) return;

        const returnLink = event.target.closest(
            ".logout-button"
        );

        if (!returnLink) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        redirectTo(ADM_URL);
    }, true);

})();