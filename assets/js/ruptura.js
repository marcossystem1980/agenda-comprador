/* =========================================================
   AGENDA POR RUPTURA
   AGENDA COMPRADOR
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       COMPRADOR DE TESTE
       TEMPORÁRIO — SERÁ SUBSTITUÍDO PELO LOGIN
    ===================================================== */

    const COMPRADOR_ID =
        "c84c12af-5c2c-4734-9d2b-e075ac4cf0f2";


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const groupDropdown =
        document.getElementById("rupturaGroupDropdown");

    const groupTrigger =
        document.getElementById("rupturaGroupTrigger");

    const groupLabel =
        document.getElementById("rupturaGroupLabel");

    const groupMenu =
        document.getElementById("rupturaGroupMenu");

    const groupOptions =
        document.getElementById("rupturaGroupOptions");


    const classificationDropdown =
        document.getElementById(
            "rupturaClassificationDropdown"
        );

    const classificationTrigger =
        document.getElementById(
            "rupturaClassificationTrigger"
        );

    const classificationLabel =
        document.getElementById(
            "rupturaClassificationLabel"
        );

    const classificationMenu =
        document.getElementById(
            "rupturaClassificationMenu"
        );

    const classificationOptions =
        document.getElementById(
            "rupturaClassificationOptions"
        );


    const situationFilter =
        document.getElementById(
            "rupturaSituationFilter"
        );

    const searchInput =
        document.getElementById(
            "rupturaSearch"
        );

    const clearFiltersButton =
        document.getElementById(
            "clearRupturaFilters"
        );

    const consolidateCheckbox =
        document.getElementById(
            "rupturaShowAllClassifications"
        );


    const tableBody =
        document.getElementById(
            "rupturaTableBody"
        );

    const emptyState =
        document.getElementById(
            "rupturaEmptyState"
        );

    const resultsCount =
        document.getElementById(
            "rupturaResultsCount"
        );


    const referenceElement =
        document.getElementById(
            "rupturaReference"
        );

    const totalRecordsElement =
        document.getElementById(
            "totalRecords"
        );

    const scheduledRecordsElement =
        document.getElementById(
            "scheduledRecords"
        );

    const outsideRecordsElement =
        document.getElementById(
            "outsideRecords"
        );

    const criticalRecordsElement =
        document.getElementById(
            "criticalRecords"
        );


    /* =====================================================
       ESTADO
    ===================================================== */

let operationalRows = [];

let agendaRows = [];

let agendaIndex = new Map();

let decisionRows = [];

let decisionIndex = new Map();

let currentDisplayRows = [];

/* =====================================================
   ORDENAÇÃO DA TABELA
===================================================== */

let currentSort = {
    key: "manufacturer",
    direction: "asc"
};

/*
 * Guarda a combinação aberta a partir da Ruptura.
 * O status só será alterado depois que o evento agenda:updated
 * confirmar que uma nova ocorrência dessa combinação apareceu no banco.
 */
