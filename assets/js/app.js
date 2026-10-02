/* =========================================================
   AGENDA COMPRADOR
   MENU PRINCIPAL
========================================================= */


const menuToggle =
    document.getElementById("menuToggle");


const sidebar =
    document.getElementById("sidebar");


const sidebarOverlay =
    document.getElementById("sidebarOverlay");


/* =========================================================
   ABRIR / FECHAR MENU
========================================================= */

if (
    menuToggle &&
    sidebar &&
    sidebarOverlay
) {

    menuToggle.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle("open");

            sidebarOverlay.classList.toggle("show");

        }
    );


    sidebarOverlay.addEventListener(
        "click",
        () => {

            sidebar.classList.remove("open");

            sidebarOverlay.classList.remove("show");

        }
    );

}