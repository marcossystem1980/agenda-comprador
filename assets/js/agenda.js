/* =========================================================
   AGENDA COMPRAS
   AGENDA COMPRADOR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           ELEMENTOS
        ================================================= */

        /* =================================================
           FILTROS
        ================================================= */

        const filterDropdowns =
            document.querySelectorAll(
                ".agenda-filter-dropdown"
            );


        const groupFilterOptions =
            document.getElementById(
                "groupFilterOptions"
            );


        const classificationFilterOptions =
            document.getElementById(
                "classificationFilterOptions"
            );


        const classificationModeButton =
            document.getElementById(
                "classificationModeButton"
            );


        const classificationModeIcon =
            document.getElementById(
                "classificationModeIcon"
            );


        const viewButtons =
            document.querySelectorAll(
                ".agenda-view-button"
            );


        const periodTitle =
            document.getElementById(
                "periodTitle"
            );


        const previousPeriod =
            document.getElementById(
                "previousPeriod"
            );


        const nextPeriod =
            document.getElementById(
                "nextPeriod"
            );


        const todayButton =
            document.getElementById(
                "todayButton"
            );


        const newAppointmentButton =
            document.getElementById(
                "newAppointmentButton"
            );


        const monthView =
            document.getElementById(
                "monthView"
            );


        const weekView =
            document.getElementById(
                "weekView"
            );


        const dayView =
            document.getElementById(
                "dayView"
            );


        const monthCalendar =
            document.getElementById(
                "monthCalendar"
            );


        const weekCalendar =
            document.getElementById(
                "weekCalendar"
            );


        const dayCalendar =
            document.getElementById(
                "dayCalendar"
            );



        /* =================================================
           DATA ATUAL
        ================================================= */

        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );



        /* =================================================
           HORIZONTE DA AGENDA
           MÊS ATUAL + PRÓXIMO MÊS
        ================================================= */

        const horizonStart =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        const horizonEnd =
            new Date(
                today.getFullYear(),
                today.getMonth() + 2,
                0
            );


        horizonEnd.setHours(
            0,
            0,
            0,
            0
        );



        /* =================================================
           ESTADO
        ================================================= */

        let currentView =
            "month";


        let currentDate =
            new Date(today);



        /* =================================================
           MODO DE CLASSIFICAÇÃO
           grouped = agrupado
           separated = separado
        ================================================= */

        let classificationDisplayMode =
            localStorage.getItem(
                "agendaComprador_classificationMode"
            );


        if (
            classificationDisplayMode !== "grouped" &&
            classificationDisplayMode !== "separated"
        ) {

            classificationDisplayMode =
                "separated";

        }



        /* =================================================
           NOMES
        ================================================= */

        const monthNames = [

            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"

        ];


        const weekdayNames = [

            "Domingo",
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado"

        ];


        const weekdayShort = [

            "Dom",
            "Seg",
            "Ter",
            "Qua",
            "Qui",
            "Sex",
            "Sáb"

        ];



        /* =================================================
           DADOS DE DEMONSTRAÇÃO
           SERÃO SUBSTITUÍDOS PELO SUPABASE
        ================================================= */

        const appointments = [

            {
                date: "2026-10-05",
                time: "08:00",
                manufacturer: "CIMED",
                group: "ZTT",
                classification: "Perfumaria",
                status: "normal",
                statusLabel: "Normal"
            },

            {
                date: "2026-10-06",
                time: "10:00",
                manufacturer: "ACHE",
                group: "ZTT",
                classification: "Propagado",
                status: "attention",
                statusLabel: "Atenção"
            },

            {
                date: "2026-10-08",
                time: "14:00",
                manufacturer: "UNILEVER",
                group: "Cella",
                classification: "Dermocosméticos",
                status: "urgent",
                statusLabel: "Urgente"
            },

            {
                date: "2026-10-15",
                time: "09:00",
                manufacturer: "EMS",
                group: "ZTT",
                classification: "Genéricos",
                status: "normal",
                statusLabel: "Normal"
            },

            {
                date: "2026-11-05",
                time: "10:00",
                manufacturer: "CIMED",
                group: "ZTT",
                classification: "Genéricos",
                status: "attention",
                statusLabel: "Atenção"
            },

            {
                date: "2026-10-14",
                time: "11:00",
                manufacturer: "EMS",
                group: "ZTT",
                classification: "GENERICO",
                status: "risk",
                statusLabel: "Risco"
            }

        ];



        /* =================================================
           CLASSIFICAÇÕES DISPONÍVEIS
        ================================================= */

        const classificationCatalog = [

            {
                value: "PROPAGADO",
                label: "Propagado"
            },

            {
                value: "PERFUMARIA",
                label: "Perfumaria"
            },

            {
                value: "FRALDAS E LEITES",
                label: "Fraldas e Leites"
            },

            {
                value: "CONVENIENCIA",
                label: "Conveniência"
            },

            {
                value: "VAREJO",
                label: "Varejo"
            },

            {
                value: "PBM",
                label: "PBM"
            },

            {
                value: "SIMILARES",
                label: "Similares"
            },

            {
                value: "GENERICO",
                label: "Genéricos"
            },

            {
                value: "SUPLEMENTO",
                label: "Suplemento"
            },

            {
                value: "NOSSAS MARCAS",
                label: "Nossas Marcas"
            },

            {
                value: "PERFUMES",
                label: "Perfumes"
            },

            {
                value: "DERMOCOSMETICOS",
                label: "Dermocosméticos"
            }

        ];



        /* =================================================
           ESTADO DOS FILTROS
        ================================================= */

        const filterState = {

            groups: [
                "all"
            ],

            classifications: [
                "all"
            ],

            situations: [
                "all"
            ]

        };



        /* =================================================
           CONFIGURAÇÕES DO COMPRADOR
        ================================================= */

        function getBuyerSettings() {

            const saved =
                localStorage.getItem(
                    "agendaComprador_configuracoes"
                );


            if (!saved) {

                return {

                    groups: [
                        "ZTT",
                        "Cella",
                        "Fênix"
                    ],

                    classifications:
                        classificationCatalog.map(
                            item => item.value
                        )

                };

            }


            try {

                const data =
                    JSON.parse(
                        saved
                    );


                return {

                    groups:
                        Array.isArray(data.groups)
                            ? data.groups
                            : [],

                    classifications:
                        Array.isArray(
                            data.classifications
                        )
                            ? data.classifications
                            : []

                };

            } catch (error) {

                console.error(
                    "Erro ao carregar configurações:",
                    error
                );


                return {

                    groups: [],

                    classifications: []

                };

            }

        }



        /* =================================================
           RENDERIZAR GRUPOS
        ================================================= */

        function renderGroupFilter() {

            if (!groupFilterOptions) {
                return;
            }


            const settings =
                getBuyerSettings();


            const groups =
                settings.groups;


            let html = `

                <label class="agenda-filter-option">

                    <input
                        type="checkbox"
                        name="groupFilter"
                        value="all"
                        checked
                    >

                    <span class="agenda-filter-check"></span>

                    <span class="agenda-filter-option-text">
                        Todos os grupos
                    </span>

                </label>

            `;


            groups.forEach(
                group => {

                    html += `

                        <label class="agenda-filter-option">

                            <input
                                type="checkbox"
                                name="groupFilter"
                                value="${group}"
                            >

                            <span class="agenda-filter-check"></span>

                            <span class="agenda-filter-option-text">
                                ${group}
                            </span>

                        </label>

                    `;

                }
            );


            groupFilterOptions.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR CLASSIFICAÇÕES
        ================================================= */

        function renderClassificationFilter() {

            if (!classificationFilterOptions) {
                return;
            }


            const settings =
                getBuyerSettings();


            const allowed =
                settings.classifications;


            let html = `

                <label class="agenda-filter-option">

                    <input
                        type="checkbox"
                        name="classificationFilter"
                        value="all"
                        checked
                    >

                    <span class="agenda-filter-check"></span>

                    <span class="agenda-filter-option-text">
                        Todas as classificações
                    </span>

                </label>

            `;


            classificationCatalog.forEach(
                item => {

                    if (
                        !allowed.includes(
                            item.value
                        )
                    ) {

                        return;

                    }


                    html += `

                        <label class="agenda-filter-option">

                            <input
                                type="checkbox"
                                name="classificationFilter"
                                value="${item.value}"
                            >

                            <span class="agenda-filter-check"></span>

                            <span class="agenda-filter-option-text">
                                ${item.label}
                            </span>

                        </label>

                    `;

                }
            );


            classificationFilterOptions.innerHTML =
                html;

        }



        /* =================================================
           NORMALIZAR TEXTO
        ================================================= */

        function normalizeText(
            value
        ) {

            return String(
                value || ""
            )
                .normalize("NFD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toUpperCase()
                .trim();

        }



        /* =================================================
           CONFIGURAR CHECKBOXES
        ================================================= */

        function setupFilterOptions(
            selector,
            stateKey
        ) {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    input => {

                        input.addEventListener(
                            "change",
                            () => {

                                const allInput =
                                    document.querySelector(
                                        `${selector}[value="all"]`
                                    );


                                const specificInputs =
                                    [
                                        ...document.querySelectorAll(
                                            `${selector}:not([value="all"])`
                                        )
                                    ];


                                /* -----------------------------------------
                                   CLICOU EM "TODOS"
                                ------------------------------------------ */

                                if (
                                    input.value === "all" &&
                                    input.checked
                                ) {

                                    specificInputs.forEach(
                                        item => {

                                            item.checked =
                                                false;

                                        }
                                    );

                                }


                                /* -----------------------------------------
                                   CLICOU EM UMA OPÇÃO ESPECÍFICA
                                ------------------------------------------ */

                                else if (
                                    input.value !== "all" &&
                                    input.checked
                                ) {

                                    if (allInput) {

                                        allInput.checked =
                                            false;

                                    }

                                }


                                /* -----------------------------------------
                                   NENHUMA OPÇÃO
                                ------------------------------------------ */

                                const checkedSpecific =
                                    specificInputs.filter(
                                        item =>
                                            item.checked
                                    );


                                if (
                                    checkedSpecific.length === 0 &&
                                    allInput
                                ) {

                                    allInput.checked =
                                        true;

                                }


                                /* -----------------------------------------
                                   SALVAR ESTADO
                                ------------------------------------------ */

                                filterState[
                                    stateKey
                                ] =
                                    [
                                        ...document
                                            .querySelectorAll(
                                                `${selector}:checked`
                                            )
                                    ]
                                    .map(
                                        item =>
                                            item.value
                                    );


                                updateFilterLabels();

                                renderCurrentView();

                            }
                        );

                    }
                );

        }



        /* =================================================
           ATUALIZAR TEXTO DOS FILTROS
        ================================================= */

        function updateFilterLabels() {

            const labels = {

                group:
                    document.querySelector(
                        '[data-filter-label="group"]'
                    ),

                classification:
                    document.querySelector(
                        '[data-filter-label="classification"]'
                    ),

                situation:
                    document.querySelector(
                        '[data-filter-label="situation"]'
                    )

            };



            /* GRUPO */

            if (labels.group) {

                const values =
                    filterState.groups;


                labels.group.textContent =
                    values.includes("all")
                        ? "Todos"
                        : values.length === 1
                            ? values[0]
                            : `${values.length} selecionados`;

            }



            /* CLASSIFICAÇÃO */

            if (labels.classification) {

                const values =
                    filterState.classifications;


                labels.classification.textContent =
                    values.includes("all")
                        ? "Todas"
                        : values.length === 1
                            ? getClassificationLabel(
                                values[0]
                            )
                            : `${values.length} selecionadas`;

            }



            /* SITUAÇÃO */

            if (labels.situation) {

                const values =
                    filterState.situations;


                if (
                    values.includes("all")
                ) {

                    labels.situation.textContent =
                        "Todas";

                } else {

                    const labelsMap = {

                        normal: "Normal",

                        attention: "Atenção",

                        urgent: "Urgente",

                        risk: "Risco"

                    };


                    labels.situation.textContent =
                        values.length === 1
                            ? labelsMap[
                                values[0]
                            ]
                            : `${values.length} selecionadas`;

                }

            }

        }



        /* =================================================
           NOME DA CLASSIFICAÇÃO
        ================================================= */

        function getClassificationLabel(
            value
        ) {

            const normalized =
                normalizeText(
                    value
                );


            const item =
                classificationCatalog.find(
                    classification =>
                        normalizeText(
                            classification.value
                        ) === normalized
                        ||
                        normalizeText(
                            classification.label
                        ) === normalized
                );


            return item
                ? item.label
                : value;

        }



        /* =================================================
           FORMATAR CLASSIFICAÇÕES PARA EXIBIÇÃO
        ================================================= */

        function formatClassificationList(
            labels
        ) {

            const uniqueLabels = [
                ...new Set(
                    labels
                        .filter(Boolean)
                        .map(
                            label =>
                                getClassificationLabel(
                                    label
                                )
                        )
                )
            ];


            /* ---------------------------------------------
               ORDENAR CONFORME O CATÁLOGO
            ---------------------------------------------- */

            uniqueLabels.sort(
                (a, b) => {

                    const indexA =
                        classificationCatalog.findIndex(
                            item =>
                                normalizeText(
                                    item.label
                                ) ===
                                normalizeText(
                                    a
                                )
                        );


                    const indexB =
                        classificationCatalog.findIndex(
                            item =>
                                normalizeText(
                                    item.label
                                ) ===
                                normalizeText(
                                    b
                                )
                        );


                    return (
                        (indexA === -1 ? 999 : indexA)
                        -
                        (indexB === -1 ? 999 : indexB)
                    );

                }
            );


            if (
                uniqueLabels.length === 0
            ) {

                return {

                    display: "",

                    full: ""

                };

            }


            if (
                uniqueLabels.length === 1
            ) {

                return {

                    display:
                        uniqueLabels[0],

                    full:
                        uniqueLabels[0]

                };

            }


            if (
                uniqueLabels.length === 2
            ) {

                return {

                    display:
                        `${uniqueLabels[0]} • ${uniqueLabels[1]}`,

                    full:
                        `${uniqueLabels[0]} • ${uniqueLabels[1]}`

                };

            }


            return {

                display:
                    `${uniqueLabels[0]} • ${uniqueLabels[1]}...`,

                full:
                    uniqueLabels.join(
                        " • "
                    )

            };

        }



        /* =================================================
           ATUALIZAR BOTÃO AGRUPAR / SEPARAR
        ================================================= */

        function updateClassificationModeButton() {

            if (
                !classificationModeButton
            ) {

                return;

            }


            const grouped =
                classificationDisplayMode ===
                "grouped";


            classificationModeButton.classList.toggle(
                "grouped",
                grouped
            );


            classificationModeButton.classList.toggle(
                "separated",
                !grouped
            );


            classificationModeButton.setAttribute(
                "aria-pressed",
                grouped
                    ? "true"
                    : "false"
            );


            if (
                classificationModeIcon
            ) {

                classificationModeIcon.textContent =
                    grouped
                        ? "⧉"
                        : "≡";

            }


            classificationModeButton.title =
                grouped
                    ? "Agrupado — clicar para separar classificações"
                    : "Separado — clicar para agrupar classificações";


            classificationModeButton.setAttribute(
                "aria-label",
                grouped
                    ? "Separar classificações"
                    : "Agrupar classificações"
            );

        }



        /* =================================================
           AGRUPAR AGENDAMENTOS
        ================================================= */

        function prepareAppointmentsForDisplay(
            appointmentList
        ) {

            if (
                classificationDisplayMode !==
                "grouped"
            ) {

                return appointmentList.map(
                    appointment => {

                        const classification =
                            formatClassificationList(
                                [
                                    appointment.classification
                                ]
                            );


                        return {

                            ...appointment,

                            displayClassification:
                                classification.display,

                            fullClassification:
                                classification.full

                        };

                    }
                );

            }



            /* =================================================
               MODO AGRUPADO
            ================================================= */

            const groups =
                new Map();


            appointmentList.forEach(
                appointment => {

                    /*
                       O GRUPO faz parte da chave.

                       Portanto:

                       CIMED + ZTT
                       CIMED + Cella

                       continuam separados.
                    */

                    const key =
                        [
                            appointment.date,

                            appointment.time,

                            normalizeText(
                                appointment.manufacturer
                            ),

                            normalizeText(
                                appointment.group
                            ),

                            normalizeText(
                                appointment.status
                            )
                        ].join("|");


                    if (
                        !groups.has(key)
                    ) {

                        groups.set(
                            key,
                            {

                                base:
                                    appointment,

                                appointments:
                                    []

                            }
                        );

                    }


                    groups
                        .get(key)
                        .appointments
                        .push(
                            appointment
                        );

                }
            );


            return [
                ...groups.values()
            ]
            .map(
                group => {

                    const base =
                        group.base;


                    const classificationLabels =
                        group.appointments.map(
                            appointment =>
                                appointment.classification
                        );


                    const classification =
                        formatClassificationList(
                            classificationLabels
                        );


                    return {

                        ...base,

                        displayClassification:
                            classification.display,

                        fullClassification:
                            classification.full

                    };

                }
            );

        }



        /* =================================================
           FORMATAR DATA ISO
        ================================================= */

        function dateToISO(
            date
        ) {

            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                );


            return `${year}-${month}-${day}`;

        }



        /* =================================================
           DATA DE UMA STRING
        ================================================= */

        function parseISODate(
            value
        ) {

            const [
                year,
                month,
                day
            ] =
                value
                    .split("-")
                    .map(Number);


            return new Date(
                year,
                month - 1,
                day
            );

        }



        /* =================================================
           COMPARAR DATAS
        ================================================= */

        function isSameDate(
            dateA,
            dateB
        ) {

            return (
                dateA.getFullYear() ===
                dateB.getFullYear()

                &&

                dateA.getMonth() ===
                dateB.getMonth()

                &&

                dateA.getDate() ===
                dateB.getDate()
            );

        }



        /* =================================================
           DATA DENTRO DO HORIZONTE
        ================================================= */

        function isInsideHorizon(
            date
        ) {

            return (
                date >= horizonStart &&
                date <= horizonEnd
            );

        }



        /* =================================================
           SEGUNDA-FEIRA DA SEMANA
        ================================================= */

        function getMonday(
            date
        ) {

            const result =
                new Date(date);


            const day =
                result.getDay();


            const difference =
                day === 0
                    ? -6
                    : 1 - day;


            result.setDate(
                result.getDate() +
                difference
            );


            result.setHours(
                0,
                0,
                0,
                0
            );


            return result;

        }



        /* =================================================
           SEXTA-FEIRA DA SEMANA
        ================================================= */

        function getFriday(
            date
        ) {

            const monday =
                getMonday(date);


            const friday =
                new Date(
                    monday
                );


            friday.setDate(
                friday.getDate() + 4
            );


            return friday;

        }



        /* =================================================
           PEGAR AGENDAMENTOS
        ================================================= */

        function getAppointmentsForDate(
            date
        ) {

            const iso =
                dateToISO(
                    date
                );


            let result =
                appointments.filter(
                    appointment =>
                        appointment.date ===
                        iso
                );



            /* =================================================
               FILTRO DE GRUPO
            ================================================= */

            if (
                !filterState.groups.includes(
                    "all"
                )
            ) {

                result =
                    result.filter(
                        appointment => {

                            return filterState.groups
                                .includes(
                                    appointment.group
                                );

                        }
                    );

            }



            /* =================================================
               FILTRO DE CLASSIFICAÇÃO
            ================================================= */

            if (
                !filterState.classifications.includes(
                    "all"
                )
            ) {

                result =
                    result.filter(
                        appointment => {

                            const classification =
                                normalizeText(
                                    appointment.classification
                                );


                            return filterState.classifications
                                .some(
                                    selected => {

                                        return (
                                            normalizeText(
                                                selected
                                            )
                                            ===
                                            classification
                                        );

                                    }
                                );

                        }
                    );

            }



            /* =================================================
               FILTRO DE SITUAÇÃO
            ================================================= */

            if (
                !filterState.situations.includes(
                    "all"
                )
            ) {

                result =
                    result.filter(
                        appointment => {

                            return filterState.situations
                                .includes(
                                    appointment.status
                                );

                        }
                    );

            }


            /*
               Agora aplicamos a forma de exibição.

               O filtro continua selecionando os dados.
               O agrupamento apenas define como eles
               serão apresentados na agenda.
            */

            return prepareAppointmentsForDisplay(
                result
            );

        }



        /* =================================================
           ABRIR / FECHAR FILTROS
        ================================================= */

        filterDropdowns.forEach(
            dropdown => {

                const trigger =
                    dropdown.querySelector(
                        ".agenda-filter-trigger"
                    );


                if (!trigger) {
                    return;
                }


                trigger.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        filterDropdowns.forEach(
                            item => {

                                if (
                                    item !==
                                    dropdown
                                ) {

                                    item.classList.remove(
                                        "open"
                                    );


                                    const otherTrigger =
                                        item.querySelector(
                                            ".agenda-filter-trigger"
                                        );


                                    if (otherTrigger) {

                                        otherTrigger.setAttribute(
                                            "aria-expanded",
                                            "false"
                                        );

                                    }

                                }

                            }
                        );


                        const isOpen =
                            dropdown.classList.toggle(
                                "open"
                            );


                        trigger.setAttribute(
                            "aria-expanded",
                            isOpen
                                ? "true"
                                : "false"
                        );

                    }
                );

            }
        );



        /* =================================================
           FECHAR AO CLICAR FORA
        ================================================= */

        document.addEventListener(
            "click",
            () => {

                filterDropdowns.forEach(
                    dropdown => {

                        dropdown.classList.remove(
                            "open"
                        );


                        const trigger =
                            dropdown.querySelector(
                                ".agenda-filter-trigger"
                            );


                        if (trigger) {

                            trigger.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }

                    }
                );

            }
        );



        /* =================================================
           ESC
        ================================================= */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                filterDropdowns.forEach(
                    dropdown => {

                        dropdown.classList.remove(
                            "open"
                        );


                        const trigger =
                            dropdown.querySelector(
                                ".agenda-filter-trigger"
                            );


                        if (trigger) {

                            trigger.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }

                    }
                );

            }
        );



        /* =================================================
           MODO AGRUPADO / SEPARADO
        ================================================= */

        if (
            classificationModeButton
        ) {

            classificationModeButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    classificationDisplayMode =
                        classificationDisplayMode ===
                        "grouped"
                            ? "separated"
                            : "grouped";


                    localStorage.setItem(
                        "agendaComprador_classificationMode",
                        classificationDisplayMode
                    );


                    updateClassificationModeButton();

                    renderCurrentView();

                }
            );

        }



        /* =================================================
           TÍTULO
        ================================================= */

        function updatePeriodTitle() {

            if (!periodTitle) {
                return;
            }



            /* ---------------------------------------------
               MÊS
            ---------------------------------------------- */

            if (
                currentView ===
                "month"
            ) {

                periodTitle.textContent =
                    `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

                return;

            }



            /* ---------------------------------------------
               SEMANA
            ---------------------------------------------- */

            if (
                currentView ===
                "week"
            ) {

                const monday =
                    getMonday(
                        currentDate
                    );


                const friday =
                    getFriday(
                        currentDate
                    );


                periodTitle.textContent =
                    `${formatDateShort(monday)} a ${formatDateShort(friday)}`;

                return;

            }



            /* ---------------------------------------------
               DIA
            ---------------------------------------------- */

            if (
                currentView ===
                "day"
            ) {

                periodTitle.textContent =
                    `${String(
                        currentDate.getDate()
                    ).padStart(
                        2,
                        "0"
                    )} de ${monthNames[
                        currentDate.getMonth()
                    ]} de ${currentDate.getFullYear()}`;

            }

        }



        /* =================================================
           DATA CURTA
        ================================================= */

        function formatDateShort(
            date
        ) {

            return (
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                )
                +
                "/"
                +
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                )
            );

        }



        /* =================================================
           RENDERIZAR MÊS
        ================================================= */

        function renderMonth() {

            if (!monthCalendar) {
                return;
            }


            const year =
                currentDate.getFullYear();


            const month =
                currentDate.getMonth();


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            let startPosition =
                firstDay.getDay();


            /*
                Domingo = 0
                Segunda = 1
            */

            startPosition =
                startPosition === 0
                    ? 6
                    : startPosition - 1;


            let html = "";



            /* ---------------------------------------------
               TÍTULO
            ---------------------------------------------- */

            html += `

                <div class="month-calendar-title">

                    <strong>
                        ${monthNames[month]}
                    </strong>

                    <span>
                        ${year}
                    </span>

                </div>

            `;



            /* ---------------------------------------------
               SEMANA
            ---------------------------------------------- */

            html += `

                <div class="calendar-header">

                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div class="weekend-column">Sáb</div>
                    <div class="weekend-column">Dom</div>

                </div>

            `;



            /* ---------------------------------------------
               GRADE
            ---------------------------------------------- */

            html += `
                <div class="calendar-grid">
            `;



            /* ---------------------------------------------
               DIAS ANTERIORES
            ---------------------------------------------- */

            for (
                let i = 0;
                i < startPosition;
                i++
            ) {

                html += `

                    <div class="calendar-day previous-month">

                        <span class="calendar-day-number">
                        </span>

                    </div>

                `;

            }



            /* ---------------------------------------------
               DIAS DO MÊS
            ---------------------------------------------- */

            for (
                let day = 1;
                day <= lastDay.getDate();
                day++
            ) {

                const date =
                    new Date(
                        year,
                        month,
                        day
                    );


                const weekday =
                    date.getDay();


                const weekend =
                    weekday === 0 ||
                    weekday === 6;


                const todayClass =
                    isSameDate(
                        date,
                        today
                    )
                        ? "current-day"
                        : "";


                const dayAppointments =
                    getAppointmentsForDate(
                        date
                    );


                html += `

                    <div
                        class="calendar-day ${weekend ? "weekend" : ""} ${todayClass}"
                    >

                        <span class="calendar-day-number">
                            ${day}
                        </span>


                        <div class="calendar-appointments">

                            ${
                                dayAppointments
                                    .map(
                                        appointment => `

                                            <div
                                                class="calendar-appointment ${appointment.status}"
                                                data-date="${appointment.date}"
                                                title="${appointment.fullClassification || ""}"
                                            >

                                                <span class="calendar-appointment-primary">
                                                    ${appointment.time} · ${appointment.manufacturer}
                                                </span>

                                                <span class="calendar-appointment-classification">
                                                    ${appointment.displayClassification || ""}
                                                </span>

                                            </div>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>

                `;

            }



            /* ---------------------------------------------
               DIAS RESTANTES
            ---------------------------------------------- */

            const totalCells =
                startPosition +
                lastDay.getDate();


            const remaining =
                totalCells % 7 === 0
                    ? 0
                    : 7 - (
                        totalCells % 7
                    );


            for (
                let i = 0;
                i < remaining;
                i++
            ) {

                html += `

                    <div class="calendar-day next-month">

                        <span class="calendar-day-number">
                        </span>

                    </div>

                `;

            }


            html += `
                </div>
            `;


            monthCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR SEMANA
        ================================================= */

        function renderWeek() {

            if (!weekCalendar) {
                return;
            }


            const monday =
                getMonday(
                    currentDate
                );


            const weekDays = [];


            for (
                let i = 0;
                i < 5;
                i++
            ) {

                const date =
                    new Date(
                        monday
                    );


                date.setDate(
                    monday.getDate() + i
                );


                weekDays.push(
                    date
                );

            }


            let html = `

                <div class="week-calendar-grid">

                    <div class="week-time-column">

                        <div class="week-column-header">

                            <span>
                                Horário
                            </span>

                        </div>

            `;



            /* HORÁRIOS */

            for (
                let hour = 8;
                hour <= 18;
                hour++
            ) {

                html += `

                    <div class="week-time">

                        ${String(hour).padStart(2, "0")}:00

                    </div>

                `;

            }


            html += `
                    </div>
            `;



            /* DIAS */

            weekDays.forEach(
                date => {

                    html += `

                        <div class="week-day-column">

                            <div class="week-column-header">

                                <strong>
                                    ${String(
                                        date.getDate()
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </strong>

                                <span>
                                    ${weekdayShort[
                                        date.getDay()
                                    ]}
                                </span>

                            </div>

                    `;


                    for (
                        let hour = 8;
                        hour <= 18;
                        hour++
                    ) {

                        const appointmentsOfHour =
                            getAppointmentsForDate(
                                date
                            ).filter(
                                appointment =>
                                    Number(
                                        appointment.time
                                            .split(":")[0]
                                    ) === hour
                            );


                        html += `

                            <div class="week-slot">

                                ${
                                    appointmentsOfHour
                                        .map(
                                            appointment => `

                                                <div
                                                    class="week-appointment ${appointment.status}"
                                                    title="${appointment.fullClassification || ""}"
                                                >

                                                    <strong>
                                                        ${appointment.manufacturer}
                                                    </strong>

                                                    <span>
                                                        ${appointment.displayClassification || ""}
                                                    </span>

                                                </div>

                                            `
                                        )
                                        .join("")
                                }

                            </div>

                        `;

                    }


                    html += `
                        </div>
                    `;

                }
            );


            html += `
                </div>
            `;


            weekCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR DIA
        ================================================= */

        function renderDay() {

            if (!dayCalendar) {
                return;
            }


            const appointmentsOfDay =
                getAppointmentsForDate(
                    currentDate
                );


            let html = `

                <div class="day-view-header">

                    <div>

                        <span>
                            ${weekdayNames[
                                currentDate.getDay()
                            ].toUpperCase()}
                        </span>

                        <strong>
                            ${String(
                                currentDate.getDate()
                            ).padStart(
                                2,
                                "0"
                            )} de ${monthNames[
                                currentDate.getMonth()
                            ]} de ${currentDate.getFullYear()}
                        </strong>

                    </div>

                </div>


                <div class="day-timeline">

            `;



            for (
                let hour = 8;
                hour <= 18;
                hour++
            ) {

                const hourAppointments =
                    appointmentsOfDay.filter(
                        appointment =>
                            Number(
                                appointment.time
                                    .split(":")[0]
                            ) === hour
                    );


                html += `

                    <div class="day-timeline-row">

                        <div class="day-timeline-time">

                            ${String(
                                hour
                            ).padStart(
                                2,
                                "0"
                            )}:00

                        </div>


                        <div class="day-timeline-content">

                `;


                if (
                    hourAppointments.length === 0
                ) {

                    html += `

                        <div class="day-empty">
                            Nenhum agendamento
                        </div>

                    `;

                } else {

                    hourAppointments.forEach(
                        appointment => {

                            html += `

                                <div
                                    class="day-appointment ${appointment.status}"
                                    title="${appointment.fullClassification || ""}"
                                >

                                    <div class="day-appointment-main">

                                        <span class="day-status-dot"></span>


                                        <div>

                                            <strong>
                                                ${appointment.manufacturer}
                                            </strong>

                                            <small>
                                                ${appointment.group} · ${appointment.displayClassification || ""}
                                            </small>

                                        </div>

                                    </div>


                                    <span class="day-status">
                                        ${appointment.statusLabel}
                                    </span>

                                </div>

                            `;

                        }
                    );

                }


                html += `

                        </div>

                    </div>

                `;

            }


            html += `
                </div>
            `;


            dayCalendar.innerHTML =
                html;

        }



        /* =================================================
           RENDERIZAR TELA
        ================================================= */

        function renderCurrentView() {

            if (
                currentView ===
                "month"
            ) {

                renderMonth();

            }


            if (
                currentView ===
                "week"
            ) {

                renderWeek();

            }


            if (
                currentView ===
                "day"
            ) {

                renderDay();

            }


            updatePeriodTitle();

            updateNavigationButtons();

        }



        /* =================================================
           TROCAR VISUALIZAÇÃO
        ================================================= */

        function changeView(
            view
        ) {

            currentView =
                view;


            viewButtons.forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.view === view
                    );

                }
            );


            monthView.classList.toggle(
                "active",
                view === "month"
            );


            weekView.classList.toggle(
                "active",
                view === "week"
            );


            dayView.classList.toggle(
                "active",
                view === "day"
            );


            renderCurrentView();

        }



        /* =================================================
           LIMITES DOS BOTÕES
        ================================================= */

        function updateNavigationButtons() {

            if (
                currentView ===
                "month"
            ) {

                const currentMonth =
                    new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        1
                    );


                const startMonth =
                    new Date(
                        horizonStart
                    );


                const nextMonth =
                    new Date(
                        horizonStart.getFullYear(),
                        horizonStart.getMonth() + 1,
                        1
                    );


                previousPeriod.disabled =
                    currentMonth <= startMonth;


                nextPeriod.disabled =
                    currentMonth >= nextMonth;


                return;

            }



            if (
                currentView ===
                "day"
            ) {

                const previousDay =
                    new Date(
                        currentDate
                    );


                previousDay.setDate(
                    previousDay.getDate() - 1
                );


                const nextDay =
                    new Date(
                        currentDate
                    );


                nextDay.setDate(
                    nextDay.getDate() + 1
                );


                previousPeriod.disabled =
                    previousDay < horizonStart;


                nextPeriod.disabled =
                    nextDay > horizonEnd;


                return;

            }



            if (
                currentView ===
                "week"
            ) {

                const currentMonday =
                    getMonday(
                        currentDate
                    );


                const currentFriday =
                    getFriday(
                        currentDate
                    );


                const firstMonday =
                    getMonday(
                        horizonStart
                    );


                const lastMonday =
                    getMonday(
                        horizonEnd
                    );


                previousPeriod.disabled =
                    currentMonday <= firstMonday;


                nextPeriod.disabled =
                    currentMonday >= lastMonday;


                void currentFriday;

            }

        }



        /* =================================================
           MÊS / SEMANA / DIA
        ================================================= */

        viewButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        changeView(
                            button.dataset.view
                        );

                    }
                );

            }
        );



        /* =================================================
           HOJE
        ================================================= */

        if (todayButton) {

            todayButton.addEventListener(
                "click",
                () => {

                    currentDate =
                        new Date(today);

                    changeView(
                        "day"
                    );

                }
            );

        }



        /* =================================================
           PERÍODO ANTERIOR
        ================================================= */

        if (previousPeriod) {

            previousPeriod.addEventListener(
                "click",
                () => {

                    if (
                        previousPeriod.disabled
                    ) {
                        return;
                    }


                    /* MÊS */

                    if (
                        currentView ===
                        "month"
                    ) {

                        currentDate =
                            new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth() - 1,
                                1
                            );

                    }


                    /* SEMANA */

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() - 7
                        );


                        currentDate =
                            newDate;

                    }


                    /* DIA */

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() - 1
                        );


                        currentDate =
                            newDate;

                    }


                    renderCurrentView();

                }
            );

        }



        /* =================================================
           PRÓXIMO PERÍODO
        ================================================= */

        if (nextPeriod) {

            nextPeriod.addEventListener(
                "click",
                () => {

                    if (
                        nextPeriod.disabled
                    ) {
                        return;
                    }


                    /* MÊS */

                    if (
                        currentView ===
                        "month"
                    ) {

                        currentDate =
                            new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth() + 1,
                                1
                            );

                    }


                    /* SEMANA */

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() + 7
                        );


                        currentDate =
                            newDate;

                    }


                    /* DIA */

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() + 1
                        );


                        currentDate =
                            newDate;

                    }


                    renderCurrentView();

                }
            );

        }



        /* =================================================
           NOVO AGENDAMENTO
        ================================================= */

        if (
            newAppointmentButton
        ) {

            newAppointmentButton.addEventListener(
                "click",
                () => {

                    alert(
                        "O cadastro de novo agendamento será construído na próxima etapa."
                    );

                }
            );

        }



        /* =================================================
           INICIALIZAR FILTROS
        ================================================= */

        renderGroupFilter();

        renderClassificationFilter();


        setupFilterOptions(
            'input[name="groupFilter"]',
            "groups"
        );


        setupFilterOptions(
            'input[name="classificationFilter"]',
            "classifications"
        );


        setupFilterOptions(
            'input[name="situationFilter"]',
            "situations"
        );


        updateFilterLabels();

        updateClassificationModeButton();



        /* =================================================
           INICIALIZAÇÃO
        ================================================= */

        changeView(
            "month"
        );

    }
);