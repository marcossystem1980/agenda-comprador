/* =========================================================
   CONFIGURAÇÕES
   AGENDA COMPRADOR
   VERSÃO DE TESTE COM LOCALSTORAGE
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
   NORMALIZAR CÓDIGOS
========================================================= */

function normalizeCode(value) {

    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

}


/* =========================================================
   NORMALIZAR GRUPOS ANTIGOS
========================================================= */

function normalizeGroupCode(value) {

    const code =
        normalizeCode(value);

    const aliases = {
        "ZTT": "ZTT",
        "CELLA": "CELLA",
        "FENIX": "FENIX"
    };

    return aliases[code] || code;

}


/* =========================================================
   MIGRAR CLASSIFICAÇÕES ANTIGAS
========================================================= */

function normalizeClassificationCodes(values) {

    const result = new Set();

    const aliases = {

        "FRALDAS E LEITES": [
            "FRALDAS",
            "LEITES"
        ],

        "GENERICO": [
            "GENERICOS"
        ],

        "SUPLEMENTO": [
            "SUPLEMENTOS"
        ]

    };


    if (!Array.isArray(values)) {
        return [];
    }


    values.forEach(value => {

        const code =
            normalizeCode(value);

        const mapped =
            aliases[code];


        if (mapped) {

            mapped.forEach(item => {
                result.add(item);
            });

        } else {

            result.add(code);

        }

    });


    return [...result];

}


/* =========================================================
   LER CONFIGURAÇÕES SALVAS
========================================================= */

function getSavedSettings() {

    const savedData =
        localStorage.getItem(
            "agendaComprador_configuracoes"
        );


    if (!savedData) {
        return null;
    }


    try {

        return JSON.parse(savedData);

    } catch (error) {

        console.error(
            "Erro ao interpretar configurações salvas:",
            error
        );

        return null;

    }

}


/* =========================================================
   CARREGAR CONFIGURAÇÕES
========================================================= */

function loadSettings() {

    const data =
        getSavedSettings();


    /* =================================================
       NOME
    ================================================= */

    if (
        data &&
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
        data &&
        Array.isArray(data.groups)
    ) {

        const savedGroups =
            new Set(
                data.groups.map(
                    normalizeGroupCode
                )
            );


        document
            .querySelectorAll(
                'input[name="groups"]'
            )
            .forEach(input => {

                input.checked =
                    savedGroups.has(
                        normalizeGroupCode(
                            input.value
                        )
                    );

            });

    }


    /* =================================================
       CLASSIFICAÇÕES
    ================================================= */

    if (
        data &&
        Array.isArray(data.classifications)
    ) {

        const savedClassifications =
            new Set(
                normalizeClassificationCodes(
                    data.classifications
                )
            );


        document
            .querySelectorAll(
                'input[name="classifications"]'
            )
            .forEach(input => {

                input.checked =
                    savedClassifications.has(
                        normalizeCode(
                            input.value
                        )
                    );

            });

    }


    /* =================================================
       FOTO
    ================================================= */

    const savedPhoto =
        localStorage.getItem(
            "agendaComprador_foto"
        )
        ||
        (
            data
                ? data.photo
                : null
        );


    if (
        savedPhoto &&
        profileAvatar
    ) {

        profileAvatar.style.backgroundImage =
            `url("${savedPhoto}")`;

        profileAvatar.textContent = "";

    }

}


/* =========================================================
   SALVAR CONFIGURAÇÕES
========================================================= */