let pendingRuptureAddition = null;
let handlingAgendaUpdate = false;

    let allGroupsSelected = true;

    let allClassificationsSelected = true;

    const selectedGroups = new Set();

    const selectedClassifications = new Set();


    /* =====================================================
       CLASSIFICAÇÕES OFICIAIS
    ===================================================== */

    const classificationLabels = {

        "PROPAGADO": "Propagado",
        "PERFUMARIA": "Perfumaria",
        "FRALDAS": "Fraldas",
        "LEITES": "Leites",
        "CONVENIENCIA": "Conveniência",
        "VAREJO": "Varejo",
        "PBM": "PBM",
        "SIMILARES": "Similares",
        "GENERICOS": "Genéricos",
        "SUPLEMENTOS": "Suplementos",
        "NOSSAS MARCAS": "Nossas Marcas",
        "PERFUMES": "Perfumes",
        "DERMOCOSMETICOS": "Dermocosméticos"

    };


    /* =====================================================
       FORMATADORES
    ===================================================== */

    const numberFormatter =
        new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 2
        });

    const currencyFormatter =
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        });


    function formatNumber(value, decimals = 2) {

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: decimals
        }).format(number);

    }


    function formatCurrency(value) {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return "—";
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return currencyFormatter.format(number);

    }


    /* =====================================================
       CLASSIFICAÇÃO FINANCEIRA DA RUPTURA
       Baseada somente no valor total em reais do fabricante.
    ===================================================== */

    function getFinancialRisk(value) {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return {
                level: "no-data",
                label: "Sem dado",
                description: "Não há valor financeiro válido para classificar."
            };
        }

        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return {
                level: "no-data",
                label: "Sem dado",
                description: "Não há valor financeiro válido para classificar."
            };
        }

        if (amount <= 0) {
            return {
                level: "no-positive",
                label: "Sem valor positivo",
                description: "O valor de ruptura não é positivo; não recebe faixa de risco financeiro."
            };
        }

        if (amount <= 50) {
            return {
                level: "low",
                label: "Baixo impacto",
                description: "Ruptura positiva de até R$ 50,00."
            };
        }

        if (amount <= 250) {
            return {
                level: "attention",
                label: "Atenção",
                description: "Ruptura acima de R$ 50,00 e até R$ 250,00."
            };
        }

        if (amount <= 1000) {
            return {
                level: "high",
                label: "Alto impacto",
                description: "Ruptura acima de R$ 250,00 e até R$ 1.000,00."
            };
        }

        return {
            level: "critical",
            label: "Crítico",
            description: "Ruptura financeira acima de R$ 1.000,00."
        };

    }


    function normalizeText(value) {

        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();

    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getClassificationLabel(code) {

        const normalized =
            normalizeText(code);

        return classificationLabels[normalized]
            || code
            || "Sem classificação";

    }


    function getTodayISO() {

        const now = new Date();

        const year = now.getFullYear();

        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            now.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const parts =
            String(value).split("-");

        if (parts.length !== 3) {
            return "—";
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

    }


    function formatDateTime(appointment) {

        if (!appointment) {
            return "—";
        }

        const date =
            formatDate(appointment.date);

        const time =
            appointment.time || "";

        return time
            ? `${date} às ${time}`
            : date;

    }


    function showTableMessage(message) {

        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="ruptura-table-message"
                    >
                        ${escapeHtml(message)}
                    </td>
                </tr>
            `;

        }

        if (emptyState) {
            emptyState.hidden = true;
        }

    }


    /* =====================================================
       VALIDAR SE A OCORRÊNCIA AINDA ESTÁ NO FUTURO
    ===================================================== */

    function isAppointmentFuture(date, time) {

        if (!date || !time) {
            return false;
        }

        const [year, month, day] =
            String(date)
                .split("-")
                .map(Number);

        const [hours, minutes] =
            String(time)
                .slice(0, 5)
                .split(":")
                .map(Number);

        if (
            !year ||
            !month ||
            !day ||
            !Number.isFinite(hours) ||
            !Number.isFinite(minutes)
        ) {
            return false;
        }

        const appointmentDate =
            new Date(
                year,
                month - 1,
                day,
                hours,
                minutes,
                0,
                0
            );

        return appointmentDate.getTime() > Date.now();

    }


    /* =====================================================
       CHAVE DE UMA COMBINAÇÃO OPERACIONAL
    ===================================================== */

    function getScopeKey(row) {

        return [
            row.grupo_id,
            row.classificacao_id,
            row.fabricante_id
        ].join("|");

    }

    /* =====================================================
   CHAVE DA DECISÃO DO COMPRADOR
===================================================== */

function getDecisionKey(row) {

    return [
        COMPRADOR_ID,
        row.grupo_id,
        row.classificacao_id,
        row.fabricante_id
    ].join("|");

}


/* =====================================================
   INDEXAR DECISÕES CARREGADAS DO SUPABASE
===================================================== */

function buildDecisionIndex() {

    decisionIndex = new Map();

    decisionRows.forEach(decision => {

        decisionIndex.set(
            getDecisionKey(decision),
            decision
        );

    });

}


    /* =====================================================
       CARREGAR ÍNDICE DA AGENDA
    ===================================================== */

    function buildAgendaIndex() {

        agendaIndex = new Map();


        agendaRows.forEach(item => {

            const time =
                String(
                    item.hora_inicio || ""
                ).slice(0, 5);


            if (
                !item.grupo_id ||
                !item.classificacao_id ||
                !item.fabricante_id ||
                !item.data_agendamento ||
                !time
            ) {
                return;
            }


            /*
             * Ignora ocorrências que já passaram,
             * inclusive as de hoje cujo horário venceu.
             */

            if (
                !isAppointmentFuture(
                    item.data_agendamento,
                    time
                )
            ) {
                return;
            }


            const key =
                getScopeKey({
                    grupo_id: item.grupo_id,
                    classificacao_id:
                        item.classificacao_id,
                    fabricante_id:
                        item.fabricante_id
                });


            if (!agendaIndex.has(key)) {
                agendaIndex.set(key, []);
            }


            const existing =
                agendaIndex.get(key);


            const duplicate =
                existing.some(appointment =>
                    appointment.date ===
                        item.data_agendamento
                    &&
                    appointment.time === time
                );


            if (duplicate) {
                return;
            }


            existing.push({

                id: item.agendamento_id,

                date: item.data_agendamento,

                time,

                visualName:
                    item.nome_visual || "",

                manufacturer:
                    item.nome_fabricante || "",

                observation:
                    item.regra_observacao || ""

            });

        });


        agendaIndex.forEach(list => {

            list.sort((a, b) => {

                const dateCompare =
                    a.date.localeCompare(b.date);

                if (dateCompare !== 0) {
                    return dateCompare;
                }

                return a.time.localeCompare(b.time);

            });

        });

    }


    /* =====================================================
       DISPONIBILIZAR GRUPOS E CLASSIFICAÇÕES
    ===================================================== */

    function getAvailableGroups() {

        return [
            ...new Set(
                operationalRows.map(row =>
                    String(row.grupo_codigo || "")
                        .trim()
                        .toUpperCase()
                )
                .filter(Boolean)
            )
        ].sort();

    }


    function getAvailableClassifications() {

        return [
            ...new Set(
                operationalRows.map(row =>
                    String(
                        row.classificacao_codigo || ""
                    )
                    .trim()
                    .toUpperCase()
                )
                .filter(Boolean)
            )
        ].sort((a, b) =>
            getClassificationLabel(a).localeCompare(
                getClassificationLabel(b),
                "pt-BR"
            )
        );

    }


    /* =====================================================
       RENDERIZAR OPÇÕES DOS FILTROS
    ===================================================== */

    function renderFilterOptions(
        type,
        values,
        optionsContainer,
        allLabel
    ) {

        if (!optionsContainer) {
            return;
        }


        const isGroup =
            type === "groups";


        const allSelected =
            isGroup
                ? allGroupsSelected
                : allClassificationsSelected;


        const selectedSet =
            isGroup
                ? selectedGroups
                : selectedClassifications;


        const name =
            isGroup
                ? "rupturaGroupOption"
                : "rupturaClassificationOption";


        let html = `

            <label class="ruptura-multiselect-option">

                <input
                    type="checkbox"
                    name="${name}"
                    value="__all__"
                    ${allSelected ? "checked" : ""}
                >

                <span>
                    ${escapeHtml(allLabel)}
                </span>

            </label>

            <div class="ruptura-multiselect-divider"></div>

        `;


        values.forEach(value => {

            const checked =
                !allSelected &&
                selectedSet.has(value);


            const label =
                isGroup
                    ? value
                    : getClassificationLabel(value);


            html += `

                <label class="ruptura-multiselect-option">

                    <input
                        type="checkbox"
                        name="${name}"
                        value="${escapeHtml(value)}"
                        ${checked ? "checked" : ""}
                    >

                    <span>
                        ${escapeHtml(label)}
                    </span>

                </label>

            `;

        });


        optionsContainer.innerHTML = html;

    }


    function refreshFilterOptions() {

        renderFilterOptions(
            "groups",
            getAvailableGroups(),
            groupOptions,
            "Todos os grupos"
        );


        renderFilterOptions(
            "classifications",
            getAvailableClassifications(),
            classificationOptions,
            "Todas as classificações"
        );


        updateFilterLabels();

    }


    /* =====================================================
       ATUALIZAR RÓTULOS DOS FILTROS
    ===================================================== */

    function updateFilterLabels() {

        if (groupLabel) {

            if (allGroupsSelected) {

                groupLabel.textContent =
                    "Todos os grupos";

            } else if (
                selectedGroups.size === 1
            ) {

                groupLabel.textContent =
                    [...selectedGroups][0];

            } else {

                groupLabel.textContent =
                    `${selectedGroups.size} grupos selecionados`;

            }

        }


        if (classificationLabel) {

            if (allClassificationsSelected) {

                classificationLabel.textContent =
                    "Todas as classificações";

            } else if (
                selectedClassifications.size === 1
            ) {

                classificationLabel.textContent =
                    getClassificationLabel(
                        [...selectedClassifications][0]
                    );

            } else {

                classificationLabel.textContent =
                    `${selectedClassifications.size} classificações`;

            }

        }

    }

    /* =====================================================
   GARANTIR OPÇÕES DE DECISÃO NO FILTRO
===================================================== */

function ensureSituationOptions() {

    if (!situationFilter) {
        return;
    }

const options = [
    ["awaiting", "Aguardando"],
    ["partial-awaiting", "Parcialmente aguardando"],
    ["added", "Adicionada à agenda"],
    ["partial-added", "Parcialmente adicionada à agenda"]
];

    options.forEach(([value, label]) => {

        const exists =
            Array.from(situationFilter.options)
                .some(option => option.value === value);

        if (!exists) {

            situationFilter.add(
                new Option(label, value)
            );

        }

    });

}


    /* =====================================================
       ABRIR E FECHAR DROPDOWNS
    ===================================================== */

    function closeDropdowns() {

        [
            {
                dropdown: groupDropdown,
                trigger: groupTrigger,
                menu: groupMenu
            },
            {
                dropdown: classificationDropdown,
                trigger: classificationTrigger,
                menu: classificationMenu
            }
        ].forEach(item => {

            if (item.dropdown) {
                item.dropdown.classList.remove("open");
            }

            if (item.trigger) {
                item.trigger.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            if (item.menu) {
                item.menu.hidden = true;
            }

        });

    }


    function toggleDropdown(
        dropdown,
        trigger,
        menu
    ) {

        if (!dropdown || !trigger || !menu) {
            return;
        }

        const shouldOpen =
            menu.hidden;

        closeDropdowns();


        if (shouldOpen) {

            menu.hidden = false;

            dropdown.classList.add("open");

            trigger.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    if (groupTrigger) {

        groupTrigger.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleDropdown(
                    groupDropdown,
                    groupTrigger,
                    groupMenu
                );

            }
        );

    }


    if (classificationTrigger) {

        classificationTrigger.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleDropdown(
                    classificationDropdown,
                    classificationTrigger,
                    classificationMenu
                );

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".ruptura-multiselect"
                )
            ) {

                closeDropdowns();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeDropdowns();
                closeDetailsModal();
            }

        }
    );


    /* =====================================================
       MUDANÇAS NAS SELEÇÕES DE GRUPO
    ===================================================== */

    if (groupOptions) {

        groupOptions.addEventListener(
            "change",
            event => {

                const input =
                    event.target.closest(
                        'input[type="checkbox"]'
                    );

                if (!input) {
                    return;
                }


                if (input.value === "__all__") {

                    allGroupsSelected =
                        input.checked;

                    selectedGroups.clear();


                    if (!input.checked) {
                        allGroupsSelected = true;
                    }

                } else {

                    if (input.checked) {

                        selectedGroups.add(
                            input.value
                        );

                        allGroupsSelected = false;

                    } else {

                        selectedGroups.delete(
                            input.value
                        );

                        if (
                            selectedGroups.size === 0
                        ) {

                            allGroupsSelected = true;

                        }

                    }

                }


                refreshFilterOptions();

                renderTable();

            }
        );

    }


    /* =====================================================
       MUDANÇAS NAS SELEÇÕES DE CLASSIFICAÇÃO
    ===================================================== */

    if (classificationOptions) {

        classificationOptions.addEventListener(
            "change",
            event => {

                const input =
                    event.target.closest(
                        'input[type="checkbox"]'
                    );

                if (!input) {
                    return;
                }


                if (input.value === "__all__") {

                    allClassificationsSelected =
                        input.checked;

                    selectedClassifications.clear();


                    if (!input.checked) {
                        allClassificationsSelected = true;
                    }

                } else {

                    if (input.checked) {

                        selectedClassifications.add(
                            input.value
                        );

                        allClassificationsSelected = false;

                    } else {

                        selectedClassifications.delete(
                            input.value
                        );

                        if (
                            selectedClassifications.size === 0
                        ) {

                            allClassificationsSelected = true;

                        }

                    }

                }


                refreshFilterOptions();

                renderTable();

            }
        );

    }


    /* =====================================================
       PEGAR DADOS OPERACIONAIS CONFORME OS FILTROS
    ===================================================== */

    function getFilteredOperationalRows() {

        const search =
            normalizeText(
                searchInput
                    ? searchInput.value
                    : ""
            );


        return operationalRows.filter(row => {

            const group =
                String(
                    row.grupo_codigo || ""
                )
                .trim()
                .toUpperCase();


            const classification =
                String(
                    row.classificacao_codigo || ""
                )
                .trim()
                .toUpperCase();


            const manufacturer =
                normalizeText(
                    row.fabricante_nome
                );


            if (
                !allGroupsSelected &&
                !selectedGroups.has(group)
            ) {
                return false;
            }


            if (
                !allClassificationsSelected &&
                !selectedClassifications.has(
                    classification
                )
            ) {
                return false;
            }


            if (
                search &&
                !manufacturer.includes(search)
            ) {
                return false;
            }


            return true;

        });

    }


    /* =====================================================
       AGRUPAR CURVAS
    ===================================================== */

    function getCombinedCurve(rows, key) {

        const values = [
            ...new Set(
                rows.map(row =>
                    String(row[key] || "").trim()
                )
                .filter(Boolean)
            )
        ];


        if (values.length === 0) {
            return "—";
        }


        if (values.length === 1) {
            return values[0];
        }


        return "Mista";

    }


    /* =====================================================
       NÚMEROS AGREGADOS
    ===================================================== */

    function sumField(rows, field) {

        return rows.reduce(
            (total, row) => {

                const value =
                    Number(row[field]);

                return total +
                    (
                        Number.isFinite(value)
                            ? value
                            : 0
                    );

            },
            0
        );

    }


    function sumAvailableNumericField(rows, field) {

        const values = rows
            .map(row => row[field])
            .filter(value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            )
            .map(Number)
            .filter(Number.isFinite);

        if (values.length === 0) {
            return null;
        }

        return values.reduce((total, value) => total + value, 0);

    }


    function getMaxDaysWithoutStock(rows) {

        const values =
            rows.map(row =>
                Number(row.dias_sem_estoque)
            )
            .filter(Number.isFinite);


        return values.length
            ? Math.max(...values)
            : null;

    }


/* =====================================================
   SITUAÇÃO DO AGENDAMENTO E DECISÃO DO COMPRADOR
===================================================== */

function getAppointmentCoverage(rows) {

    const scopes = rows.map(row => {

        const key = getScopeKey(row);

        const appointmentsForScope =
            agendaIndex.get(key) || [];

        const decision =
            decisionIndex.get(
                getDecisionKey(row)
            ) || null;

        return {
            row,
            appointments: appointmentsForScope,
            decision
        };

    });


    const covered =
        scopes.filter(scope =>
            scope.appointments.length > 0
        );


    let agendaStatus;

    let agendaStatusLabel;


    if (covered.length === 0) {

        agendaStatus = "outside";

        agendaStatusLabel = "Fora da agenda";

    } else if (
        covered.length === scopes.length
    ) {

        agendaStatus = "scheduled";

        agendaStatusLabel = "Agendado";

    } else {

        agendaStatus = "partial";

        agendaStatusLabel = "Parcialmente agendado";

    }


    /*
     * A decisão é verificada separadamente em cada
     * combinação operacional.
     */

/*
 * O status principal é exclusivamente a situação REAL da agenda.
 * Decisões persistentes como "aguardar" ou "adicionada_agenda"
 * não podem substituir "Fora da agenda", "Agendado" ou
 * "Parcialmente agendado".
 *
 * Assim, excluir a última ocorrência faz a situação voltar
 * automaticamente para "Fora da agenda", sem apagar a decisão
 * que o comprador registrou separadamente.
 */
const awaitingScopes =
    scopes.filter(scope =>
        scope.decision?.status_decisao === "aguardar"
    );

const status = agendaStatus;
const statusLabel = agendaStatusLabel;


    const allAppointments =
        scopes.flatMap(scope =>
            scope.appointments
        );


    allAppointments.sort((a, b) => {

        const dateCompare =
            a.date.localeCompare(b.date);

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return a.time.localeCompare(b.time);

    });


    return {

        status,

        statusLabel,

        agendaStatus,

        agendaStatusLabel,

        scheduledScopes:
            covered.length,

        totalScopes:
            scopes.length,

        awaitingScopes:
            awaitingScopes.length,

        nextAppointment:
            allAppointments[0] || null,

        scopes

    };

}

    /* =====================================================
       CONSOLIDAR POR FABRICANTE
    ===================================================== */

    function buildManufacturerRows(rows) {

        const mergeAcrossGroups =
            consolidateCheckbox
                ? consolidateCheckbox.checked
                : true;


        const groups = new Map();


        rows.forEach(row => {

            const manufacturerKey =
                normalizeText(
                    row.fabricante_nome
                );


            const groupKey =
                mergeAcrossGroups
                    ? manufacturerKey
                    : `${row.grupo_codigo}|${manufacturerKey}`;


            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }


            groups.get(groupKey).push(row);

        });


        const result = [];


        groups.forEach((sourceRows, key) => {

            const first =
                sourceRows[0];


            const manufacturerGroups = [
                ...new Set(
                    sourceRows.map(row =>
                        String(
                            row.grupo_codigo || ""
                        ).trim()
                    )
                )
            ].sort();


            const classifications = [
                ...new Set(
                    sourceRows.map(row =>
                        String(
                            row.classificacao_codigo || ""
                        ).trim().toUpperCase()
                    )
                )
            ]
            .filter(Boolean)
            .sort((a, b) =>
                getClassificationLabel(a).localeCompare(
                    getClassificationLabel(b),
                    "pt-BR"
                )
            );


            const coverage =
                getAppointmentCoverage(sourceRows);


            result.push({

                key,

                manufacturer:
                    first.fabricante_nome,

                manufacturerKey:
                    normalizeText(
                        first.fabricante_nome
                    ),

                groups:
                    manufacturerGroups,

                classifications,

                sourceRows,

                curvesQty:
                    getCombinedCurve(
                        sourceRows,
                        "curva_qtd"
                    ),

                curvesValue:
                    getCombinedCurve(
                        sourceRows,
                        "curva_valor"
                    ),

                totalSold:
                    sumField(
                        sourceRows,
                        "total_vendido"
                    ),

                daysWithoutStock:
                    getMaxDaysWithoutStock(
                        sourceRows
                    ),

                ruptureQuantity:
                    sumField(
                        sourceRows,
                        "ruptura_quantidade"
                    ),

                ruptureValue:
                    sumAvailableNumericField(
                        sourceRows,
                        "ruptura_valor"
                    ),

                ...coverage

            });

        });


        return result.sort((a, b) =>
            a.manufacturer.localeCompare(
                b.manufacturer,
                "pt-BR"
            )
        );

    }


/* =====================================================
   APLICAR FILTRO DE SITUAÇÃO
===================================================== */

function applySituationFilter(rows) {

    const value =
        situationFilter
            ? situationFilter.value
            : "all";


    if (value === "all") {
        return rows;
    }


    /*
     * Este filtro representa exclusivamente a situação da agenda.
     * Decisões do comprador são exibidas no painel de detalhes e
     * não entram no filtro de situação da agenda.
     */
    return rows.filter(row =>
        row.agendaStatus === value
    );

}

/* =====================================================
   ORDENAÇÃO DINÂMICA DAS COLUNAS
===================================================== */

const sortableHeaderDefinitions = [

    {
        key: "manufacturer",
        title: "Fabricante"
    },

    {
        key: "curvesQty",
        title: "Curva Qtd."
    },

    {
        key: "curvesValue",
        title: "Curva Valor"
    },

    {
        key: "totalSold",
        title: "Total vendido"
    },

    {
        key: "daysWithoutStock",
        title: "Dias sem estoque"
    },

    {
        key: "ruptureQuantity",
        title: "Ruptura Qtd."
    },

    {
        key: "ruptureValue",
        title: "Ruptura Valor"
    },

    {
        key: "statusLabel",
        title: "Situação"
    },

    {
        key: "nextAppointment",
        title: "Próximo agendamento"
    }

];


/* =====================================================
   VALOR USADO PARA COMPARAR CADA COLUNA
===================================================== */

function getSortValue(row, key) {

    switch (key) {

        case "manufacturer":
            return row.manufacturer || "";

        case "curvesQty":
            return row.curvesQty || "";

        case "curvesValue":
            return row.curvesValue || "";

        case "totalSold":
            return row.totalSold;

        case "daysWithoutStock":
            return row.daysWithoutStock;

        case "ruptureQuantity":
            return row.ruptureQuantity;

        case "ruptureValue":
            return row.ruptureValue;

        case "statusLabel":
            return row.statusLabel || "";

        case "nextAppointment":

            if (!row.nextAppointment) {
                return null;
            }

            return (
                `${row.nextAppointment.date || ""}T` +
                `${row.nextAppointment.time || ""}`
            );

        default:
            return "";
    }

}


/* =====================================================
   IDENTIFICAR VALORES VAZIOS
   VALORES VAZIOS FICAM NO FINAL DA LISTA
===================================================== */

function isMissingSortValue(value) {

    return (
        value === null ||
        value === undefined ||
        (
            typeof value === "string" &&
            (
                value.trim() === "" ||
                value.trim() === "—"
            )
        )
    );

}


/* =====================================================
   ORDENAR OS REGISTROS
===================================================== */

function sortDisplayRows(rows) {

    const {
        key,
        direction
    } = currentSort;

    const directionMultiplier =
        direction === "asc" ? 1 : -1;


    return [...rows].sort((rowA, rowB) => {

        const valueA =
            getSortValue(rowA, key);

        const valueB =
            getSortValue(rowB, key);


        const missingA =
            isMissingSortValue(valueA);

        const missingB =
            isMissingSortValue(valueB);


        /*
         * Valores não preenchidos permanecem no final,
         * tanto na ordem crescente quanto na decrescente.
         */

        if (missingA && missingB) {
            return 0;
        }

        if (missingA) {
            return 1;
        }

        if (missingB) {
            return -1;
        }


        let comparison = 0;


        /*
         * Indicadores numéricos:
         * vendidos, dias sem estoque e ruptura.
         */

        if (
            [
                "totalSold",
                "daysWithoutStock",
                "ruptureQuantity",
                "ruptureValue"
            ].includes(key)
        ) {

            const numberA = Number(valueA);
            const numberB = Number(valueB);

            comparison =
                numberA - numberB;

        } else {

            /*
             * Fabricante, curvas, situação e data.
             * A data está no formato AAAA-MM-DDTHH:mm,
             * permitindo comparação cronológica.
             */

            comparison =
                String(valueA).localeCompare(
                    String(valueB),
                    "pt-BR",
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );

        }


        return comparison * directionMultiplier;

    });

}


/* =====================================================
   ATUALIZAR INDICADORES VISUAIS
===================================================== */

function updateSortIndicators() {

    if (!tableBody) {
        return;
    }

    const table =
        tableBody.closest("table");

    const headers =
        table?.querySelectorAll("thead th");


    if (!headers) {
        return;
    }


    sortableHeaderDefinitions.forEach(
        (definition, index) => {

            const header = headers[index];

            if (!header) {
                return;
            }


            const indicator =
                header.querySelector(
                    ".ruptura-sort-indicator"
                );


            if (!indicator) {
                return;
            }


            if (currentSort.key === definition.key) {

                indicator.textContent =
                    currentSort.direction === "asc"
                        ? "↑"
                        : "↓";

                header.setAttribute(
                    "aria-sort",
                    currentSort.direction === "asc"
                        ? "ascending"
                        : "descending"
                );

            } else {

                indicator.textContent = "↕";

                header.setAttribute(
                    "aria-sort",
                    "none"
                );

            }

        }
    );

}


/* =====================================================
   PREPARAR CABEÇALHOS CLICÁVEIS
===================================================== */

function setupSortableHeaders() {

    if (!tableBody) {
        return;
    }


    const table =
        tableBody.closest("table");

    const headers =
        table?.querySelectorAll("thead th");


    if (!headers || headers.length === 0) {

        console.warn(
            "Cabeçalho da tabela de ruptura não encontrado."
        );

        return;
    }


    sortableHeaderDefinitions.forEach(
        (definition, index) => {

            const header = headers[index];

            if (!header) {
                return;
            }


            header.classList.add(
                "ruptura-sortable"
            );

            header.dataset.sortKey =
                definition.key;

            header.title =
                `Clique para ordenar por ${definition.title}`;


            /*
             * Permite acessar o cabeçalho pelo teclado.
             */

            header.tabIndex = 0;


            let indicator =
                header.querySelector(
                    ".ruptura-sort-indicator"
                );


            if (!indicator) {

                indicator =
                    document.createElement("span");

                indicator.className =
                    "ruptura-sort-indicator";

                indicator.setAttribute(
                    "aria-hidden",
                    "true"
                );

                header.appendChild(indicator);

            }


            header.addEventListener(
                "click",
                () => {

                    if (
                        currentSort.key ===
                        definition.key
                    ) {

                        /*
                         * Clicar novamente na mesma coluna
                         * inverte a direção da ordenação.
                         */

                        currentSort.direction =
                            currentSort.direction === "asc"
                                ? "desc"
                                : "asc";

                    } else {

                        /*
                         * Ao escolher outra coluna,
                         * começar do menor para o maior
                         * ou de A a Z.
                         */

                        currentSort.key =
                            definition.key;

                        currentSort.direction = "asc";

                    }


                    updateSortIndicators();

                    renderTable();

                }
            );


            header.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        header.click();

                    }

                }
            );

        }
    );


    updateSortIndicators();

}


    /* =====================================================
       INDICADORES
    ===================================================== */

    function renderSummary(
        sourceRows,
        displayRows
    ) {

        if (totalRecordsElement) {

            totalRecordsElement.textContent =
                numberFormatter.format(
                    sourceRows.length
                );

        }


if (scheduledRecordsElement) {

    scheduledRecordsElement.textContent =
        numberFormatter.format(
            displayRows.filter(row =>
                row.agendaStatus !== "outside"
            ).length
        );

}


if (outsideRecordsElement) {

    outsideRecordsElement.textContent =
        numberFormatter.format(
            displayRows.filter(row =>
                row.agendaStatus === "outside"
            ).length
        );

}


        /*
         * Considera risco financeiro elevado quando o total
         * consolidado do fabricante ultrapassa R$ 250,00.
         * A contagem segue os filtros ativos e a consolidação atual.
         */

        if (criticalRecordsElement) {

            const elevatedRiskCount = displayRows.filter(row =>
                Number.isFinite(row.ruptureValue) &&
                row.ruptureValue > 250
            ).length;

            criticalRecordsElement.textContent =
                numberFormatter.format(elevatedRiskCount);

            const summaryCard =
                criticalRecordsElement.closest(".ruptura-summary-card");

            const summaryLabel =
                summaryCard?.querySelector(".ruptura-summary-label");

            const summaryDescription =
                summaryCard?.querySelector("small");

            if (summaryLabel) {
                summaryLabel.textContent = "Risco financeiro elevado";
            }

            if (summaryDescription) {
                summaryDescription.textContent =
                    "Fabricantes com ruptura acima de R$ 250,00";
            }

        }

    }


    /* =====================================================
       LEGENDA DA ESCALA FINANCEIRA
       Inserida uma única vez, sem modificar a estrutura do HTML.
    ===================================================== */

    function ensureFinancialRiskLegend() {

        if (document.getElementById("rupturaRiskLegend")) {
            return;
        }

        const tableWrapper =
            document.querySelector(".ruptura-table-wrapper");

        if (!tableWrapper || !tableWrapper.parentNode) {
            return;
        }

        const legend = document.createElement("section");
        legend.id = "rupturaRiskLegend";
        legend.className = "ruptura-risk-legend";
        legend.setAttribute("aria-label", "Legenda de risco financeiro da ruptura");
        legend.innerHTML = `
            <div class="ruptura-risk-legend-heading">
                <strong>Classificação financeira da ruptura</strong>
                <span>Calculada pelo valor total de ruptura do fabricante na visão selecionada.</span>
            </div>
            <div class="ruptura-risk-legend-items">
                <div class="ruptura-risk-legend-item">
                    <span class="ruptura-financial-risk ruptura-financial-risk--low">Baixo impacto</span>
                    <span>Até R$ 50,00</span>
                </div>
                <div class="ruptura-risk-legend-item">
                    <span class="ruptura-financial-risk ruptura-financial-risk--attention">Atenção</span>
                    <span>Acima de R$ 50 até R$ 250</span>
                </div>
                <div class="ruptura-risk-legend-item">
                    <span class="ruptura-financial-risk ruptura-financial-risk--high">Alto impacto</span>
                    <span>Acima de R$ 250 até R$ 1.000</span>
                </div>
                <div class="ruptura-risk-legend-item">
                    <span class="ruptura-financial-risk ruptura-financial-risk--critical">Crítico</span>
                    <span>Acima de R$ 1.000</span>
                </div>
            </div>
            <p class="ruptura-risk-legend-note">Valores ausentes ou não positivos são identificados separadamente e não recebem faixa positiva de risco.</p>
        `;

        tableWrapper.parentNode.insertBefore(legend, tableWrapper);

    }


    /* =====================================================
       RENDERIZAR TABELA
    ===================================================== */

    function renderTable() {

        const filteredSourceRows =
            getFilteredOperationalRows();


        const consolidatedRows =
            buildManufacturerRows(
                filteredSourceRows
            );


const filteredDisplayRows =
    applySituationFilter(
        consolidatedRows
    );


const displayRows =
    sortDisplayRows(
        filteredDisplayRows
    );


currentDisplayRows =
    displayRows;


        renderSummary(
            filteredSourceRows,
            displayRows
        );


        if (resultsCount) {

            resultsCount.textContent =
                `${displayRows.length} fabricantes · ` +
                `${filteredSourceRows.length} combinações operacionais`;

        }


        if (!tableBody) {
            return;
        }


        if (displayRows.length === 0) {

            tableBody.innerHTML = "";

            if (emptyState) {
                emptyState.hidden = false;
            }

            return;

        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        tableBody.innerHTML =
            displayRows.map((row, index) => {

                const groupText =
                    row.groups.join(", ");


                const classText =
                    row.classifications
                        .map(getClassificationLabel)
                        .join(" • ");


                const metaText =
                    [
                        `Grupos: ${groupText || "—"}`,
                        `Classificações: ${classText || "—"}`
                    ]
                    .join(" · ");


                const nextAppointment =
                    row.nextAppointment
                        ? formatDateTime(
                            row.nextAppointment
                        )
                        : "—";

                const financialRisk =
                    getFinancialRisk(row.ruptureValue);


                return `

                    <tr>

                        <td class="manufacturer-cell">

                            <span class="ruptura-manufacturer-name">
                                ${escapeHtml(row.manufacturer)}
                            </span>

                            <small class="ruptura-manufacturer-meta">
                                ${escapeHtml(metaText)}
                            </small>

                        </td>

                        <td>
                            ${escapeHtml(row.curvesQty)}
                        </td>

                        <td>
                            ${escapeHtml(row.curvesValue)}
                        </td>

                        <td class="numeric">
                            ${formatNumber(row.totalSold)}
                        </td>

                        <td class="numeric">
                            ${row.daysWithoutStock === null
                                ? "—"
                                : formatNumber(
                                    row.daysWithoutStock,
                                    1
                                )
                            }
                        </td>

                        <td class="numeric">
                            ${formatNumber(row.ruptureQuantity)}
                        </td>

                        <td class="numeric ruptura-financial-value-cell">
                            <div class="ruptura-financial-value-wrap">
                                <strong class="ruptura-financial-amount">
                                    ${formatCurrency(row.ruptureValue)}
                                </strong>
                                <span
                                    class="ruptura-financial-risk ruptura-financial-risk--${financialRisk.level}"
                                    title="${escapeHtml(financialRisk.description)}"
                                >
                                    ${escapeHtml(financialRisk.label)}
                                </span>
                            </div>
                        </td>

                        <td>
                            <span class="ruptura-status ${escapeHtml(row.status)}">
                                ${escapeHtml(row.statusLabel)}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(nextAppointment)}
                        </td>

                        <td class="action-cell">

                            <button
                                type="button"
                                class="ruptura-action-button"
                                data-row-index="${index}"
                            >
                                Detalhes
                            </button>

                        </td>

                    </tr>

                `;

            }).join("");

    }


    /* =====================================================
       MODAL DE DETALHES
    ===================================================== */

    function ensureDetailsModal() {

        let modal =
            document.getElementById(
                "rupturaDetailsOverlay"
            );


        if (modal) {
            return modal;
        }


        modal =
            document.createElement("div");


        modal.id =
            "rupturaDetailsOverlay";


        modal.className =
            "ruptura-details-overlay";


        modal.hidden = true;


        modal.innerHTML = `

            <section
                class="ruptura-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rupturaDetailsTitle"
            >

                <header class="ruptura-details-header">

                    <div>

                        <h2 id="rupturaDetailsTitle">
                            Detalhes do fabricante
                        </h2>

                        <p id="rupturaDetailsSubtitle"></p>
                        <div id="rupturaDetailsFinancialRisk" class="ruptura-details-financial-risk"></div>

                    </div>

                    <button
                        type="button"
                        class="ruptura-details-close"
                        data-close-details
                        aria-label="Fechar detalhes"
                    >
                        ×
                    </button>

                </header>


                <div class="ruptura-details-content">

                    <h3>
                        Combinações operacionais
                    </h3>

                    <div
                        class="ruptura-details-list"
                        id="rupturaDetailsList"
                    ></div>

                    <div class="ruptura-details-note">

                        A antecipação altera somente a ocorrência
                        e a combinação selecionadas. A regra
                        recorrente e as demais combinações
                        permanecem preservadas.

                    </div>

                </div>

            </section>

        `;


        document.body.appendChild(modal);


        /* =================================================
           EVENTOS DO MODAL
        ================================================= */

        modal.addEventListener("click", event => {

            if (
                event.target === modal ||
                event.target.closest("[data-close-details]")
            ) {

                closeDetailsModal();

                return;

            }

            /* =================================================
               ABRIR A CAIXA PADRÃO DE NOVO AGENDAMENTO
            ================================================= */

            const addToAgendaButton =
                event.target.closest("[data-add-to-agenda]");

            if (addToAgendaButton) {

                const prefill = {
                    grupoId: addToAgendaButton.dataset.groupId,
                    classificacaoId: addToAgendaButton.dataset.classificationId,
                    fabricanteId: addToAgendaButton.dataset.manufacturerId,
                    fabricanteNome: addToAgendaButton.dataset.manufacturerName
                };

                if (
                    !prefill.grupoId ||
                    !prefill.classificacaoId ||
                    !prefill.fabricanteId
                ) {
                    window.alert(
                        "Não foi possível identificar grupo, classificação e fabricante."
                    );
                    return;
                }

                if (
                    typeof window.abrirNovoAgendamento !== "function"
                ) {
                    window.alert(
                        "A caixa padrão de Novo Agendamento não está disponível nesta página."
                    );
                    return;
                }

                const scope = {
                    grupo_id: prefill.grupoId,
                    classificacao_id: prefill.classificacaoId,
                    fabricante_id: prefill.fabricanteId
                };

                const scopeKey = getScopeKey(scope);

                const baselineAppointmentIds = new Set(
                    agendaRows
                        .filter(item => getScopeKey(item) === scopeKey)
                        .map(item => String(item.agendamento_id))
                );

                pendingRuptureAddition = {
                    ...scope,
                    scopeKey,
                    baselineAppointmentIds,
                    fabricanteNome: prefill.fabricanteNome,
                    grupoCodigo: addToAgendaButton.dataset.groupName || "",
                    classificacaoNome: addToAgendaButton.dataset.classificationName || ""
                };

                closeDetailsModal();

                window.abrirNovoAgendamento(prefill);

                return;
            }


            const toggleButton =
                event.target.closest("[data-advance-toggle]");


            if (toggleButton) {

                const wrapper =
                    toggleButton.closest(
                        ".ruptura-detail-appointment-wrap"
                    );

                const form =
                    wrapper?.querySelector(
                        ".ruptura-advance-form"
                    );


                if (form) {

                    form.hidden = !form.hidden;

                    if (!form.hidden) {

                        form.querySelector(
                            "[data-advance-date]"
                        )?.focus();

                    }

                }

                return;

            }


            const cancelButton =
                event.target.closest(
                    "[data-cancel-advance]"
                );


            if (cancelButton) {

                const form =
                    cancelButton.closest(
                        ".ruptura-advance-form"
                    );


                if (form) {

                    form.reset();

                    form.hidden = true;

                }

            }

        });


modal.addEventListener("submit", async event => {

    const awaitForm =
        event.target.closest(
            ".ruptura-await-form"
        );


    if (awaitForm) {

        event.preventDefault();

        await submitAwaitForm(awaitForm);

        return;

    }


    const advanceForm =
        event.target.closest(
            ".ruptura-advance-form"
        );


    if (!advanceForm) {
        return;
    }


    event.preventDefault();

    await submitAdvanceForm(advanceForm);

});


        return modal;

    }


    /* =====================================================
       FECHAR MODAL
    ===================================================== */

    function closeDetailsModal() {

        const modal =
            document.getElementById(
                "rupturaDetailsOverlay"
            );


        if (modal) {
            modal.hidden = true;
        }

    }

    /* =====================================================
   SALVAR DECISÃO AGUARDAR
===================================================== */

async function submitAwaitForm(form) {

    const feedback =
        form.querySelector(
            "[data-await-feedback]"
        );

    const submitButton =
        form.querySelector(
            "[data-confirm-await]"
        );

    const reason =
        form.querySelector(
            "[data-await-reason]"
        )?.value.trim() || null;


    function showFeedback(message, type = "error") {

        if (!feedback) {
            return;
        }

        feedback.textContent = message;

        feedback.className =
            `ruptura-advance-feedback ${type}`;

    }


    const groupId =
        form.dataset.groupId;

    const classificationId =
        form.dataset.classificationId;

    const manufacturerId =
        form.dataset.manufacturerId;


    if (
        !groupId ||
        !classificationId ||
        !manufacturerId
    ) {

        showFeedback(
            "Não foi possível identificar a combinação operacional."
        );

        return;

    }


    const manufacturer =
        form.dataset.manufacturerName || "fabricante";

    const group =
        form.dataset.groupName || "";

    const classification =
        form.dataset.classificationName || "";


    const confirmed = window.confirm(

        `Confirma a decisão Aguardar?\n\n` +

        `${manufacturer}\n` +

        `${group} · ${classification}\n\n` +

        `A decisão ficará salva para esta combinação e não será apagada por uma nova importação do CSV.`

    );


    if (!confirmed) {
        return;
    }


    const modal =
        document.getElementById(
            "rupturaDetailsOverlay"
        );

    const manufacturerKey =
        modal?.dataset.manufacturerKey;


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Salvando decisão...";

    }


    showFeedback(
        "Registrando decisão no Supabase...",
        "success"
    );


    try {

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "registrar_decisao_aguardar",
            {

                p_comprador_id:
                    COMPRADOR_ID,

                p_grupo_id:
                    groupId,

                p_classificacao_id:
                    classificationId,

                p_fabricante_id:
                    manufacturerId,

                p_observacao:
                    reason

            }
        );


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "O banco não retornou a confirmação da decisão."
            );

        }


        /*
         * Recarrega dados operacionais, agenda e decisões.
         * A decisão será recuperada da tabela persistente.
         */

        await loadRuptureData();


        /*
         * Procura o fabricante sem depender do filtro
         * de situação atual, que pode ocultá-lo da tabela.
         */

        const updatedRow =
            buildManufacturerRows(
                getFilteredOperationalRows()
            ).find(row =>
                row.key === manufacturerKey
            );


        if (updatedRow) {

            showDetails(updatedRow);

        } else {

            closeDetailsModal();

        }

    } catch (error) {

        console.error(
            "Erro ao registrar decisão Aguardar:",
            error
        );


        showFeedback(
            error.message ||
            "Não foi possível registrar a decisão."
        );

    } finally {

        if (submitButton?.isConnected) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Registrar Aguardar";

        }

    }

}

    /* =====================================================
       SALVAR ANTECIPAÇÃO
    ===================================================== */

    async function submitAdvanceForm(form) {

        const feedback =
            form.querySelector(
                "[data-advance-feedback]"
            );

        const submitButton =
            form.querySelector(
                "[data-confirm-advance]"
            );

        const newDate =
            form.querySelector(
                "[data-advance-date]"
            )?.value;

        const newTime =
            form.querySelector(
                "[data-advance-time]"
            )?.value;

        const reason =
            form.querySelector(
                "[data-advance-reason]"
            )?.value.trim() || null;

        const originalDate =
            form.dataset.originalDate;

        const originalTime =
            form.dataset.originalTime;


        function showFeedback(
            message,
            type = "error"
        ) {

            if (!feedback) {
                return;
            }

            feedback.textContent = message;

            feedback.className =
                `ruptura-advance-feedback ${type}`;

        }


        if (!newDate || !newTime) {

            showFeedback(
                "Informe a nova data e o horário."
            );

            return;

        }


        const newDateTime =
            `${newDate}T${newTime}`;

        const originalDateTime =
            `${originalDate}T${originalTime}`;


        if (newDateTime >= originalDateTime) {

            showFeedback(
                "A nova data e horário devem ser anteriores à ocorrência atual."
            );

            return;

        }


        /*
         * O banco também valida a data e o horário.
         * Esta verificação apenas dá um retorno imediato ao usuário.
         */

        if (
            !isAppointmentFuture(
                newDate,
                newTime
            )
        ) {

            showFeedback(
                "A nova data e horário precisam estar no futuro."
            );

            return;

        }


        const manufacturer =
            form.dataset.manufacturerName || "fabricante";

        const group =
            form.dataset.groupName || "";

        const classification =
            form.dataset.classificationName || "";


        const confirmed = window.confirm(

            `Confirma a antecipação?\n\n` +

            `${manufacturer}\n` +

            `${group} · ${classification}\n\n` +

            `De: ${formatDate(originalDate)} às ${originalTime}\n` +

            `Para: ${formatDate(newDate)} às ${newTime}\n\n` +

            `A regra recorrente e as outras combinações não serão alteradas.`

        );


        if (!confirmed) {
            return;
        }


        const modal =
            document.getElementById(
                "rupturaDetailsOverlay"
            );

        const manufacturerKey =
            modal?.dataset.manufacturerKey;


        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Salvando...";

        }


        showFeedback(
            "Registrando antecipação...",
            "success"
        );


        try {

            const {
                data,
                error
            } = await supabaseClient.rpc(
                "antecipar_agendamento_ocorrencia",
                {

                    p_agendamento_id:
                        form.dataset.appointmentId,

                    p_comprador_id:
                        COMPRADOR_ID,

                    p_grupo_id:
                        form.dataset.groupId,

                    p_fabricante_id:
                        form.dataset.manufacturerId,

                    p_classificacao_id:
                        form.dataset.classificationId,

                    p_data_nova:
                        newDate,

                    p_hora_nova:
                        newTime,

                    p_motivo:
                        reason

                }
            );


            if (error) {
                throw error;
            }


            if (!data) {

                throw new Error(
                    "O banco não retornou a confirmação do ajuste."
                );

            }


            /*
             * Atualizar os dados após gravar o ajuste.
             */

            await loadRuptureData();


const updatedRow =
    buildManufacturerRows(
        getFilteredOperationalRows()
    ).find(row =>
        row.key === manufacturerKey
    );


            if (updatedRow) {

                showDetails(updatedRow);


                const subtitle =
                    document.getElementById(
                        "rupturaDetailsSubtitle"
                    );


                if (subtitle) {

                    subtitle.textContent +=
                        " · Antecipação salva";

                }

            } else {

                closeDetailsModal();

            }

        } catch (error) {

            console.error(
                "Erro ao antecipar ocorrência:",
                error
            );


            showFeedback(
                error.message ||
                "Não foi possível salvar a antecipação."
            );

        } finally {

            if (submitButton?.isConnected) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Confirmar antecipação";

            }

        }

    }


    /* =====================================================
       EXIBIR DETALHES DO FABRICANTE
    ===================================================== */

    function showDetails(row) {

        if (!row) {
            return;
        }


        const modal =
            ensureDetailsModal();


        modal.dataset.manufacturerKey =
            row.key;


        const title =
            document.getElementById(
                "rupturaDetailsTitle"
            );

        const subtitle =
            document.getElementById(
                "rupturaDetailsSubtitle"
            );

        const financialRiskSummary =
            document.getElementById(
                "rupturaDetailsFinancialRisk"
            );

        const list =
            document.getElementById(
                "rupturaDetailsList"
            );


        title.textContent =
            row.manufacturer;


        const combinationLabel =
            row.sourceRows.length === 1
                ? "combinação operacional"
                : "combinações operacionais";


        subtitle.textContent =
            `${row.statusLabel} · ` +
            `${row.sourceRows.length} ${combinationLabel}`;

        const financialRisk =
            getFinancialRisk(row.ruptureValue);

        if (financialRiskSummary) {
            financialRiskSummary.innerHTML = `
                <span class="ruptura-financial-risk ruptura-financial-risk--${financialRisk.level}"
                    title="${escapeHtml(financialRisk.description)}">
                    ${escapeHtml(financialRisk.label)}
                </span>
                <strong>Ruptura total: ${formatCurrency(row.ruptureValue)}</strong>
            `;
        }


        list.innerHTML =
            row.sourceRows
                .map(sourceRow => {

                    const appointments =
                        agendaIndex.get(
                            getScopeKey(sourceRow)
                        ) || [];


                    const classificationName =
                        getClassificationLabel(
                            sourceRow.classificacao_codigo
                        );

                    /* =================================================
   DECISÃO REGISTRADA PARA ESTA COMBINAÇÃO
================================================= */

const decision =
    decisionIndex.get(
        getDecisionKey(sourceRow)
    ) || null;


/*
 * Exibir o status de adição somente se a agenda realmente
 * tiver uma ocorrência futura para esta combinação.
 */
const decisionLabel =
    decision?.status_decisao === "aguardar"
        ? "Aguardando"
        : decision?.status_decisao === "adicionada_agenda"
            ? (appointments.length > 0 ? "Adicionada à agenda" : "Fora da agenda")
            : "Sem decisão registrada";


const canRegisterDecision =
    Boolean(
        sourceRow.grupo_id &&
        sourceRow.classificacao_id &&
        sourceRow.fabricante_id
    );

const addToAgendaHtml = canRegisterDecision

    ? `

        <div class="ruptura-add-agenda-actions">

            <button
                type="button"
                class="ruptura-action-button"
                data-add-to-agenda

                data-group-id="${escapeHtml(sourceRow.grupo_id)}"

                data-classification-id="${escapeHtml(sourceRow.classificacao_id)}"

                data-manufacturer-id="${escapeHtml(sourceRow.fabricante_id)}"

                data-manufacturer-name="${escapeHtml(row.manufacturer)}"

                data-group-name="${escapeHtml(sourceRow.grupo_codigo)}"

                data-classification-name="${escapeHtml(classificationName)}"
            >
                + Adicionar à agenda
            </button>

        </div>

    `

    : "";


const decisionHtml = canRegisterDecision

    ? `

        <div class="ruptura-decision-panel">

            <p>
                Decisão atual:
                <strong>${escapeHtml(decisionLabel)}</strong>
            </p>

            <form
                class="ruptura-await-form"

                data-group-id="${escapeHtml(sourceRow.grupo_id)}"

                data-classification-id="${escapeHtml(sourceRow.classificacao_id)}"

                data-manufacturer-id="${escapeHtml(sourceRow.fabricante_id)}"

                data-manufacturer-name="${escapeHtml(row.manufacturer)}"

                data-group-name="${escapeHtml(sourceRow.grupo_codigo)}"

                data-classification-name="${escapeHtml(classificationName)}"
            >

                <label class="ruptura-advance-field">

                    Observação (opcional)

                    <input
                        type="text"
                        data-await-reason
                        maxlength="300"
                        value="${escapeHtml(decision?.observacao || "")}"
                        placeholder="Ex.: aguardar a próxima análise"
                    >

                </label>

                <div class="ruptura-advance-actions">

                    <button
                        type="submit"
                        class="ruptura-action-button"
                        data-confirm-await
                    >
                        ${decision?.status_decisao === "aguardar"
                            ? "Atualizar decisão"
                            : "Registrar Aguardar"
                        }
                    </button>

                </div>

                <p
                    class="ruptura-advance-feedback"
                    data-await-feedback
                    aria-live="polite"
                ></p>

            </form>

        </div>

    `

    : `

        <div class="ruptura-decision-panel">

            <p>
                Não foi possível identificar todos os IDs
                necessários para registrar a decisão.
            </p>

        </div>

    `;


                    const appointmentsHtml =
                        appointments.length

                            ? appointments
                                .map(appointment => {

                                    const originalTime =
                                        String(
                                            appointment.time || ""
                                        ).slice(0, 5);


                                    return `

                                        <div class="ruptura-detail-appointment-wrap">

                                            <div class="ruptura-detail-appointment">

                                                <span>
                                                    <strong>Agenda:</strong>
                                                    ${escapeHtml(
                                                        formatDateTime(appointment)
                                                    )}
                                                </span>

                                                <button
                                                    type="button"
                                                    class="ruptura-action-button secondary"
                                                    data-advance-toggle
                                                >
                                                    Antecipar
                                                </button>

                                            </div>


                                            <form
                                                class="ruptura-advance-form"
                                                data-advance-form

                                                data-appointment-id="${escapeHtml(appointment.id)}"

                                                data-group-id="${escapeHtml(sourceRow.grupo_id)}"

                                                data-manufacturer-id="${escapeHtml(sourceRow.fabricante_id)}"

                                                data-classification-id="${escapeHtml(sourceRow.classificacao_id)}"

                                                data-original-date="${escapeHtml(appointment.date)}"

                                                data-original-time="${escapeHtml(originalTime)}"

                                                data-manufacturer-name="${escapeHtml(row.manufacturer)}"

                                                data-group-name="${escapeHtml(sourceRow.grupo_codigo)}"

                                                data-classification-name="${escapeHtml(classificationName)}"

                                                hidden
                                            >

                                                <div class="ruptura-advance-fields">

                                                    <label class="ruptura-advance-field">

                                                        Nova data

                                                        <input
                                                            type="date"
                                                            data-advance-date
                                                            min="${getTodayISO()}"
                                                            max="${escapeHtml(appointment.date)}"
                                                            required
                                                        >

                                                    </label>


                                                    <label class="ruptura-advance-field">

                                                        Novo horário

                                                        <input
                                                            type="time"
                                                            data-advance-time
                                                            required
                                                        >

                                                    </label>

                                                </div>


                                                <label class="ruptura-advance-field ruptura-advance-reason-field">

                                                    Motivo (opcional)

                                                    <input
                                                        type="text"
                                                        data-advance-reason
                                                        maxlength="300"
                                                        placeholder="Ex.: prioridade por ruptura"
                                                    >

                                                </label>


                                                <div class="ruptura-advance-actions">

                                                    <button
                                                        type="button"
                                                        class="ruptura-action-button secondary"
                                                        data-cancel-advance
                                                    >
                                                        Cancelar
                                                    </button>

                                                    <button
                                                        type="submit"
                                                        class="ruptura-action-button"
                                                        data-confirm-advance
                                                    >
                                                        Confirmar antecipação
                                                    </button>

                                                </div>


                                                <p
                                                    class="ruptura-advance-feedback"
                                                    data-advance-feedback
                                                    aria-live="polite"
                                                ></p>

                                            </form>

                                        </div>

                                    `;

                                })
                                .join("")

                            : `

                                <p>
                                    <strong>Agenda:</strong>
                                    Nenhum agendamento futuro encontrado.
                                </p>

                            `;


                    return `

                        <article class="ruptura-details-item">

                            <strong>
                                ${escapeHtml(
                                    sourceRow.grupo_codigo
                                )}

                                ·

                                ${escapeHtml(
                                    classificationName
                                )}
                            </strong>


                            <p>
                                UF:
                                ${escapeHtml(
                                    sourceRow.uf
                                )}
                            </p>


                            <p>
                                Curva Qtd.:
                                ${escapeHtml(
                                    sourceRow.curva_qtd
                                )}

                                ·

                                Curva Valor:
                                ${escapeHtml(
                                    sourceRow.curva_valor
                                )}
                            </p>


                            <p>
                                Ruptura Qtd.:
                                ${formatNumber(
                                    sourceRow.ruptura_quantidade
                                )}

                                ·

                                Ruptura Valor:
                                ${formatCurrency(
                                    sourceRow.ruptura_valor
                                )}
                            </p>

${addToAgendaHtml}

${appointmentsHtml}

${decisionHtml}

</article>

                    `;

                })
                .join("");


        const note =
            modal.querySelector(
                ".ruptura-details-note"
            );


        if (note) {

            note.textContent =
                "A antecipação altera somente a ocorrência e a combinação selecionadas. A regra recorrente e as demais combinações permanecem preservadas.";

        }


        modal.hidden = false;


        modal.querySelector(
            "[data-close-details]"
        )?.focus();

    }


    /* =====================================================
       EVENTO DA TABELA — ABRIR DETALHES
       ESTE BLOCO ESTAVA FALTANDO NO CÓDIGO ENVIADO
    ===================================================== */

    if (tableBody) {

        tableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-row-index]"
                    );


                if (!button) {
                    return;
                }


                const index =
                    Number(
                        button.dataset.rowIndex
                    );


                showDetails(
                    currentDisplayRows[index]
                );

            }
        );

    }


    /* =====================================================
       LIMPAR FILTROS
    ===================================================== */

    if (clearFiltersButton) {

        clearFiltersButton.addEventListener(
            "click",
            () => {

                allGroupsSelected = true;

                allClassificationsSelected = true;

                selectedGroups.clear();

                selectedClassifications.clear();


                if (searchInput) {
                    searchInput.value = "";
                }


                if (situationFilter) {
                    situationFilter.value = "all";
                }


                if (consolidateCheckbox) {
                    consolidateCheckbox.checked = true;
                }


                refreshFilterOptions();

                renderTable();

                closeDropdowns();

            }
        );

    }


    /* =====================================================
       EVENTOS DOS FILTROS
    ===================================================== */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderTable
        );

    }


    if (situationFilter) {

        situationFilter.addEventListener(
            "change",
            renderTable
        );

    }


    if (consolidateCheckbox) {

        consolidateCheckbox.addEventListener(
            "change",
            renderTable
        );

    }


    /* =====================================================
       CARREGAR DATA DA IMPORTAÇÃO
    ===================================================== */

    async function loadImportReference() {

        try {

            const {
                data,
                error
            } =
                await supabaseClient

                    .from(
                        "importacoes_operacionais"
                    )

                    .select(
                        `
                        data_referencia,
                        nome_arquivo,
                        quantidade_linhas,
                        status,
                        created_at
                        `
                    )

                    .eq(
                        "status",
                        "concluida"
                    )

                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )

                    .limit(1)
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (
                data &&
                referenceElement
            ) {

                referenceElement.textContent =
                    formatDate(
                        data.data_referencia
                    );

            } else if (referenceElement) {

                referenceElement.textContent =
                    "Não disponível";

            }

        } catch (error) {

            console.warn(
                "Não foi possível consultar a referência da importação:",
                error
            );


            if (referenceElement) {

                referenceElement.textContent =
                    "Não disponível";

            }

        }

    }


    /* =====================================================
       CARREGAR DADOS DO SUPABASE
    ===================================================== */

    async function loadRuptureData() {

        try {

            console.log(
                "Carregando dados operacionais..."
            );


            showTableMessage(
                "Carregando dados operacionais..."
            );


            const {
                data: operationalData,
                error: operationalError
            } =
                await supabaseClient

                    .from(
                        "dados_operacionais"
                    )

                    .select(
                        `
                        id,
                        importacao_id,
                        grupo_id,
                        classificacao_id,
                        fabricante_id,
                        grupo_codigo,
                        uf,
                        classificacao_codigo,
                        fabricante_nome,
                        curva_qtd,
                        curva_valor,
                        total_vendido,
                        dias_sem_estoque,
                        ruptura_quantidade,
                        ruptura_valor
                        `
                    )

                    .order(
                        "grupo_codigo"
                    )

                    .order(
                        "fabricante_nome"
                    );


            if (operationalError) {
                throw operationalError;
            }


            const {
                data: agendaData,
                error: agendaError
            } =
                await supabaseClient

                    .from(
                        "vw_agenda_compras"
                    )

                    .select(
                        `
                        agendamento_id,
                        comprador_id,
                        grupo_id,
                        fabricante_id,
                        classificacao_id,
                        data_agendamento,
                        hora_inicio,
                        grupo_codigo,
                        grupo_nome,
                        nome_visual,
                        nome_fabricante,
                        classificacao_codigo,
                        classificacao_nome,
                        regra_observacao
                        `
                    )

                    .eq(
                        "comprador_id",
                        COMPRADOR_ID
                    )

                    .gte(
                        "data_agendamento",
                        getTodayISO()
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
                    );


            if (agendaError) {
                throw agendaError;
            }

            /* =====================================================
   CARREGAR DECISÕES PERSISTENTES
===================================================== */

const {
    data: decisionData,
    error: decisionError
} = await supabaseClient

    .from("decisoes_ruptura")

    .select(`
        comprador_id,
        grupo_id,
        classificacao_id,
        fabricante_id,
        status_decisao,
        observacao,
        updated_at
    `)

    .eq(
        "comprador_id",
        COMPRADOR_ID
    );


if (decisionError) {
    throw decisionError;
}


operationalRows =
    operationalData || [];


agendaRows =
    agendaData || [];


decisionRows =
    decisionData || [];


buildAgendaIndex();

buildDecisionIndex();


            refreshFilterOptions();


            await loadImportReference();


            console.log(
                "Dados operacionais carregados:",
                operationalRows.length
            );


            console.log(
                "Agendamentos consultados:",
                agendaRows.length
            );


            renderTable();


        } catch (error) {

            console.error(
                "Erro ao carregar a Agenda por Ruptura:",
                error
            );


            showTableMessage(
                "Não foi possível carregar os dados. Verifique o acesso ao Supabase e as políticas de leitura."
            );


            if (totalRecordsElement) {
                totalRecordsElement.textContent = "—";
            }

            if (scheduledRecordsElement) {
                scheduledRecordsElement.textContent = "—";
            }

            if (outsideRecordsElement) {
                outsideRecordsElement.textContent = "—";
            }

            if (criticalRecordsElement) {
                criticalRecordsElement.textContent = "—";
            }

        }

    }


    /* =====================================================
       ATUALIZAR APÓS UMA NOVA IMPORTAÇÃO
    ===================================================== */

    window.addEventListener(
        "ruptura:updated",
        () => {

            loadRuptureData();

        }
    );

    /* =====================================================
   ATUALIZAR APÓS SALVAR UM NOVO AGENDAMENTO
===================================================== */

window.addEventListener(
    "agenda:updated",
    async () => {

        if (handlingAgendaUpdate) {
            return;
        }

        handlingAgendaUpdate = true;

        const pending = pendingRuptureAddition;

        try {

            /* Primeiro recarrega a agenda após o salvamento padrão. */
            await loadRuptureData();

            if (!pending || pendingRuptureAddition !== pending) {
                return;
            }

            /*
             * Confirma que apareceu pelo menos uma nova ocorrência
             * para a combinação selecionada, comparando com os IDs
             * que existiam antes da abertura do formulário padrão.
             */
            const hasNewOccurrence = agendaRows.some(item =>
                getScopeKey(item) === pending.scopeKey &&
                !pending.baselineAppointmentIds.has(
                    String(item.agendamento_id)
                )
            );

            /* Uma atualização de outra tela não deve deixar a intenção pendente. */
            pendingRuptureAddition = null;

            if (!hasNewOccurrence) {
                return;
            }

            const {
                data,
                error
            } = await supabaseClient.rpc(
                "registrar_decisao_adicionada_agenda",
                {
                    p_comprador_id: COMPRADOR_ID,
                    p_grupo_id: pending.grupo_id,
                    p_classificacao_id: pending.classificacao_id,
                    p_fabricante_id: pending.fabricante_id
                }
            );

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "A agenda foi salva, mas o banco não confirmou a atualização da situação da ruptura."
                );
            }

            await loadRuptureData();

            const updatedRow = buildManufacturerRows(
                getFilteredOperationalRows()
            ).find(row =>
                row.sourceRows.some(sourceRow =>
                    getScopeKey(sourceRow) === pending.scopeKey
                )
            );

            if (updatedRow) {
                showDetails(updatedRow);

                const subtitle = document.getElementById(
                    "rupturaDetailsSubtitle"
                );

                if (subtitle) {
                    subtitle.textContent += " · Adicionada à agenda";
                }
            }

        } catch (error) {

            console.error(
                "Erro ao atualizar a situação da ruptura após salvar a agenda:",
                error
            );

            window.alert(
                "O agendamento foi processado, mas não foi possível atualizar a situação da ruptura. Atualize a página e confira a situação."
            );

        } finally {
            handlingAgendaUpdate = false;
        }

    }
);


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

ensureSituationOptions();

refreshFilterOptions();

setupSortableHeaders();

ensureFinancialRiskLegend();

loadRuptureData();

});