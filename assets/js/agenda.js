/* =========================================================
   AGENDA COMPRADOR — CALENDÁRIO E DETALHES
   Versão consolidada: uma única função por responsabilidade
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

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

    /* IDENTIFICADOR TEMPORÁRIO DO COMPRADOR DE TESTE */
    const COMPRADOR_ID = "c84c12af-5c2c-4734-9d2b-e075ac4cf0f2";

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

    let classificationDisplayMode = "separated";
    try {
        const savedMode = localStorage.getItem("agendaComprador_classificationMode");
        if (savedMode === "grouped" || savedMode === "separated") {
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

    /* SITUAÇÃO VISUAL ATUAL DA VIEW; NÃO CALCULA RUPTURA */
    function getSituationWeight(status) {
        return ({ normal: 1, attention: 2, urgent: 3, risk: 4 })[status] || 0;
    }

    function getMostCriticalSituation(list) {
        if (!list?.length) return { status: "normal", statusLabel: "Normal" };
        const critical = [...list].sort((a, b) => getSituationWeight(b.status) - getSituationWeight(a.status))[0];
        return {
            status: critical.status || "normal",
            statusLabel: critical.statusLabel || "Normal"
        };
    }

    /* PREPARAR REGISTROS PARA O MODO SEPARADO OU AGRUPADO */
    function prepareAppointmentsForDisplay(list) {
        if (!Array.isArray(list)) return [];

        if (classificationDisplayMode === "separated") {
            return list.map(appointment => {
                const classification = formatClassificationList([appointment.classification]);
                return {
                    ...appointment,
                    displayKey: [appointment.id, appointment.classificationId || "", appointment.date, appointment.time].join("|"),
                    sourceAppointments: [appointment],
                    displayClassification: classification.display,
                    fullClassification: classification.full
                };
            });
        }

        const groups = new Map();
        list.forEach(appointment => {
            const key = [
                appointment.date,
                appointment.time,
                appointment.manufacturerId || normalizeText(appointment.manufacturerReal),
                normalizeText(appointment.group),
                appointment.ruleId || ""
            ].join("|");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(appointment);
        });

        return [...groups.values()].map(groupedAppointments => {
            const base = groupedAppointments[0];
            const classification = formatClassificationList(groupedAppointments.map(item => item.classification));
            const situation = getMostCriticalSituation(groupedAppointments);
            return {
                ...base,
                displayKey: [base.id, base.date, base.time, base.manufacturerId || "", normalizeText(base.group), base.ruleId || ""].join("|"),
                sourceAppointments: groupedAppointments,
                status: situation.status,
                statusLabel: situation.statusLabel,
                displayClassification: classification.display,
                fullClassification: classification.full
            };
        });
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
        const situationNames = { normal: "Normal", attention: "Atenção", urgent: "Urgente", risk: "Risco" };

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

    /* MODO AGRUPAR/SEPARAR */
    function updateClassificationModeButton() {
        if (!classificationModeButton) return;
        const grouped = classificationDisplayMode === "grouped";
        classificationModeButton.classList.toggle("grouped", grouped);
        classificationModeButton.classList.toggle("separated", !grouped);
        classificationModeButton.setAttribute("aria-pressed", grouped ? "true" : "false");
        if (classificationModeIcon) classificationModeIcon.textContent = grouped ? "⧉" : "≡";
        classificationModeButton.title = grouped
            ? "Agrupado — clicar para separar classificações"
            : "Separado — clicar para agrupar classificações";
        classificationModeButton.setAttribute("aria-label", grouped ? "Separar classificações" : "Agrupar classificações");
    }

    classificationModeButton?.addEventListener("click", event => {
        event.stopPropagation();
        classificationDisplayMode = classificationDisplayMode === "grouped" ? "separated" : "grouped";
        try {
            localStorage.setItem("agendaComprador_classificationMode", classificationDisplayMode);
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
status, status_label                `)
                .eq("comprador_id", COMPRADOR_ID)
                .gte("data_agendamento", dateToISO(horizonStart))
                .lte("data_agendamento", dateToISO(horizonEnd))
                .order("data_agendamento", { ascending: true })
                .order("hora_inicio", { ascending: true })
                .order("nome_fabricante", { ascending: true });

            if (error) throw error;

            appointments = (data || []).map(item => ({
                id: item.agendamento_id,
                ruleId: item.regra_agendamento_id,
                groupId: item.grupo_id,
                manufacturerId: item.fabricante_id,
                date: item.data_agendamento,
                time: formatTimeLabel(item.hora_inicio),
                endTime: formatTimeLabel(item.hora_fim),
                manufacturer: item.nome_visual || item.nome_fabricante || "Fabricante",
                manufacturerReal: item.nome_fabricante || "",
                group: item.grupo_codigo || item.grupo_nome || "",
                groupName: item.grupo_nome || item.grupo_codigo || "",
                classification: item.classificacao_nome || item.classificacao_codigo || "",
                classificationCode: item.classificacao_codigo || "",
                classificationId: item.classificacao_id,
                status: item.status || "normal",
                statusLabel: item.status_label || "Normal",
                completed: item.concluido === true || item.status === "completed",
                observation: item.regra_observacao || "",
                mode: item.modo_classificacao || "JUNTAS",
                recurring: item.recorrente === true
            }));

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
            const { data, error } = await supabaseClient
                .from("dados_operacionais")
                .select(`
                    grupo_id, classificacao_id, fabricante_id,
                    curva_qtd, curva_valor, total_vendido,
                    dias_sem_estoque, ruptura_quantidade, ruptura_valor
                `);
            if (error) throw error;
            operationalRows = data || [];
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
                            <div class="calendar-appointment ${escapeHtml(appointment.status)}"
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
                        <div class="week-appointment ${escapeHtml(appointment.status)}"
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
                    <div class="day-appointment ${escapeHtml(appointment.status)}"
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
            <article class="agenda-more-item ${escapeHtml(appointment.status || "normal")}" data-appointment-key="${escapeHtml(appointment.displayKey)}" data-date="${escapeHtml(appointment.date)}" role="button" tabindex="0">
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

    /* FORMULÁRIO PADRÃO: DATA E HORA PRÉ-SELECIONADAS PELO CALENDÁRIO */
    function openNewAppointmentForDate(dateISO, time = "") {
        if (typeof window.abrirNovoAgendamento !== "function") {
            window.alert("A caixa padrão de Novo Agendamento não está disponível.");
            return;
        }
        window.abrirNovoAgendamento({ dataAgendamento: dateISO, horaInicio: time });
    }

    /* INDICADORES: NUNCA FAZ CORRESPONDÊNCIA PARCIAL ENTRE GRUPO/CLASSE/FABRICANTE */
    function getOperationalMetric(appointment) {
        if (!appointment?.groupId || !appointment?.classificationId || !appointment?.manufacturerId) return null;
        return operationalRows.find(row =>
            String(row.grupo_id) === String(appointment.groupId) &&
            String(row.classificacao_id) === String(appointment.classificationId) &&
            String(row.fabricante_id) === String(appointment.manufacturerId)
        ) || null;
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
            if (!selectedAppointment || isSavingOccurrenceAction) return null;
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
                if (!selectedAppointment) return;

                if (action === "edit") {
                    editDate.value = selectedAppointment.date || "";
                    editTime.value = selectedAppointment.time || "09:00";
                    editForm.hidden = false;
                    normalActions.hidden = true;
                    editActions.hidden = false;
                    editDate.focus();
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
        const title = overlay.querySelector("#agendaDetailsTitle");
        const subtitle = overlay.querySelector("#agendaDetailsSubtitle");
        const context = overlay.querySelector("#agendaDetailsContext");
        const summary = overlay.querySelector("#agendaDetailsSummary");
        const operational = overlay.querySelector("#agendaDetailsOperational");
        const sources = appointment.sourceAppointments?.length ? appointment.sourceAppointments : [appointment];

        const classifications = [...new Set(sources.map(item => item.classification).filter(Boolean).map(getClassificationLabel))];
        const classificationText = classifications.join(" · ") || "Não informada";
        const date = parseISODate(appointment.date);

        title.textContent = appointment.manufacturerReal || appointment.manufacturer || "Compromisso de compras";
        subtitle.textContent = [date ? weekdayNames[date.getDay()] : "", formatDateISO(appointment.date), appointment.time || "Horário não informado"].filter(Boolean).join(" · ");
        context.innerHTML = `
            <span>GRUPO <strong>${escapeHtml(appointment.groupName || appointment.group || "—")}</strong></span>
            <span class="gcal-context-separator">·</span>
            <span>CLASSIFICAÇÃO <strong>${escapeHtml(classificationText)}</strong></span>
            <span class="gcal-context-separator">·</span>
            <span class="gcal-recurring-label">${appointment.recurring ? "RECORRENTE" : "PONTUAL"}</span>`;

        const observation = String(appointment.observation || "").trim() || "Nenhuma observação registrada.";
        summary.innerHTML = `
            <div class="gcal-details-list">
                <div class="gcal-detail-row"><span class="gcal-detail-label">Situação atual</span><strong class="gcal-detail-value">${escapeHtml(appointment.statusLabel || "Normal")}</strong></div>
                <div class="gcal-detail-row"><span class="gcal-detail-label">Modo de classificação</span><strong class="gcal-detail-value">${escapeHtml(appointment.mode || "JUNTAS")}</strong></div>
                <div class="gcal-detail-row gcal-observation-row"><span class="gcal-detail-label">Observação</span><p class="gcal-detail-observation">${escapeHtml(observation)}</p></div>
            </div>`;

        operational.innerHTML = sources.map(source => {
            const metric = getOperationalMetric(source);
            const values = metric ? [metric.curva_qtd, metric.curva_valor, metric.total_vendido, metric.dias_sem_estoque, metric.ruptura_quantidade, metric.ruptura_valor] : [];
            const hasData = values.some(value => value !== null && value !== undefined && value !== "");

            const metricCard = (label, value, featured = false) => `
                <article class="gcal-kpi-card ${featured ? "gcal-kpi-featured" : ""}">
                    <span class="gcal-kpi-label">${escapeHtml(label)}</span>
                    <strong class="gcal-kpi-value">${escapeHtml(value)}</strong>
                </article>`;

            return `
                <section class="gcal-kpi-section">
                    <header class="gcal-kpi-heading">
                        <h4>${escapeHtml(getClassificationLabel(source.classification) || "Sem classificação")}</h4>
                        <span class="gcal-data-indicator ${hasData ? "is-available" : "is-unavailable"}"><span class="gcal-data-dot"></span>${hasData ? "Dados disponíveis" : "Dados não encontrados"}</span>
                    </header>
                    <div class="gcal-kpi-grid">
                        ${metricCard("Ruptura em valor", formatCurrency(metric?.ruptura_valor), true)}
                        ${metricCard("Ruptura em quantidade", formatNumber(metric?.ruptura_quantidade), true)}
                        ${metricCard("Dias sem estoque", formatNumber(metric?.dias_sem_estoque, 1))}
                        ${metricCard("Total vendido", formatNumber(metric?.total_vendido))}
                        ${metricCard("Curva por quantidade", metric?.curva_qtd ?? "—")}
                        ${metricCard("Curva por valor", metric?.curva_valor ?? "—")}
                    </div>
                    ${!hasData ? `<p class="gcal-kpi-warning">Não foram encontrados indicadores para esta combinação de grupo, classificação e fabricante. Verifique a base operacional e as permissões do Supabase.</p>` : ""}
                </section>`;
        }).join("");

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
        const editForm = overlay.querySelector("#agendaOccurrenceEditForm");
        if (editForm) editForm.hidden = true;
        const normalActions = overlay.querySelector("#agendaDetailsActions");
        const editActions = overlay.querySelector("#agendaDetailsEditActions");
        if (normalActions) normalActions.hidden = false;
        if (editActions) editActions.hidden = true;

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
    setupCalendarInteractions();
    updateClassificationModeButton();
    changeView("month");
    loadAgendaFilters();
    loadAppointments();
});
