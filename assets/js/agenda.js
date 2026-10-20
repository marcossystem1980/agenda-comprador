/* =========================================================
   AGENDA COMPRADOR — CALENDÁRIO E DETALHES
   Versão definitiva: calendário + modos JUNTAS/SEPARADAS/AGRUPADAS/CONSOLIDADAS
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // Aguarda a validação do usuário e do comprador selecionado.
    const access = await window.AgendaAccess?.ready;

    if (!access?.allowed) {
        return;
    }

    const COMPRADOR_ID = access.compradorId;
    const READ_ONLY = access.readOnly === true;

    /* ELEMENTOS DA PÁGINA */
    const filterDropdowns = document.querySelectorAll(".agenda-filter-dropdown");
    const groupFilterOptions = document.getElementById("groupFilterOptions");
    const classificationFilterOptions = document.getElementById("classificationFilterOptions");
    const classificationModeButton = document.getElementById("classificationModeButton");
    const classificationModeIcon = document.getElementById("classificationModeIcon");
    const viewButtons = document.querySelectorAll(".agenda-view-button");
    const periodTitle = document.getElementById("periodTitle");
    const previousPeriod = document.getElementById("previousPeriod");
    const nextPeriod = document.getElementById("nextPeriod");
    const todayButton = document.getElementById("todayButton");
    const monthView = document.getElementById("monthView");
    const weekView = document.getElementById("weekView");
    const dayView = document.getElementById("dayView");
    const monthCalendar = document.getElementById("monthCalendar");
    const weekCalendar = document.getElementById("weekCalendar");
    const dayCalendar = document.getElementById("dayCalendar");

    /* HORIZONTE: MÊS ATUAL E PRÓXIMO MÊS */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const horizonEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    horizonEnd.setHours(0, 0, 0, 0);

    /* ESTADO */
    let currentView = "month";
    let currentDate = new Date(today);
    let appointments = [];
    let operationalRows = [];
    let selectedAppointment = null;
    let isLoadingAppointments = false;
    let isLoadingOperationalData = false;
    let isSavingOccurrenceAction = false;

    /*
     * auto: respeita o modo salvo na regra (JUNTAS ou SEPARADAS).
     * grouped: agrupa classificações do mesmo fabricante na mesma ocorrência.
     * separated: mostra cada combinação individual.
     * consolidated: consolida todos os fabricantes/classificações da ocorrência.
     */
    const CLASSIFICATION_MODE_STORAGE_KEY = "agendaComprador_classificationMode_v2";
    let classificationDisplayMode = "auto";
    try {
        const savedMode = localStorage.getItem(CLASSIFICATION_MODE_STORAGE_KEY);
        if (["auto", "grouped", "separated", "consolidated"].includes(savedMode)) {
            classificationDisplayMode = savedMode;
        }
    } catch (error) {
        console.warn("Não foi possível ler a preferência de visualização.", error);
    }

        const classificationCatalog = [
        { value: "PROPAGADO", label: "Propagado" },
        { value: "PERFUMARIA", label: "Perfumaria" },
        { value: "FRALDAS", label: "Fraldas" },
        { value: "LEITES", label: "Leites" },
        { value: "CONVENIENCIA", label: "Conveniência" },
        { value: "VAREJO", label: "Varejo" },
        { value: "PBM", label: "PBM" },
        { value: "SIMILARES", label: "Similares" },
        { value: "GENERICOS", label: "Genéricos" },
        { value: "SUPLEMENTOS", label: "Suplementos" },
        { value: "NOSSAS MARCAS", label: "Nossas Marcas" },
        { value: "PERFUMES", label: "Perfumes" },
        { value: "DERMOCOSMETICOS", label: "Dermocosméticos" }
    ];

    const filterState = {
        groups: ["all"],
        classifications: ["all"],
        situations: ["all"]
    };

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const weekdayNames = [
        "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
        "Quinta-feira", "Sexta-feira", "Sábado"
    ];

    const weekdayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const currencyFormatter = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    /* FORMATADORES E UTILITÁRIOS */
    function normalizeText(value) {
        return String(value ?? "")
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

    function formatNumber(value, decimals = 2) {
        if (value === null || value === undefined || value === "") return "—";
        const number = Number(value);
        if (!Number.isFinite(number)) return "—";
        return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: decimals }).format(number);
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === "") return "—";
        const number = Number(value);
        if (!Number.isFinite(number)) return "—";
        return currencyFormatter.format(number);
    }

    function dateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function parseISODate(value) {
        if (!value) return null;
        const parts = String(value).split("-").map(Number);
        if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatDateISO(value) {
        const parts = String(value || "").split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "—";
    }

    function isSameDate(dateA, dateB) {
        return Boolean(dateA && dateB) &&
            dateA.getFullYear() === dateB.getFullYear() &&
            dateA.getMonth() === dateB.getMonth() &&
            dateA.getDate() === dateB.getDate();
    }

    function getMonday(date) {
        const result = new Date(date);
        const day = result.getDay();
        result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
        result.setHours(0, 0, 0, 0);
        return result;
    }

    function getFriday(date) {
        const result = getMonday(date);
        result.setDate(result.getDate() + 4);
        return result;
    }

    function formatDateShort(date) {
        return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function formatTimeLabel(value) {
        return String(value || "").slice(0, 5);
    }

    function getClassificationLabel(value) {
        const normalized = normalizeText(value);
        const found = classificationCatalog.find(item =>
            normalizeText(item.value) === normalized || normalizeText(item.label) === normalized
        );
        return found ? found.label : (value || "");
    }

    function formatClassificationList(labels) {
        const uniqueLabels = [...new Set(labels.filter(Boolean).map(getClassificationLabel))];
        uniqueLabels.sort((a, b) => {
            const ia = classificationCatalog.findIndex(item => normalizeText(item.label) === normalizeText(a));
            const ib = classificationCatalog.findIndex(item => normalizeText(item.label) === normalizeText(b));
            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        });
        if (uniqueLabels.length === 0) return { display: "", full: "" };
        if (uniqueLabels.length <= 2) {
            const label = uniqueLabels.join(" • ");
            return { display: label, full: label };
        }
        return {
            display: `${uniqueLabels[0]} • ${uniqueLabels[1]}...`,
            full: uniqueLabels.join(" • ")
        };
    }

/* =====================================================
   SITUAÇÃO DOS AGENDAMENTOS
   Padronizada com o Dashboard
===================================================== */

function isAppointmentCompleted(item) {
    return item?.completed === true ||
        item?.concluido === true ||
        ["COMPLETED", "CONCLUIDO"].includes(
            normalizeText(item?.status)
        );
}

function normalizeSituation(item) {
    if (isAppointmentCompleted(item)) {
        return {
            status: "completed",
            statusLabel: "Concluído"
        };
    }

    const status = normalizeText(item?.status);
    const label = normalizeText(item?.status_label);
    const combined = `${status} ${label}`;

    if (
        combined.includes("RISK") ||
        combined.includes("RISCO")
    ) {
        return {
            status: "risk",
            statusLabel: item?.status_label || "Risco"
        };
    }

    if (
        combined.includes("URGENT") ||
        combined.includes("URGENTE")
    ) {
        return {
            status: "urgent",
            statusLabel: item?.status_label || "Urgente"
        };
    }

    if (
        combined.includes("ATTENTION") ||
        combined.includes("ATENCAO")
    ) {
        return {
            status: "attention",
            statusLabel: item?.status_label || "Atenção"
        };
    }

    return {
        status: "normal",
        statusLabel: item?.status_label || "Normal"
    };
}

function getSituationWeight(status) {
    return {
        normal: 1,
        attention: 2,
        urgent: 3,
        risk: 4,
        completed: 0
    }[status] ?? 0;
}

function getMostCriticalSituation(list) {
    if (!list?.length) {
        return {
            status: "normal",
            statusLabel: "Normal"
        };
    }

    // Uma ocorrência só é concluída se todos os registros
    // vinculados a ela estiverem concluídos.
    const activeItems = list.filter(
        item => !isAppointmentCompleted(item)
    );

    if (!activeItems.length) {
        return {
            status: "completed",
            statusLabel: "Concluído"
        };
    }

    const normalizedItems = activeItems.map(item => ({
        ...item,
        ...normalizeSituation(item)
    }));

    const critical = [...normalizedItems].sort(
        (a, b) =>
            getSituationWeight(b.status) -
            getSituationWeight(a.status)
    )[0];

    return {
        status: critical.status,
        statusLabel: critical.statusLabel
    };
}

    /* PREPARAR REGISTROS: AUTOMÁTICO, AGRUPADAS, SEPARADAS OU CONSOLIDADAS */
    function prepareAppointmentsForDisplay(list) {
        if (!Array.isArray(list)) return [];

        // Uma combinação de grupo/classificação/fabricante deve aparecer uma única vez na ocorrência.
        const uniqueRows = new Map();
        list.forEach(item => {
            const key = [
                item.date, item.time, item.groupId || "", item.ruleId || `sem-regra:${item.id}`,
                item.manufacturerId || normalizeText(item.manufacturerReal),
                item.classificationId || normalizeText(item.classification)
            ].join("|");
            if (!uniqueRows.has(key)) uniqueRows.set(key, item);
        });
        const rows = [...uniqueRows.values()];

        const shouldConsolidate = item =>
            classificationDisplayMode === "consolidated" ||
            (classificationDisplayMode === "auto" && normalizeText(item.mode) === "JUNTAS");

        const shouldGroupManufacturer = item => classificationDisplayMode === "grouped";

        const prepareSingle = appointment => {
            const classification = formatClassificationList([appointment.classification]);
            const realManufacturer = appointment.manufacturerReal || appointment.manufacturer || "Fabricante";
            return {
                ...appointment,
                displayKey: ["single", appointment.id, appointment.manufacturerId || "", appointment.classificationId || "", appointment.date, appointment.time, appointment.ruleId || ""].join("|"),
                sourceAppointments: [appointment],
                ruptureRiskClass: getFinancialRiskClass([appointment]),
                displayManufacturers: realManufacturer,
                displayManufacturerCount: appointment.manufacturerReal ? 1 : 0,
                displayClassification: classification.display,
                fullClassification: classification.full,
                displaySummary: [realManufacturer, classification.display].filter(Boolean).join(" · "),
                fullDisplaySummary: [realManufacturer, classification.full].filter(Boolean).join(" · "),
                effectiveDisplayMode: "SEPARADAS"
            };
        };

        const groups = new Map();
        const output = [];

        rows.forEach(appointment => {
            if (shouldConsolidate(appointment)) {
                // JUNTAS/CONSOLIDADAS: todos os fabricantes e classificações da MESMA ocorrência.
                const key = ["consolidated", appointment.ruleId || `sem-regra:${appointment.id}`, appointment.date, appointment.time, appointment.groupId || ""].join("|");
                if (!groups.has(key)) groups.set(key, { kind: "consolidated", rows: [] });
                groups.get(key).rows.push(appointment);
                return;
            }

            if (shouldGroupManufacturer(appointment)) {
                // AGRUPADAS: classificações do mesmo fabricante; fabricantes diferentes não se misturam.
                const key = ["grouped", appointment.ruleId || `sem-regra:${appointment.id}`, appointment.date, appointment.time, appointment.groupId || "", appointment.manufacturerId || normalizeText(appointment.manufacturerReal)].join("|");
                if (!groups.has(key)) groups.set(key, { kind: "grouped", rows: [] });
                groups.get(key).rows.push(appointment);
                return;
            }

            // Em modo automático, as regras SEPARADAS e o modo global Separadas ficam linha a linha.
            output.push(prepareSingle(appointment));
        });

        groups.forEach(group => {
            const groupRows = group.rows;
            if (!groupRows.length) return;
            const base = groupRows[0];
            const scopes = new Map();
            groupRows.forEach(item => {
                const scopeKey = [item.groupId || "", item.classificationId || normalizeText(item.classification), item.manufacturerId || normalizeText(item.manufacturerReal)].join("|");
                if (!scopes.has(scopeKey)) scopes.set(scopeKey, item);
            });
            const sourceAppointments = [...scopes.values()];
            const classification = formatClassificationList(sourceAppointments.map(item => item.classification));
            const manufacturers = [...new Set(sourceAppointments.map(item => item.manufacturerReal || item.manufacturer).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b, "pt-BR"));
            const situation = getMostCriticalSituation(sourceAppointments);
            const consolidated = group.kind === "consolidated";
            const effectiveDisplayMode = consolidated ? "CONSOLIDADAS" : "AGRUPADAS";
            const groupingIdentity = consolidated
                ? ["consolidated", base.ruleId || `sem-regra:${base.id}`, base.date, base.time, base.groupId || ""]
                : ["grouped", base.ruleId || `sem-regra:${base.id}`, base.date, base.time, base.groupId || "", base.manufacturerId || normalizeText(base.manufacturerReal)];

            output.push({
                ...base,
                displayKey: groupingIdentity.join("|"),
                sourceAppointments,
                status: situation.status,
                statusLabel: situation.statusLabel,
                ruptureRiskClass: getFinancialRiskClass(sourceAppointments),
                displayManufacturers: manufacturers.join(" + "),
                displayManufacturerCount: manufacturers.length,
                displayClassification: classification.display,
                fullClassification: classification.full,
                displaySummary: [manufacturers.join(" + "), classification.display].filter(Boolean).join(" · "),
                fullDisplaySummary: [manufacturers.join(" + "), classification.full].filter(Boolean).join(" · "),
                effectiveDisplayMode,
                completed: sourceAppointments.length > 0 && sourceAppointments.every(item => item.completed),
                recurring: sourceAppointments.some(item => item.recurring)
            });
        });

        return output.sort((a, b) =>
            String(a.time || "").localeCompare(String(b.time || "")) ||
            String(a.manufacturer || "").localeCompare(String(b.manufacturer || ""), "pt-BR") ||
            String(a.displayKey || "").localeCompare(String(b.displayKey || ""))
        );
    }

        /* FILTROS DO SUPABASE */
    async function loadAgendaFilters() {
        try {
            const { data, error } = await supabaseClient
                .from("vw_comprador_classificacoes")
                .select("grupo_id, grupo_codigo, grupo_nome, classificacao_id, classificacao_codigo, classificacao_nome")
                .eq("comprador_id", COMPRADOR_ID)
                .order("grupo_codigo")
                .order("classificacao_nome");
            if (error) throw error;

            const rows = data || [];
            const groups = Array.from(new Map(rows.map(item => [item.grupo_id, {
                id: item.grupo_id, code: item.grupo_codigo, name: item.grupo_nome
            }])).values());
            const classifications = Array.from(new Map(rows.map(item => [item.classificacao_id, {
                id: item.classificacao_id, code: item.classificacao_codigo, name: item.classificacao_nome
            }])).values());

            renderGroupFilterFromSupabase(groups);
            renderClassificationFilterFromSupabase(classifications);
            filterState.groups = ["all"];
            filterState.classifications = ["all"];
            setupFilterOptions('input[name="groupFilter"]', "groups");
            setupFilterOptions('input[name="classificationFilter"]', "classifications");
            updateFilterLabels();
        } catch (error) {
            console.error("Erro ao carregar filtros do comprador:", error);
        }
    }

    function renderGroupFilterFromSupabase(groups) {
        if (!groupFilterOptions) return;
        let html = `
            <label class="agenda-filter-option">
                <input type="checkbox" name="groupFilter" value="all" checked>
                <span class="agenda-filter-check"></span>
                <span class="agenda-filter-option-text">Todos os grupos</span>
            </label>`;
        groups.forEach(group => {
            html += `
                <label class="agenda-filter-option">
                    <input type="checkbox" name="groupFilter" value="${escapeHtml(group.code)}">
                    <span class="agenda-filter-check"></span>
                    <span class="agenda-filter-option-text">${escapeHtml(group.name || group.code)}</span>
                </label>`;
        });
        groupFilterOptions.innerHTML = html;
    }

    function renderClassificationFilterFromSupabase(classifications) {
        if (!classificationFilterOptions) return;
        let html = `
            <label class="agenda-filter-option">
                <input type="checkbox" name="classificationFilter" value="all" checked>
                <span class="agenda-filter-check"></span>
                <span class="agenda-filter-option-text">Todas as classificações</span>
            </label>`;
        classifications.forEach(classification => {
            html += `
                <label class="agenda-filter-option">
                    <input type="checkbox" name="classificationFilter" value="${escapeHtml(classification.code)}">
                    <span class="agenda-filter-check"></span>
                    <span class="agenda-filter-option-text">${escapeHtml(classification.name || classification.code)}</span>
                </label>`;
        });
        classificationFilterOptions.innerHTML = html;
    }

    function setupFilterOptions(selector, stateKey) {
        document.querySelectorAll(selector).forEach(input => {
            input.addEventListener("change", () => {
                const allInput = document.querySelector(`${selector}[value="all"]`);
                const specificInputs = [...document.querySelectorAll(`${selector}:not([value="all"])`)];

                if (input.value === "all" && input.checked) {
                    specificInputs.forEach(item => { item.checked = false; });
                } else if (input.value !== "all" && input.checked && allInput) {
                    allInput.checked = false;
                }

                if (!specificInputs.some(item => item.checked) && allInput) {
                    allInput.checked = true;
                }

                filterState[stateKey] = [...document.querySelectorAll(`${selector}:checked`)].map(item => item.value);
                if (!filterState[stateKey].length) filterState[stateKey] = ["all"];
                updateFilterLabels();
                renderCurrentView();
            });
        });
    }

    function updateFilterLabels() {
        const groupLabel = document.querySelector('[data-filter-label="group"]');
        const classificationLabel = document.querySelector('[data-filter-label="classification"]');
        const situationLabel = document.querySelector('[data-filter-label="situation"]');
const situationNames = {
    normal: "Normal",
    attention: "Atenção",
    urgent: "Urgente",
    risk: "Risco de ruptura",
    completed: "Concluído"
};
        if (groupLabel) {
            const values = filterState.groups;
            groupLabel.textContent = values.includes("all") ? "Todos" : values.length === 1 ? values[0] : `${values.length} selecionados`;
        }
        if (classificationLabel) {
            const values = filterState.classifications;
            classificationLabel.textContent = values.includes("all") ? "Todas" : values.length === 1 ? getClassificationLabel(values[0]) : `${values.length} selecionadas`;
        }
        if (situationLabel) {
            const values = filterState.situations;
            situationLabel.textContent = values.includes("all") ? "Todas" : values.length === 1 ? (situationNames[values[0]] || values[0]) : `${values.length} selecionadas`;
        }
    }

    /* MODO GLOBAL DE EXIBIÇÃO: AUTOMÁTICO, AGRUPADAS, SEPARADAS OU CONSOLIDADAS */
    function updateClassificationModeButton() {
        if (!classificationModeButton) return;

        const iconByMode = { auto: "◈", grouped: "⧉", separated: "≡", consolidated: "∑" };
        const labels = {
            auto: "Automático — respeitar JUNTAS/SEPARADAS configurado em cada regra",
            grouped: "Agrupadas — reunir classificações do mesmo fabricante na ocorrência",
            separated: "Separadas — mostrar cada combinação de fabricante/classificação",
            consolidated: "Consolidadas — reunir todos os fabricantes e classificações da mesma ocorrência"
        };
        const mode = classificationDisplayMode;
        classificationModeButton.classList.toggle("grouped", mode === "grouped" || mode === "consolidated");
        classificationModeButton.classList.toggle("separated", mode === "separated");
        classificationModeButton.classList.toggle("auto", mode === "auto");
        classificationModeButton.classList.toggle("consolidated", mode === "consolidated");
        classificationModeButton.setAttribute("aria-pressed", mode === "grouped" || mode === "consolidated" ? "true" : "false");
        classificationModeButton.title = labels[mode];
        classificationModeButton.setAttribute("aria-label", labels[mode]);
        if (classificationModeIcon) classificationModeIcon.textContent = iconByMode[mode];
    }

    classificationModeButton?.addEventListener("click", event => {
        event.stopPropagation();
        const sequence = ["auto", "grouped", "separated", "consolidated"];
        const currentIndex = sequence.indexOf(classificationDisplayMode);
        classificationDisplayMode = sequence[(currentIndex + 1) % sequence.length];
        try {
            localStorage.setItem(CLASSIFICATION_MODE_STORAGE_KEY, classificationDisplayMode);
        } catch (error) {
            console.warn("Não foi possível salvar a preferência de visualização.", error);
        }
        updateClassificationModeButton();
        renderCurrentView();
    });

        /* ABRIR/FECHAR MENUS DOS FILTROS */
    filterDropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector(".agenda-filter-trigger");
        if (!trigger) return;
        trigger.addEventListener("click", event => {
            event.stopPropagation();
            filterDropdowns.forEach(other => {
                if (other === dropdown) return;
                other.classList.remove("open");
                other.querySelector(".agenda-filter-trigger")?.setAttribute("aria-expanded", "false");
            });
            const isOpen = dropdown.classList.toggle("open");
            trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    });

    document.addEventListener("click", event => {
        if (event.target instanceof Element && event.target.closest(".agenda-filter-dropdown")) return;
        filterDropdowns.forEach(dropdown => {
            dropdown.classList.remove("open");
            dropdown.querySelector(".agenda-filter-trigger")?.setAttribute("aria-expanded", "false");
        });
    });

    /* CARREGAR AGENDAMENTOS E INDICADORES */
    async function loadAppointments() {
        if (isLoadingAppointments) return;
        isLoadingAppointments = true;

        try {
            const { data, error } = await supabaseClient
                .from("vw_agenda_compras")
                .select(`
                    agendamento_id, regra_agendamento_id, comprador_id, grupo_id,
                    data_agendamento, hora_inicio, hora_fim, grupo_codigo, grupo_nome,
                    nome_visual, modo_classificacao, recorrente, regra_ativa,
                    regra_observacao, fabricante_id, nome_fabricante,
                    classificacao_id, classificacao_codigo, classificacao_nome,
                    status, status_label, concluido
                `)
                .eq("comprador_id", COMPRADOR_ID)
                .gte("data_agendamento", dateToISO(horizonStart))
                .lte("data_agendamento", dateToISO(horizonEnd))
                .order("data_agendamento", { ascending: true })
                .order("hora_inicio", { ascending: true })
                .order("nome_fabricante", { ascending: true });

            if (error) throw error;

appointments = (data || []).map(item => {
    const completed = isAppointmentCompleted(item);
    const situation = normalizeSituation(item);

    return {
        id: item.agendamento_id,
        ruleId: item.regra_agendamento_id,
        groupId: item.grupo_id,
        manufacturerId: item.fabricante_id,

        date: item.data_agendamento,
        time: formatTimeLabel(item.hora_inicio),
        endTime: formatTimeLabel(item.hora_fim),

        manufacturer:
            item.nome_visual ||
            item.nome_fabricante ||
            "Fabricante",

        manufacturerReal: item.nome_fabricante || "",

        group: item.grupo_codigo || item.grupo_nome || "",
        groupName: item.grupo_nome || item.grupo_codigo || "",

        classification:
            item.classificacao_nome ||
            item.classificacao_codigo ||
            "",

        classificationCode: item.classificacao_codigo || "",
        classificationId: item.classificacao_id,

        status: situation.status,
        statusLabel: situation.statusLabel,
        completed,

        observation: item.regra_observacao || "",

        mode:
            normalizeText(item.modo_classificacao) === "SEPARADAS"
                ? "SEPARADAS"
                : "JUNTAS",

        recurring: item.recorrente === true
    };
});

            await loadOperationalRows();
            renderCurrentView();
            console.log("Agendamentos carregados:", appointments.length);
            console.log("Registros operacionais carregados:", operationalRows.length);
        } catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
            appointments = [];
            operationalRows = [];
            renderCurrentView();
        } finally {
            isLoadingAppointments = false;
        }
    }

    async function loadOperationalRows() {
        if (isLoadingOperationalData) return;
        isLoadingOperationalData = true;
        try {
            // Indicadores consolidados devem vir da importação concluída mais recente.
            const { data: importacao, error: importError } = await supabaseClient
                .from("importacoes_operacionais")
                .select("id, data_referencia, created_at")
                .eq("status", "concluida")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (importError) throw importError;
            if (!importacao?.id) {
                operationalRows = [];
                console.warn("Nenhuma importação operacional concluída foi encontrada.");
                return;
            }

            const pageSize = 1000;
            let offset = 0;
            const allRows = [];
            while (true) {
                const { data, error } = await supabaseClient
                    .from("dados_operacionais")
                    .select(`
                        id, importacao_id, grupo_id, classificacao_id, fabricante_id, uf,
                        curva_qtd, curva_valor, total_vendido,
                        dias_sem_estoque, ruptura_quantidade, ruptura_valor
                    `)
                    .eq("importacao_id", importacao.id)
                    .order("grupo_id", { ascending: true })
                    .order("classificacao_id", { ascending: true })
                    .order("fabricante_id", { ascending: true })
                    .order("uf", { ascending: true })
                    .range(offset, offset + pageSize - 1);

                if (error) throw error;
                const page = data || [];
                allRows.push(...page);
                if (page.length < pageSize) break;
                offset += pageSize;
            }

            operationalRows = allRows;
            console.log("Importação operacional utilizada:", importacao.data_referencia, importacao.id);
        } catch (error) {
            console.error("Não foi possível carregar os indicadores operacionais:", error);
            operationalRows = [];
        } finally {
            isLoadingOperationalData = false;
        }
    }

        window.addEventListener("agenda:updated", () => {
        loadAppointments();
    });

    /* FILTROS APLICADOS AOS AGENDAMENTOS DE UM DIA */
    function getAppointmentsForDate(date) {
        const iso = dateToISO(date);
        let result = appointments.filter(item => item.date === iso);

        if (!filterState.groups.includes("all")) {
            result = result.filter(item => filterState.groups.some(selected =>
                normalizeText(selected) === normalizeText(item.group)
            ));
        }

        if (!filterState.classifications.includes("all")) {
            result = result.filter(item => {
                const code = normalizeText(item.classificationCode || item.classification);
                return filterState.classifications.some(selected => normalizeText(selected) === code);
            });
        }

        if (!filterState.situations.includes("all")) {
            result = result.filter(item => filterState.situations.includes(item.status));
        }

        return prepareAppointmentsForDisplay(result);
    }

    /* TÍTULO DO PERÍODO */
    function updatePeriodTitle() {
        if (!periodTitle) return;
        if (currentView === "month") {
            periodTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else if (currentView === "week") {
            periodTitle.textContent = `${formatDateShort(getMonday(currentDate))} a ${formatDateShort(getFriday(currentDate))}`;
        } else if (currentView === "day") {
            periodTitle.textContent = `${String(currentDate.getDate()).padStart(2, "0")} de ${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
        }
    }

    /* CALENDÁRIO MENSAL: NO MÁXIMO TRÊS COMPROMISSOS VISÍVEIS */
    function renderMonth() {
        if (!monthCalendar) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPosition = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        let html = `
            <div class="month-calendar-title"><strong>${escapeHtml(monthNames[month])}</strong><span>${year}</span></div>
            <div class="calendar-header">
                <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div>
                <div class="weekend-column">Sáb</div><div class="weekend-column">Dom</div>
            </div>
            <div class="calendar-grid">`;

        for (let i = 0; i < startPosition; i++) {
            html += `<div class="calendar-day previous-month"><span class="calendar-day-number"></span></div>`;
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            const todayClass = isSameDate(date, today) ? "current-day" : "";
            const dayAppointments = getAppointmentsForDate(date);
            html += `
                <div class="calendar-day ${weekend ? "weekend" : ""} ${todayClass}" data-date="${dateToISO(date)}">
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-appointments">
                        ${dayAppointments.slice(0, 3).map(appointment => `
                            <div class="calendar-appointment ${escapeHtml(appointment.status)} ${escapeHtml(appointment.ruptureRiskClass || "rupture-impact-unclassified")} ${appointment.completed ? "completed" : ""}"
                                data-appointment-key="${escapeHtml(appointment.displayKey)}"
                                data-date="${escapeHtml(appointment.date)}"
                                role="button" tabindex="0"
                                title="${escapeHtml(appointment.fullClassification || "")}">
                                <span class="calendar-appointment-primary">${escapeHtml(appointment.time)} · ${escapeHtml(appointment.manufacturer)}</span>
                                <span class="calendar-appointment-classification">${escapeHtml(appointment.displayClassification || "")}</span>
                            </div>`).join("")}
                        ${dayAppointments.length > 3 ? `
                            <button type="button" class="calendar-more-button" data-more-date="${dateToISO(date)}">
                                +${dayAppointments.length - 3} mais · Ver todos
                            </button>` : ""}
                    </div>
                </div>`;
        }

        const totalCells = startPosition + lastDay.getDate();
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 0; i < remaining; i++) {
            html += `<div class="calendar-day next-month"><span class="calendar-day-number"></span></div>`;
        }
        monthCalendar.innerHTML = `${html}</div>`;
    }

    /* CALENDÁRIO SEMANAL: UM CARTÃO POR HORÁRIO */
    function renderWeek() {
        if (!weekCalendar) return;
        const monday = getMonday(currentDate);
        const weekDays = Array.from({ length: 5 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });

        let html = `<div class="week-calendar-grid"><div class="week-time-column"><div class="week-column-header"><span>Horário</span></div>`;
        for (let hour = 8; hour <= 18; hour++) {
            html += `<div class="week-time">${String(hour).padStart(2, "0")}:00</div>`;
        }
        html += `</div>`;

        weekDays.forEach(date => {
            html += `<div class="week-day-column">
                <div class="week-column-header"><strong>${String(date.getDate()).padStart(2, "0")}</strong><span>${escapeHtml(weekdayShort[date.getDay()])}</span></div>`;
            const daily = getAppointmentsForDate(date);
            for (let hour = 8; hour <= 18; hour++) {
                const atHour = daily.filter(item => Number(String(item.time || "").split(":")[0]) === hour);
                html += `<div class="week-slot" data-date="${dateToISO(date)}" data-hour="${hour}">
                    ${atHour.slice(0, 1).map(appointment => `
                        <div class="week-appointment ${escapeHtml(appointment.status)} ${escapeHtml(appointment.ruptureRiskClass || "rupture-impact-unclassified")} ${appointment.completed ? "completed" : ""}"
                            data-appointment-key="${escapeHtml(appointment.displayKey)}"
                            data-date="${escapeHtml(appointment.date)}" role="button" tabindex="0"
                            title="${escapeHtml(appointment.fullClassification || "")}">
                            <strong>${escapeHtml(appointment.manufacturer)}</strong>
                            <span>${escapeHtml(appointment.displayClassification || "")}</span>
                        </div>`).join("")}
                    ${atHour.length > 1 ? `<button type="button" class="week-more-button" data-more-date="${dateToISO(date)}">+${atHour.length - 1} mais · Ver dia</button>` : ""}
                </div>`;
            }
            html += `</div>`;
        });
        weekCalendar.innerHTML = `${html}</div>`;
    }

    /* CALENDÁRIO DIÁRIO: UM CARTÃO POR HORÁRIO */
    function renderDay() {
        if (!dayCalendar) return;
        const dayAppointments = getAppointmentsForDate(currentDate);
        let html = `
            <div class="day-view-header"><div>
                <span>${escapeHtml(weekdayNames[currentDate.getDay()].toUpperCase())}</span>
                <strong>${String(currentDate.getDate()).padStart(2, "0")} de ${escapeHtml(monthNames[currentDate.getMonth()])} de ${currentDate.getFullYear()}</strong>
            </div></div><div class="day-timeline">`;

        for (let hour = 8; hour <= 18; hour++) {
            const atHour = dayAppointments.filter(item => Number(String(item.time || "").split(":")[0]) === hour);
            html += `<div class="day-timeline-row">
                <div class="day-timeline-time">${String(hour).padStart(2, "0")}:00</div>
                <div class="day-timeline-content" data-date="${dateToISO(currentDate)}" data-hour="${hour}">`;
            if (!atHour.length) {
                html += `<div class="day-empty">Nenhum agendamento</div>`;
            } else {
                html += atHour.slice(0, 1).map(appointment => `
                    <div class="day-appointment ${escapeHtml(appointment.status)} ${escapeHtml(appointment.ruptureRiskClass || "rupture-impact-unclassified")} ${appointment.completed ? "completed" : ""}"
                        data-appointment-key="${escapeHtml(appointment.displayKey)}"
                        data-date="${escapeHtml(appointment.date)}" role="button" tabindex="0"
                        title="${escapeHtml(appointment.fullClassification || "")}">
                        <div class="day-appointment-main"><span class="day-status-dot"></span><div>
                            <strong>${escapeHtml(appointment.manufacturer)}</strong>
                            <small>${escapeHtml(appointment.group)} · ${escapeHtml(appointment.displayClassification || "")}</small>
                        </div></div>
                        <span class="day-status">${escapeHtml(appointment.statusLabel)}</span>
                    </div>`).join("");
                if (atHour.length > 1) {
                    html += `<button type="button" class="day-more-button" data-more-date="${dateToISO(currentDate)}">+${atHour.length - 1} mais · Ver dia</button>`;
                }
            }
            html += `</div></div>`;
        }
        dayCalendar.innerHTML = `${html}</div>`;
    }

    /* MODAL +N MAIS: MOSTRA TODOS OS COMPROMISSOS DA DATA */
    function ensureMoreAppointmentsModal() {
        let overlay = document.getElementById("agendaMoreAppointmentsOverlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "agendaMoreAppointmentsOverlay";
        overlay.className = "agenda-more-overlay";
        overlay.hidden = true;
        overlay.innerHTML = `
            <section class="agenda-more-modal" role="dialog" aria-modal="true" aria-labelledby="agendaMoreTitle">
                <header class="agenda-more-header"><div>
                    <h2 id="agendaMoreTitle">Compromissos do dia</h2><p id="agendaMoreSubtitle"></p>
                </div><button type="button" class="agenda-more-close" data-close-more aria-label="Fechar">×</button></header>
                <div class="agenda-more-list" id="agendaMoreList"></div>
            </section>`;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", event => {
            if (!(event.target instanceof Element)) return;
            if (event.target === overlay || event.target.closest("[data-close-more]")) {
                overlay.hidden = true;
                return;
            }
            const item = event.target.closest(".agenda-more-item[data-appointment-key]");
            if (!item) return;
            const appointment = findDisplayAppointment(item.dataset.date, item.dataset.appointmentKey);
            if (appointment) {
                overlay.hidden = true;
                showAppointmentDetails(appointment);
            }
        });

        overlay.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (!(event.target instanceof Element)) return;
            const item = event.target.closest(".agenda-more-item[data-appointment-key]");
            if (!item) return;
            event.preventDefault();
            const appointment = findDisplayAppointment(item.dataset.date, item.dataset.appointmentKey);
            if (appointment) {
                overlay.hidden = true;
                showAppointmentDetails(appointment);
            }
        });
        return overlay;
    }

    function showMoreAppointments(dateISO) {
        const date = parseISODate(dateISO);
        if (!date) return;
        const listItems = getAppointmentsForDate(date);
        const overlay = ensureMoreAppointmentsModal();
        overlay.querySelector("#agendaMoreTitle").textContent = "Compromissos do dia";
        overlay.querySelector("#agendaMoreSubtitle").textContent = `${weekdayNames[date.getDay()]} · ${formatDateShort(date)}/${date.getFullYear()}`;
        const list = overlay.querySelector("#agendaMoreList");
        list.innerHTML = listItems.length ? listItems.map(appointment => `
            <article class="agenda-more-item ${escapeHtml(appointment.status || "normal")} ${escapeHtml(appointment.ruptureRiskClass || "rupture-impact-unclassified")} ${appointment.completed ? "completed" : ""}" data-appointment-key="${escapeHtml(appointment.displayKey)}" data-date="${escapeHtml(appointment.date)}" role="button" tabindex="0">
                <div class="agenda-more-item-time">${escapeHtml(appointment.time || "—")}</div>
                <div class="agenda-more-item-details">
                    <strong>${escapeHtml(appointment.manufacturer)}</strong>
                    <span>${escapeHtml(appointment.group)} · ${escapeHtml(appointment.displayClassification || "")}</span>
                    <small>${escapeHtml(appointment.statusLabel || "Normal")} · ${appointment.recurring ? "Recorrente" : "Pontual"}</small>
                </div>
            </article>`).join("") : `<div class="agenda-more-empty">Nenhum compromisso encontrado nesta data.</div>`;
        overlay.hidden = false;
        overlay.querySelector("[data-close-more]")?.focus();
    }

    function findDisplayAppointment(dateISO, displayKey) {
        if (!dateISO || !displayKey) return null;
        const date = parseISODate(dateISO);
        if (!date) return null;
        return getAppointmentsForDate(date).find(item => item.displayKey === displayKey) || null;
    }

/* =====================================================
   ABRIR NOVO AGENDAMENTO
   Bloqueado no modo somente leitura do ADM
===================================================== */

function openNewAppointmentForDate(dateISO, time = "") {

    if (READ_ONLY) {
        return;
    }

    if (typeof window.abrirNovoAgendamento !== "function") {
        window.alert(
            "A caixa padrão de Novo Agendamento não está disponível."
        );
        return;
    }

    window.abrirNovoAgendamento({
        dataAgendamento: dateISO,
        horaInicio: time
    });
}

    /* INDICADORES: SOMENTE IMPORTAÇÃO ATUAL E COMBINAÇÃO EXATA */
    function getOperationalRowsForScope(appointment) {
        if (!appointment?.groupId || !appointment?.classificationId || !appointment?.manufacturerId) return [];
        return operationalRows.filter(row =>
            String(row.grupo_id) === String(appointment.groupId) &&
            String(row.classificacao_id) === String(appointment.classificationId) &&
            String(row.fabricante_id) === String(appointment.manufacturerId)
        );
    }

    function validNumbers(rows, field) {
        return rows.map(row => row[field])
            .filter(value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)))
            .map(Number);
    }

    function sumField(rows, field) {
        const values = validNumbers(rows, field);
        return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    }

    // Para ruptura em valor, só aceita a soma quando TODAS as linhas do escopo têm valor válido.
    // Isso evita colorir ou exibir como completo um total que esteja faltando em alguma UF.
    function getCompleteSumField(rows, field) {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const values = validNumbers(rows, field);
        if (values.length !== rows.length) return null;
        const total = values.reduce((sum, value) => sum + value, 0);
        return Number.isFinite(total) ? total : null;
    }

    function averageValues(values) {
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    }

    function medianValue(values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    function curveToRank(value) {
        const normalized = normalizeText(value);
        const match = normalized.match(/\b([ABCD])\b/);
        if (!match) return null;
        return ({ A: 1, B: 2, C: 3, D: 4 })[match[1]];
    }

    function rankToCurve(rank) {
        if (rank === null || rank === undefined || !Number.isFinite(rank)) return "—";
        const labels = ["A", "B", "C", "D"];
        const bounded = Math.max(1, Math.min(4, rank));
        const lower = Math.floor(bounded);
        const upper = Math.ceil(bounded);
        if (lower === upper) return labels[lower - 1];
        return `${labels[lower - 1]}/${labels[upper - 1]}`;
    }

    /* Uma combinação pode ter linhas por UF; soma valores aditivos e resume indicadores não aditivos. */
    function getMetricForScope(appointment) {
        const rows = getOperationalRowsForScope(appointment);
        if (!rows.length) return null;

        const days = validNumbers(rows, "dias_sem_estoque");
        const curveQty = rows.map(row => curveToRank(row.curva_qtd)).filter(value => value !== null);
        const curveValue = rows.map(row => curveToRank(row.curva_valor)).filter(value => value !== null);

        const ruptureValue = getCompleteSumField(rows, "ruptura_valor");

        return {
            ruptureValue,
            ruptureValueComplete: ruptureValue !== null,
            ruptureQuantity: sumField(rows, "ruptura_quantidade"),
            totalSold: sumField(rows, "total_vendido"),
            daysWithoutStock: averageValues(days),
            curveQtyRank: medianValue(curveQty),
            curveValueRank: medianValue(curveValue),
            sourceRows: rows.length,
            hasData: true
        };
    }

    /* Consolida uma vez cada combinação distinta (grupo + classificação + fabricante). */
    function getAppointmentMetrics(sourceAppointments) {
        const scopes = new Map();
        (sourceAppointments || []).forEach(source => {
            const key = [source.groupId, source.classificationId, source.manufacturerId].join("|");
            if (!scopes.has(key)) scopes.set(key, source);
        });

        const scopeMetrics = [...scopes.values()].map(source => ({
            source,
            metric: getMetricForScope(source)
        }));
        const foundMetrics = scopeMetrics.map(item => item.metric).filter(Boolean);
        const sumMetrics = field => {
            const values = foundMetrics.map(metric => metric[field]).filter(value => value !== null && value !== undefined && Number.isFinite(value));
            return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
        };
        const averageMetric = field => averageValues(foundMetrics.map(metric => metric[field]).filter(value => value !== null && value !== undefined && Number.isFinite(value)));
        const medianMetric = field => medianValue(foundMetrics.map(metric => metric[field]).filter(value => value !== null && value !== undefined && Number.isFinite(value)));
        const ruptureValueComplete = scopeMetrics.length > 0 && scopeMetrics.every(({ metric }) =>
            Boolean(metric && metric.ruptureValueComplete)
        );
        const ruptureValue = ruptureValueComplete
            ? scopeMetrics.reduce((sum, { metric }) => sum + metric.ruptureValue, 0)
            : null;

        return {
            scopeMetrics,
            totalScopes: scopes.size,
            scopesWithData: foundMetrics.length,
            ruptureValue,
            ruptureValueComplete,
            ruptureQuantity: sumMetrics("ruptureQuantity"),
            totalSold: sumMetrics("totalSold"),
            daysWithoutStock: averageMetric("daysWithoutStock"),
            curveQtyRank: medianMetric("curveQtyRank"),
            curveValueRank: medianMetric("curveValueRank")
        };
    }

    /* =========================================================
   CLASSIFICAÇÃO FINANCEIRA DA RUPTURA
   Independente da situação do compromisso
========================================================= */

function getFinancialRiskClass(sourceAppointments) {
    const uniqueScopes = new Map();

    (sourceAppointments || []).forEach(source => {
        const key = [
            source.groupId || "",
            source.classificationId || "",
            source.manufacturerId || ""
        ].join("|");

        if (!uniqueScopes.has(key)) {
            uniqueScopes.set(key, source);
        }
    });

    if (!uniqueScopes.size) {
        return "rupture-impact-unclassified";
    }

    const scopeTotals = [];

    for (const source of uniqueScopes.values()) {
        const rows = getOperationalRowsForScope(source);

        if (!rows.length) {
            return "rupture-impact-unclassified";
        }

        const values = validNumbers(rows, "ruptura_valor");

        // Não classificar usando apenas dados financeiros parciais.
        if (values.length !== rows.length) {
            return "rupture-impact-unclassified";
        }

        const scopeTotal = values.reduce(
            (sum, value) => sum + value,
            0
        );

        if (!Number.isFinite(scopeTotal)) {
            return "rupture-impact-unclassified";
        }

        scopeTotals.push(scopeTotal);
    }

    const total = scopeTotals.reduce(
        (sum, value) => sum + value,
        0
    );

    if (!Number.isFinite(total) || total <= 0) {
        return "rupture-impact-unclassified";
    }

    if (total <= 50) {
        return "rupture-impact-low";
    }

    if (total <= 250) {
        return "rupture-impact-attention";
    }

    if (total <= 1000) {
        return "rupture-impact-high";
    }

    return "rupture-impact-critical";
}

        /* MODAL DE DETALHES — ESTRUTURA ÚNICA, ESTILO LEVE */
    function ensureAppointmentDetailsModal() {
        let overlay = document.getElementById("agendaDetailsOverlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "agendaDetailsOverlay";
        overlay.className = "agenda-details-overlay gcal-overlay";
        overlay.hidden = true;
        overlay.innerHTML = `
            <section class="agenda-details-modal gcal-modal" role="dialog" aria-modal="true" aria-labelledby="agendaDetailsTitle">
                <header class="gcal-header">
                    <div class="gcal-header-content">
                        <span class="gcal-eyebrow">AGENDA DE COMPRAS</span>
                        <h2 id="agendaDetailsTitle">Detalhes do compromisso</h2>
                        <p id="agendaDetailsSubtitle" class="gcal-subtitle"></p>
                        <div id="agendaDetailsContext" class="gcal-context"></div>
                    </div>
                    <button type="button" class="gcal-close" data-close-agenda-details aria-label="Fechar detalhes" title="Fechar">×</button>
                </header>
                <div class="gcal-body">
                    <section class="gcal-section">
                        <h3 class="gcal-section-title"><span class="gcal-icon" aria-hidden="true">◷</span>Detalhes principais</h3>
                        <div id="agendaDetailsSummary" class="gcal-information-list"></div>
                    </section>
                    <section class="gcal-section">
                        <h3 class="gcal-section-title"><span class="gcal-icon" aria-hidden="true">▥</span>Indicadores operacionais</h3>
                        <p class="gcal-section-description">Valores da combinação exata de grupo, classificação e fabricante.</p>
                        <div id="agendaDetailsOperational" class="gcal-operational-list"></div>
                    </section>
                    <footer class="gcal-footer">
                        <div class="gcal-footer-info">
                            <div class="gcal-note">
                                <span class="gcal-note-icon" aria-hidden="true">i</span>
                                <p>A situação do compromisso é independente da ruptura. Concluir uma compra não significa que a ruptura já foi resolvida na base operacional.</p>
                            </div>
                            <p class="gcal-scope-note">Editar e concluir atuam somente sobre a ocorrência selecionada. <strong>Excluir remove definitivamente toda a regra recorrente e todas as datas vinculadas.</strong></p>
                        </div>
                        <div class="gcal-footer-actions">
                            <form id="agendaOccurrenceEditForm" class="gcal-edit-form" hidden>
                                <label for="agendaOccurrenceEditDate">Nova data</label>
                                <input id="agendaOccurrenceEditDate" name="data" type="date" required>
                                <label for="agendaOccurrenceEditTime">Novo horário</label>
                                <input id="agendaOccurrenceEditTime" name="hora" type="time" required>
                                <p>A alteração será aplicada a todas as combinações agrupadas desta ocorrência, somente nesta data.</p>
                            </form>
                            <div id="agendaDetailsActions" class="gcal-action-buttons">
                                <button type="button" class="gcal-btn gcal-btn-edit" data-agenda-action="edit">Editar</button>
                                <button type="button" class="gcal-btn gcal-btn-complete" data-agenda-action="complete">Concluir</button>
                                <button type="button" class="gcal-btn gcal-btn-delete" data-agenda-action="delete">Excluir recorrência</button>
                            </div>
                            <div id="agendaDetailsEditActions" class="gcal-action-buttons" hidden>
                                <button type="submit" form="agendaOccurrenceEditForm" class="gcal-btn gcal-btn-edit">Salvar alteração</button>
                                <button type="button" class="gcal-btn gcal-btn-cancel" data-agenda-action="cancel-edit">Cancelar</button>
                            </div>
                        </div>
                    </footer>
                </div>
            </section>`;
        document.body.appendChild(overlay);

        const editForm = overlay.querySelector("#agendaOccurrenceEditForm");
        const editDate = overlay.querySelector("#agendaOccurrenceEditDate");
        const editTime = overlay.querySelector("#agendaOccurrenceEditTime");
        const normalActions = overlay.querySelector("#agendaDetailsActions");
        const editActions = overlay.querySelector("#agendaDetailsEditActions");

        function leaveEditMode() {
            editForm.hidden = true;
            normalActions.hidden = false;
            editActions.hidden = true;
        }

        function setActionButtonsDisabled(disabled) {
            overlay.querySelectorAll("[data-agenda-action], #agendaDetailsEditActions button, #agendaDetailsActions button")
                .forEach(button => { button.disabled = disabled; });
        }

async function runOccurrenceAction(actionName, payload) {

    // Nenhuma ação de gravação pode ser executada
    // durante a visualização administrativa.
    if (READ_ONLY) {
        console.warn(
            "Ação bloqueada: agenda em modo somente leitura."
        );
        return null;
    }

    if (!selectedAppointment || isSavingOccurrenceAction) {
        return null;
    }
            isSavingOccurrenceAction = true;
            setActionButtonsDisabled(true);
            try {
                const { data, error } = await supabaseClient.rpc(actionName, payload);
                if (error) throw error;
                overlay.hidden = true;
                leaveEditMode();
                await loadAppointments();

                if (actionName === "concluir_agendamento_ocorrencia") {
                    window.alert("Ocorrência concluída. As outras datas da recorrência não foram alteradas.");
                } else if (actionName === "excluir_recorrencia_agendamento") {
                    const count = Number(data?.ocorrencias_excluidas ?? 0);
                    const lineCount = Number(data?.combinacoes_agenda_removidas ?? 0);
                    window.alert(
                        `Recorrência excluída definitivamente.\n\n` +
                        `Ocorrências removidas: ${count}.\n` +
                        `Combinações removidas da agenda: ${lineCount}.\n\n` +
                        `A regra recorrente e todas as suas datas foram removidas do banco.`
                    );
                } else {
                    window.alert("Data e horário da ocorrência atualizados. As outras datas da recorrência não foram alteradas.");
                }
                return data;
            } catch (error) {
                console.error(`Erro na ação ${actionName}:`, error);
                window.alert(
                    `Não foi possível executar a ação. Confira se o SQL atualizado foi executado no Supabase e se a sessão está autenticada.\n\n` +
                    `Detalhe: ${error?.message || error}`
                );
                return null;
            } finally {
                isSavingOccurrenceAction = false;
                setActionButtonsDisabled(false);
            }
        }

        overlay.addEventListener("click", async event => {
            if (!(event.target instanceof Element)) return;
            const actionButton = event.target.closest("[data-agenda-action]");
            if (actionButton) {
                event.preventDefault();
                const action = actionButton.dataset.agendaAction;
                if (READ_ONLY) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
}

                if (!selectedAppointment) return;

                if (action === "edit") {
                    const ruleId = selectedAppointment.ruleId;
                    if (!ruleId) {
                        window.alert("Não foi possível identificar a regra deste agendamento.");
                        return;
                    }
                    if (typeof window.abrirNovoAgendamento !== "function") {
                        window.alert("O formulário de Novo Agendamento não está disponível.");
                        return;
                    }
                    overlay.hidden = true;
                    leaveEditMode();
                    window.abrirNovoAgendamento({ mode: "edit", ruleId: ruleId });
                    return;
                }

                if (action === "cancel-edit") {
                    leaveEditMode();
                    return;
                }

                const dateText = formatDateISO(selectedAppointment.date);
                const timeText = selectedAppointment.time || "horário não informado";

                if (action === "complete") {
                    if (selectedAppointment.completed) return;
                    const confirmed = window.confirm(
                        `Concluir a ocorrência inteira?

` +
                        `Esta ação marcará como concluídos TODOS os registros de fabricantes e classificações vinculados a esta ocorrência de ${dateText}, às ${timeText}, mesmo que alguma combinação não apareça neste cartão.

` +
                        `As outras datas da regra recorrente permanecerão inalteradas.`
                    );
                    if (!confirmed) return;
                    await runOccurrenceAction("concluir_agendamento_ocorrencia", {
                        p_agendamento_id: selectedAppointment.id,
                        p_comprador_id: COMPRADOR_ID,
                        p_grupo_id: selectedAppointment.groupId
                    });
                    return;
                }

                if (action === "delete") {
                    if (!selectedAppointment.ruleId) {
                        window.alert("Não foi possível identificar a regra deste agendamento. Nenhum dado foi excluído.");
                        return;
                    }

                    const payload = {
                        p_regra_agendamento_id: selectedAppointment.ruleId,
                        p_comprador_id: COMPRADOR_ID,
                        p_grupo_id: selectedAppointment.groupId
                    };

                    let preview = null;
                    isSavingOccurrenceAction = true;
                    setActionButtonsDisabled(true);
                    try {
                        const { data, error } = await supabaseClient.rpc("prever_exclusao_recorrencia", payload);
                        if (error) throw error;
                        preview = data;
                    } catch (error) {
                        console.error("Erro ao consultar o impacto da exclusão:", error);
                        window.alert(
                            `Não foi possível verificar quais dados seriam excluídos. Nada foi apagado.\n\n` +
                            `Confirme se o SQL atualizado foi executado e se você está autenticado no Supabase.\n\n` +
                            `Detalhe: ${error?.message || error}`
                        );
                    } finally {
                        isSavingOccurrenceAction = false;
                        setActionButtonsDisabled(false);
                    }
                    if (!preview) return;

                    const totalOcorrencias = Number(preview.ocorrencias || 0);
                    const totalFabricantes = Number(preview.fabricantes || 0);
                    const totalClassificacoes = Number(preview.classificacoes || 0);
                    const totalCombinacoes = Number(preview.combinacoes_agenda || 0);
                    const nomeRegra = preview.nome || selectedAppointment.manufacturerReal || selectedAppointment.manufacturer || "Agendamento";
                    const primeiraData = preview.primeira_data ? formatDateISO(preview.primeira_data) : dateText;
                    const ultimaData = preview.ultima_data ? formatDateISO(preview.ultima_data) : dateText;
                    const recorrencia = preview.recorrente === true;
                    const tipoExclusao = recorrencia ? "EXCLUIR TODA A RECORRÊNCIA" : "EXCLUIR O AGENDAMENTO";

                    const confirmed = window.confirm(
                        `⚠ ${tipoExclusao} — EXCLUSÃO DEFINITIVA\n\n` +
                        `Nome: ${nomeRegra}\n` +
                        `Período abrangido: ${primeiraData} até ${ultimaData}\n` +
                        `Ocorrências que serão excluídas: ${totalOcorrencias}\n` +
                        `Fabricantes vinculados: ${totalFabricantes}\n` +
                        `Classificações vinculadas: ${totalClassificacoes}\n` +
                        `Combinações removidas da agenda: ${totalCombinacoes}\n\n` +
                        `A regra será apagada do banco, junto com TODAS as datas e os vínculos dessa recorrência. ` +
                        `Isso removerá o compromisso de todas as visualizações da agenda.\n\n` +
                        `Esta ação é permanente e não poderá ser desfeita. Os cadastros gerais de fabricantes, classificações, grupos e compradores serão preservados.\n\n` +
                        `Tem certeza de que deseja continuar?`
                    );
                    if (!confirmed) return;

                    await runOccurrenceAction("excluir_recorrencia_agendamento", payload);
                }
                return;
            }

            if (event.target === overlay || event.target.closest("[data-close-agenda-details]")) {
                leaveEditMode();
                overlay.hidden = true;
            }
        });

        editForm.addEventListener("submit", async event => {
            if (READ_ONLY) {
    event.preventDefault();
    return;
}
            event.preventDefault();
            if (!selectedAppointment || !editForm.reportValidity()) return;
            const newDate = editDate.value;
            const newTime = editTime.value;
            if (!newDate || !newTime) return;

            const confirmed = window.confirm(
                `Confirmar alteração de data e horário?

` +
                `A mudança será aplicada a TODOS os registros de fabricantes e classificações vinculados a esta ocorrência, mesmo que alguma combinação não apareça neste cartão. As demais datas da recorrência não serão alteradas.

` +
                `Nova data: ${formatDateISO(newDate)} às ${newTime}.`
            );
            if (!confirmed) return;

            await runOccurrenceAction("editar_agendamento_ocorrencia", {
                p_agendamento_id: selectedAppointment.id,
                p_comprador_id: COMPRADOR_ID,
                p_grupo_id: selectedAppointment.groupId,
                p_data_nova: newDate,
                p_hora_nova: newTime
            });
        });

        return overlay;
    }

    /* PREENCHER MODAL: CABEÇALHO + TRÊS DETALHES + KPIs */
    function showAppointmentDetails(appointment) {
        if (!appointment) return;
        selectedAppointment = appointment;
        const overlay = ensureAppointmentDetailsModal();
        /* =========================================
   MODO ADM — SOMENTE VISUALIZAÇÃO
========================================= */

if (READ_ONLY) {

    const footerActions = overlay.querySelector(
        ".gcal-footer-actions"
    );

    if (footerActions) {
        footerActions.style.display = "none";
    }

    const scopeNote = overlay.querySelector(
        ".gcal-scope-note"
    );

    if (scopeNote) {
        scopeNote.style.display = "none";
    }
}

        const title = overlay.querySelector("#agendaDetailsTitle");
        const subtitle = overlay.querySelector("#agendaDetailsSubtitle");
        const context = overlay.querySelector("#agendaDetailsContext");
        const summary = overlay.querySelector("#agendaDetailsSummary");
        const operational = overlay.querySelector("#agendaDetailsOperational");
        const sources = appointment.sourceAppointments?.length ? appointment.sourceAppointments : [appointment];

        const classifications = [...new Set(sources.map(item => item.classification).filter(Boolean).map(getClassificationLabel))];
        const manufacturers = [...new Set(sources.map(item => item.manufacturerReal).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "pt-BR"));
        const classificationText = classifications.join(" · ") || "Não informada";
        const manufacturerText = manufacturers.join(" · ") || appointment.manufacturerReal || "Não informado";
        const date = parseISODate(appointment.date);

        /* O nome visual identifica a regra; os fabricantes reais ficam no contexto. */
        title.textContent = appointment.manufacturer || appointment.manufacturerReal || "Compromisso de compras";
        subtitle.textContent = [date ? weekdayNames[date.getDay()] : "", formatDateISO(appointment.date), appointment.time || "Horário não informado"].filter(Boolean).join(" · ");
        context.innerHTML = `
            <span>GRUPO <strong>${escapeHtml(appointment.groupName || appointment.group || "—")}</strong></span>
            <span class="gcal-context-separator">·</span>
            <span>FABRICANTES <strong>${escapeHtml(manufacturerText)}</strong></span>
            <span class="gcal-context-separator">·</span>
            <span>CLASSIFICAÇÕES <strong>${escapeHtml(classificationText)}</strong></span>
            <span class="gcal-context-separator">·</span>
            <span class="gcal-recurring-label">${appointment.recurring ? "RECORRENTE" : "PONTUAL"}</span>`;

        const observation = String(appointment.observation || "").trim() || "Nenhuma observação registrada.";
        summary.innerHTML = `
            <div class="gcal-details-list">
                <div class="gcal-detail-row"><span class="gcal-detail-label">Situação atual</span><strong class="gcal-detail-value">${escapeHtml(appointment.statusLabel || "Normal")}</strong></div>
                <div class="gcal-detail-row"><span class="gcal-detail-label">Modo salvo na regra</span><strong class="gcal-detail-value">${escapeHtml(appointment.mode || "JUNTAS")}</strong></div>
                <div class="gcal-detail-row"><span class="gcal-detail-label">Exibição atual</span><strong class="gcal-detail-value">${escapeHtml(appointment.effectiveDisplayMode || appointment.mode || "JUNTAS")}</strong></div>
                <div class="gcal-detail-row gcal-observation-row"><span class="gcal-detail-label">Observação</span><p class="gcal-detail-observation">${escapeHtml(observation)}</p></div>
            </div>`;

        const appointmentMetrics = getAppointmentMetrics(sources);
        const isConsolidated = ["JUNTAS", "AGRUPADAS", "CONSOLIDADAS"].includes(appointment.effectiveDisplayMode) && sources.length > 1;
        const metricCard = (label, value, featured = false, extraClass = "") => `
            <article class="gcal-kpi-card ${featured ? "gcal-kpi-featured" : ""} ${extraClass}">
                <span class="gcal-kpi-label">${escapeHtml(label)}</span>
                <strong class="gcal-kpi-value">${escapeHtml(value)}</strong>
            </article>`;

        const summaryTitle = !isConsolidated
            ? "Indicadores da combinação"
            : appointment.effectiveDisplayMode === "AGRUPADAS"
                ? "Resumo agrupado do fabricante"
                : "Resumo consolidado da ocorrência";
        const curveQtyLabel = rankToCurve(appointmentMetrics.curveQtyRank);
        const curveValueLabel = rankToCurve(appointmentMetrics.curveValueRank);
        const summaryHasData = appointmentMetrics.scopesWithData > 0;
        const summaryFinancialRiskClass = getFinancialRiskClass(sources);
// Identifica as combinações com ruptura em valor completa.
const scopesWithCompleteFinancialValue = appointmentMetrics.scopeMetrics.filter(
    ({ metric }) =>
        Boolean(
            metric &&
            metric.ruptureValueComplete &&
            Number.isFinite(metric.ruptureValue)
        )
);

// Quantas combinações possuem um valor financeiro válido.
const financialScopesWithValue = scopesWithCompleteFinancialValue.length;

// Soma somente os valores completos das combinações disponíveis.
const availableRuptureValue = scopesWithCompleteFinancialValue.reduce(
    (sum, { metric }) => sum + metric.ruptureValue,
    0
);

// Se todas as combinações estiverem completas, mostra o total normal.
// Se houver combinações incompletas, mostra o valor disponível como parcial.
const summaryRuptureText = appointmentMetrics.ruptureValueComplete
    ? formatCurrency(appointmentMetrics.ruptureValue)
    : financialScopesWithValue > 0
        ? `${formatCurrency(availableRuptureValue)}`
        : "Sem dados";
        const coverageText = appointmentMetrics.totalScopes
            ? `${appointmentMetrics.scopesWithData} de ${appointmentMetrics.totalScopes} combinações com dados`
            : "Nenhuma combinação disponível";

        const summaryHtml = `
            <section class="gcal-kpi-section">
                <header class="gcal-kpi-heading">
                    <h4>${escapeHtml(summaryTitle)}</h4>
                    <span class="gcal-data-indicator ${summaryHasData && appointmentMetrics.scopesWithData === appointmentMetrics.totalScopes ? "is-available" : "is-unavailable"}"><span class="gcal-data-dot"></span>${escapeHtml(coverageText)}</span>
                </header>
                <div class="gcal-kpi-grid">
                    ${metricCard("Ruptura em valor · soma", summaryRuptureText, true, `gcal-kpi-financial ${summaryFinancialRiskClass}`)}
                    ${metricCard("Ruptura em quantidade · soma", formatNumber(appointmentMetrics.ruptureQuantity), true)}
                    ${metricCard("Dias sem estoque · média", formatNumber(appointmentMetrics.daysWithoutStock, 1))}
                    ${metricCard("Total vendido · soma", formatNumber(appointmentMetrics.totalSold))}
                    ${metricCard("Curva por quantidade · mediana", curveQtyLabel)}
                    ${metricCard("Curva por valor · mediana", curveValueLabel)}
                </div>

            </section>`;

        const detailsHtml = appointmentMetrics.scopeMetrics.map(({ source, metric }) => {
            const hasData = Boolean(metric);
            const manufacturerName = source.manufacturerReal || source.manufacturer || "Fabricante não identificado";
            const classificationName = getClassificationLabel(source.classification) || "Sem classificação";
            const detailRiskClass = getFinancialRiskClass([source]);
            const detailRuptureText = metric?.ruptureValueComplete
                ? formatCurrency(metric.ruptureValue)
                : "Sem dados";
            return `
                <section class="gcal-kpi-section">
                    <header class="gcal-kpi-heading">
                        <h4>${escapeHtml(manufacturerName)} · ${escapeHtml(classificationName)}</h4>
                        <span class="gcal-data-indicator ${hasData ? "is-available" : "is-unavailable"}"><span class="gcal-data-dot"></span>${hasData ? "Detalhamento" : "Sem dados"}</span>
                    </header>
                    <div class="gcal-kpi-grid">
                        ${metricCard("Ruptura em valor", detailRuptureText, true, `gcal-kpi-financial ${detailRiskClass}`)}
                        ${metricCard("Ruptura em quantidade", formatNumber(metric?.ruptureQuantity), true)}
                        ${metricCard("Dias sem estoque · média", formatNumber(metric?.daysWithoutStock, 1))}
                        ${metricCard("Total vendido", formatNumber(metric?.totalSold))}
                        ${metricCard("Curva por quantidade · mediana", rankToCurve(metric?.curveQtyRank))}
                        ${metricCard("Curva por valor · mediana", rankToCurve(metric?.curveValueRank))}
                    </div>
                </section>`;
        }).join("");

        const compositionTitle = appointment.effectiveDisplayMode === "AGRUPADAS"
            ? "Detalhamento por classificação do fabricante"
            : "Composição do consolidado por fabricante e classificação";
        operational.innerHTML = isConsolidated
            ? summaryHtml + `<div class="gcal-kpi-heading"><h4>${escapeHtml(compositionTitle)}</h4></div>${detailsHtml}`
            : summaryHtml;

        const deleteButton = overlay.querySelector('[data-agenda-action="delete"]');
        if (deleteButton) {
            deleteButton.textContent = appointment.recurring ? "Excluir recorrência" : "Excluir agendamento";
            deleteButton.title = appointment.recurring
                ? "Excluir definitivamente a regra e todas as datas vinculadas"
                : "Excluir definitivamente este agendamento e todos os registros vinculados à sua regra";
        }

        const completeButton = overlay.querySelector('[data-agenda-action="complete"]');
        if (completeButton) {
            completeButton.textContent = appointment.completed || appointment.status === "completed" ? "Concluído" : "Concluir";
            completeButton.disabled = appointment.completed || appointment.status === "completed";
            completeButton.title = completeButton.disabled ? "Esta ocorrência já foi concluída." : "Concluir todos os registros agrupados desta ocorrência";
        }
        const normalActions = overlay.querySelector("#agendaDetailsActions");
        if (normalActions) normalActions.hidden = false;

        overlay.hidden = false;
        const body = overlay.querySelector(".gcal-body");
        if (body) body.scrollTop = 0;
        overlay.querySelector(".gcal-close")?.focus();
    }

        /* INTERAÇÕES DO CALENDÁRIO — REGISTRADAS UMA ÚNICA VEZ */
    function setupCalendarInteractions() {
        function handleCalendarClick(event) {
            if (!(event.target instanceof Element)) return;

            const moreButton = event.target.closest("[data-more-date]");
            if (moreButton) {
                event.preventDefault();
                event.stopPropagation();
                showMoreAppointments(moreButton.dataset.moreDate);
                return;
            }

            const card = event.target.closest(
                ".calendar-appointment[data-appointment-key], .week-appointment[data-appointment-key], .day-appointment[data-appointment-key]"
            );
            if (card) {
                event.preventDefault();
                event.stopPropagation();
                const appointment = findDisplayAppointment(card.dataset.date, card.dataset.appointmentKey);
                if (appointment) showAppointmentDetails(appointment);
                return;
            }

            const monthCell = event.target.closest(".calendar-day[data-date]");
            if (monthCell && monthCalendar?.contains(monthCell)) {
                openNewAppointmentForDate(monthCell.dataset.date);
                return;
            }

            const weekSlot = event.target.closest(".week-slot[data-date][data-hour]");
            if (weekSlot && weekCalendar?.contains(weekSlot)) {
                const hour = Number(weekSlot.dataset.hour);
                openNewAppointmentForDate(weekSlot.dataset.date, `${String(hour).padStart(2, "0")}:00`);
                return;
            }

            const dayContent = event.target.closest(".day-timeline-content[data-date][data-hour]");
            if (dayContent && dayCalendar?.contains(dayContent)) {
                const hour = Number(dayContent.dataset.hour);
                openNewAppointmentForDate(dayContent.dataset.date, `${String(hour).padStart(2, "0")}:00`);
            }
        }

        [monthCalendar, weekCalendar, dayCalendar].forEach(container => {
            if (!container) return;
            container.addEventListener("click", handleCalendarClick);
            container.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (!(event.target instanceof Element)) return;
                const card = event.target.closest(
                    ".calendar-appointment[data-appointment-key], .week-appointment[data-appointment-key], .day-appointment[data-appointment-key]"
                );
                if (!card || !container.contains(card)) return;
                event.preventDefault();
                const appointment = findDisplayAppointment(card.dataset.date, card.dataset.appointmentKey);
                if (appointment) showAppointmentDetails(appointment);
            });
        });
    }

    /* RENDERIZAÇÃO */
    function renderCurrentView() {
        if (currentView === "month") renderMonth();
        else if (currentView === "week") renderWeek();
        else if (currentView === "day") renderDay();
        updatePeriodTitle();
        updateNavigationButtons();
    }

    function changeView(view) {
        if (!["month", "week", "day"].includes(view)) return;
        currentView = view;
        viewButtons.forEach(button => button.classList.toggle("active", button.dataset.view === view));
        monthView?.classList.toggle("active", view === "month");
        weekView?.classList.toggle("active", view === "week");
        dayView?.classList.toggle("active", view === "day");
        renderCurrentView();
    }

    function updateNavigationButtons() {
        if (!previousPeriod || !nextPeriod) return;
        if (currentView === "month") {
            const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const startMonth = new Date(horizonStart);
            const lastAllowedMonth = new Date(horizonStart.getFullYear(), horizonStart.getMonth() + 1, 1);
            previousPeriod.disabled = currentMonth <= startMonth;
            nextPeriod.disabled = currentMonth >= lastAllowedMonth;
            return;
        }
        if (currentView === "day") {
            const previousDay = new Date(currentDate);
            previousDay.setDate(previousDay.getDate() - 1);
            const nextDay = new Date(currentDate);
            nextDay.setDate(nextDay.getDate() + 1);
            previousPeriod.disabled = previousDay < horizonStart;
            nextPeriod.disabled = nextDay > horizonEnd;
            return;
        }
        const currentMonday = getMonday(currentDate);
        previousPeriod.disabled = currentMonday <= getMonday(horizonStart);
        nextPeriod.disabled = currentMonday >= getMonday(horizonEnd);
    }

    /* BOTÕES DE NAVEGAÇÃO */
    viewButtons.forEach(button => button.addEventListener("click", () => changeView(button.dataset.view)));

    todayButton?.addEventListener("click", () => {
        currentDate = new Date(today);
        changeView("day");
    });

    previousPeriod?.addEventListener("click", () => {
        if (previousPeriod.disabled) return;
        if (currentView === "month") currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        else currentDate.setDate(currentDate.getDate() + (currentView === "week" ? -7 : -1));
        renderCurrentView();
    });

    nextPeriod?.addEventListener("click", () => {
        if (nextPeriod.disabled) return;
        if (currentView === "month") currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        else currentDate.setDate(currentDate.getDate() + (currentView === "week" ? 7 : 1));
        renderCurrentView();
    });

    /* ESC FECHA O MODAL SUPERIOR */
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        const details = document.getElementById("agendaDetailsOverlay");
        const more = document.getElementById("agendaMoreAppointmentsOverlay");
        if (details && !details.hidden) details.hidden = true;
        else if (more && !more.hidden) more.hidden = true;
    });

    /* INICIALIZAÇÃO */
/* INICIALIZAÇÃO */
setupCalendarInteractions();
updateClassificationModeButton();
changeView("month");

// Conectar o filtro de situação, já existente no HTML.
setupFilterOptions(
    'input[name="situationFilter"]',
    "situations"
);

loadAgendaFilters();
loadAppointments();
});
