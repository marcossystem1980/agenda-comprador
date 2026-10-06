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
   COMPRADOR ATUAL
   TEMPORÁRIO — SERÁ SUBSTITUÍDO PELO LOGIN
================================================= */

const COMPRADOR_ID =
    "c84c12af-5c2c-4734-9d2b-e075ac4cf0f2";


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
   AGENDAMENTOS REAIS
   CARREGADOS DO SUPABASE
================================================= */

let appointments = [];


        /* =================================================
           CATÁLOGO DE CLASSIFICAÇÕES
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
                            item =>
                                item.value
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
                        Array.isArray(
                            data.groups
                        )
                            ? [
                                ...new Set(
                                    data.groups
                                )
                            ]
                            : [],

                    classifications:
                        Array.isArray(
                            data.classifications
                        )
                            ? [
                                ...new Set(
                                    data.classifications
                                )
                            ]
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
           RENDERIZAR FILTRO DE GRUPOS
        ================================================= */

        function renderGroupFilter() {

            if (!groupFilterOptions) {
                return;
            }


            const settings =
                getBuyerSettings();


            const groups =
                [
                    ...new Set(
                        settings.groups
                            .filter(Boolean)
                    )
                ];


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
                                value="${escapeHtml(group)}"
                            >

                            <span class="agenda-filter-check"></span>

                            <span class="agenda-filter-option-text">
                                ${escapeHtml(group)}
                            </span>

                        </label>

                    `;

                }
            );


            groupFilterOptions.innerHTML =
                html;

        }


        /* =================================================
           RENDERIZAR FILTRO DE CLASSIFICAÇÕES
        ================================================= */

        function renderClassificationFilter() {

            if (
                !classificationFilterOptions
            ) {
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
                        !allowed.some(
                            classification =>
                                normalizeText(
                                    classification
                                ) ===
                                normalizeText(
                                    item.value
                                )
                        )
                    ) {

                        return;

                    }


                    html += `

                        <label class="agenda-filter-option">

                            <input
                                type="checkbox"
                                name="classificationFilter"
                                value="${escapeHtml(item.value)}"
                            >

                            <span class="agenda-filter-check"></span>

                            <span class="agenda-filter-option-text">
                                ${escapeHtml(item.label)}
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
           ESCAPE HTML
        ================================================= */

        function escapeHtml(
            value
        ) {

            return String(
                value || ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

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


                                else if (
                                    input.value !== "all" &&
                                    input.checked
                                ) {

                                    if (allInput) {

                                        allInput.checked =
                                            false;

                                    }

                                }


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


                                filterState[stateKey] =
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


                                if (
                                    filterState[stateKey]
                                        .length === 0
                                ) {

                                    filterState[stateKey] =
                                        [
                                            "all"
                                        ];

                                }


                                updateFilterLabels();

                                renderCurrentView();

                            }
                        );

                    }
                );

        }


        /* =================================================
           ATUALIZAR TEXTOS DOS FILTROS
        ================================================= */

        function updateFilterLabels() {

            const groupLabel =
                document.querySelector(
                    '[data-filter-label="group"]'
                );


            const classificationLabel =
                document.querySelector(
                    '[data-filter-label="classification"]'
                );


            const situationLabel =
                document.querySelector(
                    '[data-filter-label="situation"]'
                );


            /* GRUPO */

            if (groupLabel) {

                const values =
                    filterState.groups;


                groupLabel.textContent =
                    values.includes("all")
                        ? "Todos"
                        : values.length === 1
                            ? values[0]
                            : `${values.length} selecionados`;

            }


            /* CLASSIFICAÇÃO */

            if (
                classificationLabel
            ) {

                const values =
                    filterState.classifications;


                classificationLabel.textContent =
                    values.includes("all")
                        ? "Todas"
                        : values.length === 1
                            ? getClassificationLabel(
                                values[0]
                            )
                            : `${values.length} selecionadas`;

            }


            /* SITUAÇÃO */

            if (situationLabel) {

                const values =
                    filterState.situations;


                if (
                    values.includes("all")
                ) {

                    situationLabel.textContent =
                        "Todas";

                } else {

                    const labelsMap = {

                        normal: "Normal",

                        attention: "Atenção",

                        urgent: "Urgente",

                        risk: "Risco"

                    };


                    situationLabel.textContent =
                        values.length === 1
                            ? (
                                labelsMap[
                                    values[0]
                                ] ||
                                values[0]
                            )
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
                    classification => {

                        return (
                            normalizeText(
                                classification.value
                            ) === normalized
                            ||
                            normalizeText(
                                classification.label
                            ) === normalized
                        );

                    }
                );


            return item
                ? item.label
                : value;

        }


        /* =================================================
           ORDEM DE PRIORIDADE DAS SITUAÇÕES
        ================================================= */

        function getSituationWeight(
            status
        ) {

            const weights = {

                normal: 1,

                attention: 2,

                urgent: 3,

                risk: 4

            };


            return (
                weights[status] ||
                0
            );

        }


        /* =================================================
           OBTER SITUAÇÃO MAIS CRÍTICA
        ================================================= */

        function getMostCriticalSituation(
            appointmentList
        ) {

            if (
                !appointmentList ||
                appointmentList.length === 0
            ) {

                return {

                    status: "normal",

                    statusLabel: "Normal"

                };

            }


            const ordered =
                [
                    ...appointmentList
                ]
                .sort(
                    (a, b) =>
                        getSituationWeight(
                            b.status
                        )
                        -
                        getSituationWeight(
                            a.status
                        )
                );


            const critical =
                ordered[0];


            return {

                status:
                    critical.status,

                statusLabel:
                    critical.statusLabel

            };

        }


        /* =================================================
           FORMATAR LISTA DE CLASSIFICAÇÕES
        ================================================= */

        function formatClassificationList(
            labels
        ) {

            const uniqueLabels =
                [
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
                        (
                            indexA === -1
                                ? 999
                                : indexA
                        )
                        -
                        (
                            indexB === -1
                                ? 999
                                : indexB
                        )
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
           AGRUPAR AGENDAMENTOS
        ================================================= */

        function prepareAppointmentsForDisplay(
            appointmentList
        ) {

            if (
                !Array.isArray(
                    appointmentList
                )
            ) {

                return [];

            }


            /* =================================================
               MODO SEPARADO
            ================================================= */

            if (
                classificationDisplayMode ===
                "separated"
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

                       Exemplo:

                       CIMED + ZTT
                       CIMED + CELLA

                       continuam separados.
                    */

const key =
    [
        appointment.date,

        appointment.time,

        appointment.manufacturerId ||
            normalizeText(
                appointment.manufacturer
            ),

        normalizeText(
            appointment.group
        ),

        appointment.ruleId ||
            ""
    ]
    .join("|");


                    if (
                        !groups.has(
                            key
                        )
                    ) {

                        groups.set(
                            key,
                            []
                        );

                    }


                    groups
                        .get(key)
                        .push(
                            appointment
                        );

                }
            );


            return [
                ...groups.values()
            ]
            .map(
                groupedAppointments => {

                    const base =
                        groupedAppointments[0];


                    const classification =
                        formatClassificationList(
                            groupedAppointments.map(
                                appointment =>
                                    appointment.classification
                            )
                        );


                    const situation =
                        getMostCriticalSituation(
                            groupedAppointments
                        );


                    return {

                        ...base,

                        status:
                            situation.status,

                        statusLabel:
                            situation.statusLabel,

                        displayClassification:
                            classification.display,

                        fullClassification:
                            classification.full

                    };

                }
            );

        }


        /* =================================================
           DATA → ISO
        ================================================= */

        function dateToISO(
            date
        ) {

            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                )
                .padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    date.getDate()
                )
                .padStart(
                    2,
                    "0"
                );


            return `${year}-${month}-${day}`;

        }


        /* =================================================
           ISO → DATE
        ================================================= */

        function parseISODate(
            value
        ) {

            const parts =
                String(
                    value || ""
                )
                .split("-")
                .map(Number);


            if (
                parts.length !== 3 ||
                parts.some(
                    Number.isNaN
                )
            ) {

                return null;

            }


            const [
                year,
                month,
                day
            ] =
                parts;


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

            if (
                !dateA ||
                !dateB
            ) {

                return false;

            }


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
           HORIZONTE
        ================================================= */

        function isInsideHorizon(
            date
        ) {

            if (!date) {
                return false;
            }


            return (
                date >= horizonStart &&
                date <= horizonEnd
            );

        }


        /* =================================================
           SEGUNDA-FEIRA
        ================================================= */

        function getMonday(
            date
        ) {

            const result =
                new Date(
                    date
                );


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
           SEXTA-FEIRA
        ================================================= */

        function getFriday(
            date
        ) {

            const monday =
                getMonday(
                    date
                );


            const friday =
                new Date(
                    monday
                );


            friday.setDate(
                friday.getDate() +
                4
            );


            return friday;

        }


/* =================================================
   CARREGAR AGENDAMENTOS DO SUPABASE
================================================= */

async function loadAppointments() {

    try {

        console.log(
            "Carregando agendamentos do Supabase..."
        );


        const {
            data,
            error
        } =
            await supabaseClient

                .from(
                    "vw_agenda_compras"
                )

                .select(
                    `
                    agendamento_id,
                    regra_agendamento_id,
                    comprador_id,
                    grupo_id,
                    data_agendamento,
                    hora_inicio,
                    hora_fim,
                    grupo_codigo,
                    grupo_nome,
                    nome_visual,
                    modo_classificacao,
                    recorrente,
                    regra_ativa,
                    regra_observacao,
                    fabricante_id,
                    nome_fabricante,
                    classificacao_id,
                    classificacao_codigo,
                    classificacao_nome,
                    status,
                    status_label
                    `
                )

                .eq(
                    "comprador_id",
                    COMPRADOR_ID
                )

                .gte(
                    "data_agendamento",
                    dateToISO(
                        horizonStart
                    )
                )

                .lte(
                    "data_agendamento",
                    dateToISO(
                        horizonEnd
                    )

                )

                .order(
                    "data_agendamento",
                    {
                        ascending: true
                    }
                )

                .order(
                    "hora_inicio",
                    {
                        ascending: true
                    }
                )

                .order(
                    "nome_fabricante",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        /* =================================================
           TRANSFORMAR RETORNO DO SUPABASE
           PARA O FORMATO DO CALENDÁRIO
        ================================================= */

        appointments =
            (
                data || []
            )
            .map(
                item => {

                    return {

                        id:
                            item.agendamento_id,

                        ruleId:
                            item.regra_agendamento_id,

                        manufacturerId:
                            item.fabricante_id,

                        date:
                            item.data_agendamento,

                        time:
                            String(
                                item.hora_inicio ||
                                ""
                            )
                            .slice(
                                0,
                                5
                            ),

                        manufacturer:
                            item.nome_visual ||
                            item.nome_fabricante ||
                            "Fabricante",

                        manufacturerReal:
                            item.nome_fabricante ||
                            "",

                        group:
                            item.grupo_codigo ||
                            item.grupo_nome ||
                            "",

                        classification:
                            item.classificacao_nome ||
                            item.classificacao_codigo ||
                            "",

                        status:
                            item.status ||
                            "normal",

                        statusLabel:
                            item.status_label ||
                            "Normal",

                        observation:
                            item.regra_observacao ||
                            "",

                        mode:
                            item.modo_classificacao ||
                            "JUNTAS",

                        recurring:
                            item.recorrente === true

                    };

                }
            );


        console.log(
            "Agendamentos carregados:",
            appointments
        );


        /* =================================================
           ATUALIZAR CALENDÁRIO
        ================================================= */

        renderCurrentView();


    } catch (error) {

        console.error(
            "Erro ao carregar agendamentos:",
            error
        );


        appointments = [];


        renderCurrentView();

    }

}

        /* =================================================
           AGENDAMENTOS DO DIA
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

                            const appointmentGroup =
                                normalizeText(
                                    appointment.group
                                );


                            return filterState.groups
                                .some(
                                    selectedGroup =>
                                        normalizeText(
                                            selectedGroup
                                        ) ===
                                        appointmentGroup
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
                                            ) ===
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
                                    item ===
                                    dropdown
                                ) {

                                    return;

                                }


                                item.classList.remove(
                                    "open"
                                );


                                const otherTrigger =
                                    item.querySelector(
                                        ".agenda-filter-trigger"
                                    );


                                if (
                                    otherTrigger
                                ) {

                                    otherTrigger.setAttribute(
                                        "aria-expanded",
                                        "false"
                                    );

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
           FECHAR FILTROS AO CLICAR FORA
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
           ESC — FECHAR FILTROS
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
           BOTÃO AGRUPAR / SEPARAR
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
           TÍTULO DO PERÍODO
        ================================================= */

        function updatePeriodTitle() {

            if (!periodTitle) {
                return;
            }


            /* MÊS */

            if (
                currentView ===
                "month"
            ) {

                periodTitle.textContent =
                    `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

                return;

            }


            /* SEMANA */

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


            /* DIA */

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
                )
                .padStart(
                    2,
                    "0"
                )
                +
                "/"
                +
                String(
                    date.getMonth() + 1
                )
                .padStart(
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


            startPosition =
                startPosition === 0
                    ? 6
                    : startPosition - 1;


            let html = "";


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


            html += `
                <div class="calendar-grid">
            `;


            for (
                let i = 0;
                i < startPosition;
                i++
            ) {

                html += `

                    <div class="calendar-day previous-month">

                        <span class="calendar-day-number"></span>

                    </div>

                `;

            }


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
                                                class="calendar-appointment ${escapeHtml(appointment.status)}"
                                                data-date="${escapeHtml(appointment.date)}"
                                                title="${escapeHtml(
                                                    appointment.fullClassification ||
                                                    ""
                                                )}"
                                            >

                                                <span class="calendar-appointment-primary">
                                                    ${escapeHtml(
                                                        appointment.time
                                                    )} · ${escapeHtml(
                                                        appointment.manufacturer
                                                    )}
                                                </span>

                                                <span class="calendar-appointment-classification">
                                                    ${escapeHtml(
                                                        appointment.displayClassification ||
                                                        ""
                                                    )}
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


            const totalCells =
                startPosition +
                lastDay.getDate();


            const remaining =
                totalCells % 7 === 0
                    ? 0
                    : 7 -
                        (
                            totalCells % 7
                        );


            for (
                let i = 0;
                i < remaining;
                i++
            ) {

                html += `

                    <div class="calendar-day next-month">

                        <span class="calendar-day-number"></span>

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
                    monday.getDate() +
                    i
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
                            )
                            .filter(
                                appointment =>
                                    Number(
                                        String(
                                            appointment.time ||
                                            ""
                                        )
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
                                                    class="week-appointment ${escapeHtml(
                                                        appointment.status
                                                    )}"
                                                    title="${escapeHtml(
                                                        appointment.fullClassification ||
                                                        ""
                                                    )}"
                                                >

                                                    <strong>
                                                        ${escapeHtml(
                                                            appointment.manufacturer
                                                        )}
                                                    </strong>

                                                    <span>
                                                        ${escapeHtml(
                                                            appointment.displayClassification ||
                                                            ""
                                                        )}
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
                            ${escapeHtml(
                                weekdayNames[
                                    currentDate.getDay()
                                ].toUpperCase()
                            )}
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
                    appointmentsOfDay
                        .filter(
                            appointment =>
                                Number(
                                    String(
                                        appointment.time ||
                                        ""
                                    )
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
                                    class="day-appointment ${escapeHtml(
                                        appointment.status
                                    )}"
                                    title="${escapeHtml(
                                        appointment.fullClassification ||
                                        ""
                                    )}"
                                >

                                    <div class="day-appointment-main">

                                        <span class="day-status-dot"></span>


                                        <div>

                                            <strong>
                                                ${escapeHtml(
                                                    appointment.manufacturer
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHtml(
                                                    appointment.group
                                                )}
                                                ·
                                                ${escapeHtml(
                                                    appointment.displayClassification ||
                                                    ""
                                                )}
                                            </small>

                                        </div>

                                    </div>


                                    <span class="day-status">
                                        ${escapeHtml(
                                            appointment.statusLabel
                                        )}
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

            else if (
                currentView ===
                "week"
            ) {

                renderWeek();

            }

            else if (
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

            if (
                ![
                    "month",
                    "week",
                    "day"
                ].includes(
                    view
                )
            ) {

                return;

            }


            currentView =
                view;


            viewButtons.forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.view ===
                        view
                    );

                }
            );


            if (monthView) {

                monthView.classList.toggle(
                    "active",
                    view === "month"
                );

            }


            if (weekView) {

                weekView.classList.toggle(
                    "active",
                    view === "week"
                );

            }


            if (dayView) {

                dayView.classList.toggle(
                    "active",
                    view === "day"
                );

            }


            renderCurrentView();

        }


        /* =================================================
           LIMITES DOS BOTÕES
        ================================================= */

        function updateNavigationButtons() {

            if (
                !previousPeriod ||
                !nextPeriod
            ) {

                return;

            }


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
                    currentMonth <=
                    startMonth;


                nextPeriod.disabled =
                    currentMonth >=
                    nextMonth;


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
                    previousDay.getDate() -
                    1
                );


                const nextDay =
                    new Date(
                        currentDate
                    );


                nextDay.setDate(
                    nextDay.getDate() +
                    1
                );


                previousPeriod.disabled =
                    previousDay <
                    horizonStart;


                nextPeriod.disabled =
                    nextDay >
                    horizonEnd;


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


                const firstMonday =
                    getMonday(
                        horizonStart
                    );


                const lastMonday =
                    getMonday(
                        horizonEnd
                    );


                previousPeriod.disabled =
                    currentMonday <=
                    firstMonday;


                nextPeriod.disabled =
                    currentMonday >=
                    lastMonday;

            }

        }


        /* =================================================
           VISUALIZAÇÃO
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
                        new Date(
                            today
                        );


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

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() -
                            7
                        );


                        currentDate =
                            newDate;

                    }

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() -
                            1
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

                    else if (
                        currentView ===
                        "week"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() +
                            7
                        );


                        currentDate =
                            newDate;

                    }

                    else if (
                        currentView ===
                        "day"
                    ) {

                        const newDate =
                            new Date(
                                currentDate
                            );


                        newDate.setDate(
                            newDate.getDate() +
                            1
                        );


                        currentDate =
                            newDate;

                    }


                    renderCurrentView();

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
loadAppointments();
    }
);