if (saveSettings) {

saveSettings.addEventListener(
    "click",
    async () => {

        const access = await window.AgendaAccess?.ready;

        if (!access?.allowed) {
            return;
        }

        if (access.readOnly) {
            alert(
                "O ADM pode consultar esta página, mas não salvar alterações."
            );
            return;
        }

            const groups = [];

            const classifications = [];


            /* =================================================
               PEGAR GRUPOS
            ================================================= */

            document
                .querySelectorAll(
                    'input[name="groups"]:checked'
                )
                .forEach(input => {

                    groups.push(
                        normalizeGroupCode(
                            input.value
                        )
                    );

                });


            /* =================================================
               PEGAR CLASSIFICAÇÕES
            ================================================= */

            document
                .querySelectorAll(
                    'input[name="classifications"]:checked'
                )
                .forEach(input => {

                    classifications.push(
                        normalizeCode(
                            input.value
                        )
                    );

                });


            /* =================================================
               NOME
            ================================================= */

            const name =
                buyerName
                    ? buyerName.value.trim()
                    : "";


            /* =================================================
               FOTO ATUAL
            ================================================= */

            let currentPhoto =
                localStorage.getItem(
                    "agendaComprador_foto"
                );


            if (!currentPhoto) {

                const previousSettings =
                    getSavedSettings();

                currentPhoto =
                    previousSettings
                        ? previousSettings.photo || null
                        : null;

            }


            /* =================================================
               MONTAR DADOS
            ================================================= */

            const data = {

                name,

                groups,

                classifications,

                photo: currentPhoto

            };


            /* =================================================
               SALVAR LOCALMENTE
            ================================================= */

            try {

                localStorage.setItem(
                    "agendaComprador_configuracoes",
                    JSON.stringify(data)
                );


                alert(
                    "Configurações salvas com sucesso."
                );

            } catch (error) {

                console.error(
                    "Erro ao salvar configurações:",
                    error
                );


                alert(
                    "Não foi possível salvar as configurações. Verifique o espaço disponível no navegador."
                );

            }

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
    async () => {

        const access = await window.AgendaAccess?.ready;

        if (!access?.allowed || access.readOnly) {
            return;
        }

        photoInput.click();

    }
);

photoInput.addEventListener(
    "change",
    async () => {

        const access = await window.AgendaAccess?.ready;

        if (!access?.allowed || access.readOnly) {
            photoInput.value = "";
            return;
        }

if (!access?.allowed || access.readOnly) {
    photoInput.value = "";
    return;
}

            const file =
                photoInput.files &&
                photoInput.files[0];


            if (!file) {
                return;
            }


            /* =================================================
               VALIDAR TIPO DA IMAGEM
            ================================================= */

            if (
                !file.type.startsWith("image/")
            ) {

                alert(
                    "Selecione uma imagem válida."
                );

                photoInput.value = "";

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


                    if (profileAvatar) {

                        profileAvatar.style.backgroundImage =
                            `url("${image}")`;

                        profileAvatar.textContent = "";

                    }


                    try {

                        localStorage.setItem(
                            "agendaComprador_foto",
                            image
                        );

                    } catch (error) {

                        console.error(
                            "Erro ao salvar foto:",
                            error
                        );


                        alert(
                            "Não foi possível salvar a foto. A imagem pode ser muito grande."
                        );

                    }

                };


            reader.onerror = () => {

                alert(
                    "Não foi possível ler a imagem selecionada."
                );

            };


            reader.readAsDataURL(file);

        }
    );

}


/* =========================================================
   INICIALIZAÇÃO E CONTROLE DE ACESSO
========================================================= */

(async () => {

    const access = await window.AgendaAccess?.ready;

    if (!access?.allowed) {
        return;
    }

    if (access.readOnly) {

        // Identificar o comprador selecionado pelo ADM.
        if (buyerName) {
            buyerName.value = access.compradorNome || "";
            buyerName.readOnly = true;
        }

        const headerName = document.querySelector(
            ".user-info strong"
        );

        const avatar = document.querySelector(
            ".user-avatar"
        );

        if (headerName) {
            headerName.textContent =
                access.compradorNome || "Comprador";
        }

        if (avatar) {
            avatar.textContent =
                (access.compradorNome || "C")
                    .trim()
                    .charAt(0)
                    .toUpperCase();
        }

        // Bloquear edição das responsabilidades.
        document.querySelectorAll(
            'input[name="groups"], input[name="classifications"]'
        ).forEach(input => {
            input.disabled = true;
        });

        // Ocultar controles de alteração.
        if (photoButton) {
            photoButton.hidden = true;
        }

        if (photoInput) {
            photoInput.disabled = true;
        }

        if (saveSettings) {
            saveSettings.hidden = true;
        }

        // Informar a limitação dos dados desta versão.
        const notice = document.createElement("p");

        notice.textContent =
            "Visualização administrativa: as configurações de grupos e classificações desta tela ainda são demonstrativas e não estão vinculadas ao cadastro real do comprador no Supabase.";

        notice.setAttribute("role", "status");

        notice.style.cssText = [
            "padding:12px 16px",
            "margin:16px 0",
            "border:1px solid #ddd3c7",
            "border-radius:8px",
            "color:#756b63",
            "background:#f8f6f1"
        ].join(";");

        document.querySelector(".page-heading")
            ?.insertAdjacentElement("afterend", notice);

    } else {

        // O comprador continua utilizando o comportamento atual.
        loadSettings();

    }

})();