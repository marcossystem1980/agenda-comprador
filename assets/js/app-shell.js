/* =========================================================
   AGENDA COMPRADOR — ESTRUTURA COMPARTILHADA
   Menu lateral e navegação mobile
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    if (!menuToggle || !sidebar || !sidebarOverlay) {
        return;
    }

    function openMenu() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");

        menuToggle.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");

        menuToggle.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
        const isOpen = sidebar.classList.contains("open");

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    menuToggle.setAttribute("aria-expanded", "false");

    menuToggle.addEventListener("click", toggleMenu);
    sidebarOverlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    // Fecha o menu depois de selecionar uma opção no celular.
    sidebar.querySelectorAll("a.nav-item").forEach(link => {
        link.addEventListener("click", closeMenu);
    });
});


/* =========================================================
   AGENDA COMPRADOR — ENCERRAR SESSÃO
========================================================= */

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".logout-button");

    // Ignora cliques que não sejam no botão Sair.
    if (!button) return;

    event.preventDefault();

    // Evita executar o logout várias vezes.
    if (button.dataset.logoutInProgress === "true") {
        return;
    }

    const originalContent = button.innerHTML;

    button.dataset.logoutInProgress = "true";
    button.disabled = true;

    const label = button.querySelector("span:last-child");

    if (label) {
        label.textContent = "Saindo...";
    }

    try {
        // Utiliza o cliente Supabase já inicializado pelo projeto.
        const client =
            typeof supabaseClient !== "undefined"
                ? supabaseClient
                : window.supabaseClient;

        if (!client?.auth) {
            throw new Error(
                "Cliente de autenticação do Supabase não encontrado."
            );
        }

        // Encerra a sessão somente neste navegador.
        const { error } = await client.auth.signOut({
            scope: "local"
        });

        if (error) {
            throw error;
        }

        // Redireciona para a página de login.
        window.location.replace("/login.html");

    } catch (error) {
        console.error("Erro ao sair da Agenda Comprador:", error);

        button.disabled = false;
        button.innerHTML = originalContent;

        delete button.dataset.logoutInProgress;

        alert(
            "Não foi possível encerrar a sessão. " +
            "Verifique sua conexão e tente novamente."
        );
    }
});
