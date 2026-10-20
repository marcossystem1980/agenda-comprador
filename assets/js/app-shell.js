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