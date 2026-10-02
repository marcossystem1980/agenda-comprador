/* =========================================================
   LOGIN
   Nesta etapa estamos trabalhando somente a interface.
   O Supabase será conectado posteriormente.
========================================================= */


/* =========================================================
   ELEMENTOS
========================================================= */

const loginForm = document.getElementById("loginForm");

const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");

const loginMessage = document.getElementById("loginMessage");


/* =========================================================
   MOSTRAR / OCULTAR SENHA
========================================================= */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener("click", () => {

        const senhaVisivel =
            passwordInput.type === "text";


        if (senhaVisivel) {

            passwordInput.type = "password";

            togglePassword.textContent = "Mostrar";

        } else {

            passwordInput.type = "text";

            togglePassword.textContent = "Ocultar";

        }

    });

}


/* =========================================================
   ENVIO DO FORMULÁRIO
========================================================= */

if (loginForm) {

    loginForm.addEventListener("submit", (event) => {

        event.preventDefault();


        loginMessage.textContent =
            "A autenticação será conectada ao Supabase nesta etapa do projeto.";

    });

}