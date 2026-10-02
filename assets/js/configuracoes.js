/* =========================================================
   CONFIGURAÇÕES
   AGENDA COMPRADOR
========================================================= */


/* =========================================================
   ELEMENTOS
========================================================= */

const saveSettings =
    document.getElementById("saveSettings");

const photoButton =
    document.getElementById("photoButton");

const photoInput =
    document.getElementById("photoInput");

const profileAvatar =
    document.getElementById("profileAvatar");

const buyerName =
    document.getElementById("buyerName");


/* =========================================================
   CARREGAR CONFIGURAÇÕES
========================================================= */

function loadSettings() {

    const savedData =
        localStorage.getItem(
            "agendaComprador_configuracoes"
        );

    if (!savedData) {
        return;
    }

    try {

        const data =
            JSON.parse(savedData);


        /* =================================================
           NOME
        ================================================= */

        if (
            data.name &&
            buyerName
        ) {

            buyerName.value =
                data.name;

        }


        /* =================================================
           GRUPOS
        ================================================= */

        if (
            Array.isArray(
                data.groups
            )
        ) {

            document
                .querySelectorAll(
                    'input[name="groups"]'
                )
                .forEach(input => {

                    input.checked =
                        data.groups.includes(
                            input.value
                        );

                });

        }


        /* =================================================
           CLASSIFICAÇÕES
        ================================================= */

        if (
            Array.isArray(
                data.classifications
            )
        ) {

            document
                .querySelectorAll(
                    'input[name="classifications"]'
                )
                .forEach(input => {

                    input.checked =
                        data.classifications.includes(
                            input.value
                        );

                });

        }


        /* =================================================
           FOTO
        ================================================= */

        if (data.photo) {

            profileAvatar.style.backgroundImage =
                `url("${data.photo}")`;

            profileAvatar.textContent = "";

        }

    } catch (error) {

        console.error(
            "Erro ao carregar configurações:",
            error
        );

    }

}


/* =========================================================
   SALVAR CONFIGURAÇÕES
========================================================= */

if (saveSettings) {

    saveSettings.addEventListener(
        "click",
        () => {


            const groups = [];

            const classifications = [];


            /* =================================================
               PEGAR GRUPOS SELECIONADOS
            ================================================= */

            document
                .querySelectorAll(
                    'input[name="groups"]:checked'
                )
                .forEach(input => {

                    groups.push(
                        input.value
                    );

                });


            /* =================================================
               PEGAR CLASSIFICAÇÕES SELECIONADAS
            ================================================= */

            document
                .querySelectorAll(
                    'input[name="classifications"]:checked'
                )
                .forEach(input => {

                    classifications.push(
                        input.value
                    );

                });


            /* =================================================
               PEGAR NOME
            ================================================= */

            const name =
                buyerName
                    ? buyerName.value.trim()
                    : "";


            /* =================================================
               RECUPERAR FOTO ATUAL
            ================================================= */

            const currentPhoto =
                localStorage.getItem(
                    "agendaComprador_foto"
                );


            /* =================================================
               MONTAR DADOS
            ================================================= */

            const data = {

                name,

                groups,

                classifications,

                photo:
                    currentPhoto || null

            };


            /* =================================================
               SALVAR
            ================================================= */

            localStorage.setItem(

                "agendaComprador_configuracoes",

                JSON.stringify(data)

            );


            alert(
                "Configurações salvas com sucesso."
            );

        }
    );

}


/* =========================================================
   ALTERAR FOTO
========================================================= */

if (
    photoButton &&
    photoInput
) {


    photoButton.addEventListener(
        "click",
        () => {

            photoInput.click();

        }
    );


    photoInput.addEventListener(
        "change",
        () => {


            const file =
                photoInput.files[0];


            if (!file) {
                return;
            }


            /* =================================================
               VALIDAR IMAGEM
            ================================================= */

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Selecione uma imagem válida."
                );

                return;

            }


            /* =================================================
               LER IMAGEM
            ================================================= */

            const reader =
                new FileReader();


            reader.onload =
                event => {


                    const image =
                        event.target.result;


                    profileAvatar.style.backgroundImage =
                        `url("${image}")`;

                    profileAvatar.textContent =
                        "";


                    localStorage.setItem(
                        "agendaComprador_foto",
                        image
                    );

                };


            reader.readAsDataURL(file);

        }
    );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

loadSettings();