/* =========================================================
   AGENDA COMPRADOR — DASHBOARD
   Integração inicial com o Supabase
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // Aguarda a validação da sessão e do comprador selecionado.
    const access = await window.AgendaAccess?.ready;

    if (!access?.allowed) {
        return;
    }

    // Utiliza o comprador autorizado, sem UUID fixo.
    const COMPRADOR_ID = access.compradorId;
    const READ_ONLY = access.readOnly === true;

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const groupFilter = document.getElementById("groupFilter");
    const todayList = document.querySelector(".today-list");
    const alertList = document.querySelector(".alert-list");
    // Identificar o comprador exibido no Dashboard.
const dashboardHeading = document.querySelector(
    ".page-heading h1"
);

if (dashboardHeading) {
    dashboardHeading.textContent =
        `Bom dia, ${access.compradorNome || "Comprador"}`;
}

let groups = [];
let appointmentsToday = [];

let buyerScopeRows = [];
let eligibleManufacturers = [];
let operationalRows = [];

let manufacturerCatalogAvailable = false;
let operationalDataAvailable = false;
let dashboardLoadError = false;

    /* =====================================================
       CONEXÃO
    ===================================================== */

    const client =
        typeof supabaseClient !== "undefined"
            ? supabaseClient
            : null;

    function showConnectionError() {
        console.error(
            "Supabase indisponível. Confira a ordem dos scripts no index.html."
        );

        dashboardLoadError = true;

        if (todayList) {
            todayList.innerHTML = `
                <p class="dashboard-empty-message">
                    Não foi possível carregar a agenda.
                    Confira a conexão.
                </p>
            `;
        }

        document.querySelectorAll(".metric-value").forEach(element => {
            element.textContent = "—";
        });
    }

    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

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

    function getTodayISO() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatTime(value) {
        return String(value || "").slice(0, 5) || "—";
    }

    function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);
}

    function updateCurrentDate() {
        const dateElement = document.querySelector(".current-date");
        if (!dateElement) return;

        const formatted = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(new Date());

        dateElement.textContent =
            formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    function setMetric(cardSelector, value, caption) {
        const card = document.querySelector(cardSelector);
        if (!card) return;

        const valueElement = card.querySelector(".metric-value");
        const captionElement = card.querySelector(".metric-caption");

        if (valueElement) valueElement.textContent = String(value);
        if (captionElement) captionElement.textContent = caption;
    }

/* =====================================================
   CARREGAR ESCOPO DO COMPRADOR
===================================================== */

async function loadGroups() {
    if (!client) {
        throw new Error("Cliente Supabase não inicializado.");
    }

    const data = await window.DashboardService
        .loadBuyerScopes(client, COMPRADOR_ID);

    buyerScopeRows = data;

    const groupMap = new Map();

    data.forEach(row => {
        if (!row.grupo_id) return;

        const id = String(row.grupo_id);

        if (!groupMap.has(id)) {
            groupMap.set(id, {
                id,
                code: row.grupo_codigo || "",
                name: row.grupo_nome || row.grupo_codigo || "Grupo"
            });
        }
    });

    groups = [...groupMap.values()];

    if (groupFilter) {
        groupFilter.innerHTML = `
            <option value="all">Todos os grupos</option>
            ${groups.map(group => `
                <option value="${escapeHtml(group.id)}">
                    ${escapeHtml(group.name)}
                </option>
            `).join("")}
        `;
    }

    console.log(
        "Grupos disponíveis para o comprador:",
        groups.length
    );
}

/* =====================================================
   CARREGAR AGENDAMENTOS DE HOJE
===================================================== */

async function loadTodayAppointments() {
    if (!client) {
        throw new Error("Cliente Supabase não inicializado.");
    }

    appointmentsToday = await window.DashboardService
        .loadTodayAppointments(
            client,
            COMPRADOR_ID,
            getTodayISO()
        );

    console.log(
        "Registros de agenda encontrados para hoje:",
        appointmentsToday.length
    );
}

/* =====================================================
   CARREGAR FABRICANTES DO ESCOPO DO COMPRADOR
===================================================== */

async function loadEligibleManufacturers() {
    manufacturerCatalogAvailable = false;
    eligibleManufacturers = [];

    const groupIds = [
        ...new Set(
            buyerScopeRows
                .map(row => row.grupo_id)
                .filter(Boolean)
                .map(String)
        )
    ];

    if (!groupIds.length) {
        manufacturerCatalogAvailable = true;
        return;
    }

    try {
        eligibleManufacturers =
            await window.DashboardService
                .loadEligibleManufacturers(client, groupIds);

        manufacturerCatalogAvailable = true;

        console.log(
            "Combinações de grupo e fabricante disponíveis:",
            eligibleManufacturers.length
        );
    } catch (error) {
        console.error(
            "Erro ao carregar fabricantes disponíveis:",
            error
        );

        manufacturerCatalogAvailable = false;
        eligibleManufacturers = [];
    }
}

/* =====================================================
   CARREGAR DADOS OPERACIONAIS DO DASHBOARD
===================================================== */

async function loadDashboardOperationalRows() {
    operationalRows = [];
    operationalDataAvailable = false;

    try {
        const result = await window.DashboardService
            .loadOperationalData(client, buyerScopeRows);

        operationalRows = result.rows;
        operationalDataAvailable = result.available;

        if (result.importation) {
            console.log(
                "Importação operacional utilizada:",
                result.importation.data_referencia,
                result.importation.id
            );
        } else if (!result.available) {
            console.warn(
                "Nenhuma importação operacional concluída disponível."
            );
        }

        console.log(
            "Linhas operacionais do escopo do comprador:",
            operationalRows.length
        );
    } catch (error) {
        console.error(
            "Erro ao carregar dados operacionais do Dashboard:",
            error
        );

        operationalRows = [];
        operationalDataAvailable = false;
    }
}

/* =====================================================
   SITUAÇÃO — REGRAS COMPARTILHADAS
===================================================== */

function isCompleted(item) {
    return window.AgendaRules.isCompleted(item);
}

function getStatusKey(item) {
    return window.AgendaRules.getSituation(item).status;
}

function statusWeight(status) {
    return window.AgendaRules.getSituationWeight(status);
}

function getOccurrenceStatus(sourceRows) {
    return window.AgendaRules.getOccurrenceStatus(sourceRows);
}

/* =====================================================
   AGRUPAR OCORRÊNCIAS RESPEITANDO O MODO DA REGRA
===================================================== */

function getOccurrences(rows) {
    const occurrenceMap = new Map();

    rows.forEach(item => {
        const time = formatTime(item.hora_inicio);

        const ruleId =
            item.regra_agendamento_id || item.agendamento_id;

        const baseKey = [
            ruleId,
            item.data_agendamento,
            time,
            item.grupo_id || ""
        ].join("|");

        // Reproduz o modo salvo na regra da Agenda Compras.
        // Se estiver ausente, mantém o comportamento padrão JUNTAS.
        const mode =
            normalizeText(item.modo_classificacao) === "SEPARADAS"
                ? "SEPARADAS"
                : "JUNTAS";

        const scopeKey = [
            item.grupo_id || "",
            item.classificacao_id ||
                normalizeText(item.classificacao_nome),
            item.fabricante_id ||
                normalizeText(item.nome_fabricante)
        ].join("|");

        /*
         * JUNTAS:
         * Uma linha para a ocorrência inteira.
         *
         * SEPARADAS:
         * Uma linha para cada combinação de grupo,
         * classificação e fabricante.
         */
        const occurrenceKey = mode === "SEPARADAS"
            ? `${baseKey}|SEPARADAS|${scopeKey}`
            : `${baseKey}|JUNTAS`;

        if (!occurrenceMap.has(occurrenceKey)) {
            occurrenceMap.set(occurrenceKey, []);
        }

        occurrenceMap.get(occurrenceKey).push(item);
    });

    return [...occurrenceMap.entries()]
        .map(([key, sourceRows]) => {
            // Remove duplicações da mesma combinação dentro da linha.
            const uniqueScopes = new Map();

            sourceRows.forEach(item => {
                const scopeKey = [
                    item.grupo_id || "",
                    item.classificacao_id ||
                        normalizeText(item.classificacao_nome),
                    item.fabricante_id ||
                        normalizeText(item.nome_fabricante)
                ].join("|");

                if (!uniqueScopes.has(scopeKey)) {
                    uniqueScopes.set(scopeKey, item);
                }
            });

            const uniqueRows = [...uniqueScopes.values()];

            const manufacturers = [
                ...new Set(
                    uniqueRows
                        .map(item =>
                            item.nome_visual || item.nome_fabricante
                        )
                        .filter(Boolean)
                )
            ];

            const classifications = [
                ...new Set(
                    uniqueRows
                        .map(item =>
                            item.classificacao_nome ||
                            item.classificacao_codigo
                        )
                        .filter(Boolean)
                )
            ];

            const base = uniqueRows[0] || sourceRows[0];
            const situation = getOccurrenceStatus(uniqueRows);

            return {
                key,
                time: formatTime(base.hora_inicio),
                groupId: String(base.grupo_id || ""),
                groupName:
                    base.grupo_nome || base.grupo_codigo || "",
                manufacturers,
                classifications,
                status: situation.key,
                statusLabel: situation.label,
                completed: situation.key === "completed"
            };
        })
        .sort((a, b) =>
            a.time.localeCompare(b.time) ||
            a.groupName.localeCompare(b.groupName, "pt-BR")
        );
}

/* =====================================================
   ALERTAS DE RUPTURA — INTERFACE
===================================================== */

function renderOperationalAlerts(riskScopes) {
    if (!alertList) return;

    if (
        !operationalDataAvailable ||
        !manufacturerCatalogAvailable ||
        !Array.isArray(riskScopes)
    ) {
        alertList.innerHTML = `
            <p class="dashboard-empty-message">
                Não foi possível confirmar os alertas.
                Verifique a disponibilidade dos dados operacionais
                e do cadastro de fabricantes.
            </p>
        `;
        return;
    }

    if (riskScopes.length === 0) {
        alertList.innerHTML = `
            <p class="dashboard-empty-message">
                Nenhuma combinação com ruptura acima de R$ 250
                foi identificada neste grupo.
            </p>
        `;
        return;
    }

    alertList.innerHTML = riskScopes.slice(0, 3).map(item => {
        const severity = item.total > 1000
            ? "danger"
            : "warning";

        return `
            <div class="alert-item ${severity}">
                <div class="alert-icon">!</div>

                <div>
                    <strong>
                        ${escapeHtml(item.manufacturerName)}
                    </strong>

                    <p>
                        ${escapeHtml(item.groupName)}
                        · ${escapeHtml(item.classificationName)}<br>
                        Ruptura: ${formatCurrency(item.total)}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

    /* =====================================================
       RENDERIZAR AGENDA DE HOJE E INDICADORES
    ===================================================== */

    function renderDashboard() {
        if (dashboardLoadError) return;

        const selectedGroup = groupFilter?.value || "all";

        const filteredRows = selectedGroup === "all"
            ? appointmentsToday
            : appointmentsToday.filter(item =>
                String(item.grupo_id || "") === selectedGroup
            );

        const occurrences = getOccurrences(filteredRows);

        const activeOccurrences = occurrences.filter(item => !item.completed);

        const urgentCount = activeOccurrences.filter(item =>
            ["urgent", "risk"].includes(item.status)
        ).length;

        const attentionCount = activeOccurrences.filter(item =>
            item.status === "attention"
        ).length;

        setMetric(
            ".metric-agenda",
            occurrences.length,
            "compromissos programados para hoje"
        );

        setMetric(
            ".metric-urgent",
            urgentCount,
            "compromissos urgentes ou em risco"
        );

        setMetric(
            ".metric-attention",
            attentionCount,
            "compromissos que exigem atenção"
        );

        // Estes dois indicadores dependem da integração operacional,
        // implementada na próxima etapa.
// Fabricantes disponíveis para o comprador sem agendamento hoje.
/* =====================================================
   INDICADORES OPERACIONAIS
===================================================== */

const metricInputs = {
    selectedGroup,
    buyerScopeRows,
    eligibleManufacturers,
    operationalRows,
    appointmentsToday,
    manufacturerCatalogAvailable,
    operationalDataAvailable
};

const outsideCount =
    window.DashboardMetrics.getOutsideAgendaCount(metricInputs);

setMetric(
    ".metric-outside",
    outsideCount === null ? "—" : outsideCount,
    outsideCount === null
        ? "dados operacionais indisponíveis"
        : "fabricantes com ruptura acima de R$ 50 sem agenda hoje"
);

const riskScopes =
    window.DashboardMetrics.getHighRiskScopes(metricInputs);

setMetric(
    ".metric-risk",
    riskScopes === null ? "—" : riskScopes.length,
    riskScopes === null
        ? "dados operacionais indisponíveis"
        : "combinações com ruptura acima de R$ 250"
);

renderOperationalAlerts(riskScopes);

        renderTodayList(occurrences);
    }

    function renderTodayList(occurrences) {
        if (!todayList) return;

        if (!occurrences.length) {
            todayList.innerHTML = `
                <p class="dashboard-empty-message">
                    Nenhum agendamento encontrado para hoje neste grupo.
                </p>
            `;
            return;
        }

        todayList.innerHTML = occurrences.map(item => `
            <div class="today-item ${escapeHtml(item.status)}">
                <div class="today-time">
                    ${escapeHtml(item.time)}
                </div>

                <div class="today-info">
                    <strong>
                        ${escapeHtml(item.manufacturers.join(" + ") || "Fabricante")}
                    </strong>

                    <span>
                        ${escapeHtml(item.classifications.join(" · ") || "Sem classificação")}
                    </span>
                </div>

                <span class="today-status ${escapeHtml(item.status)}">
                    ${escapeHtml(item.statusLabel)}
                </span>
            </div>
        `).join("");
    }

    /* =====================================================
       ESTADO TEMPORÁRIO DOS ALERTAS DE RUPTURA
    ===================================================== */

    function renderPendingAlerts() {
        if (!alertList) return;

        alertList.innerHTML = `
            <p class="dashboard-empty-message">
                Os alertas de ruptura serão exibidos quando
                a importação operacional for conectada ao Dashboard.
            </p>
        `;
    }

    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function initializeDashboard() {
        updateCurrentDate();

        if (!client) {
            showConnectionError();
            return;
        }

        // Limpa os exemplos estáticos enquanto os dados são carregados.
        document.querySelectorAll(".metric-value").forEach(element => {
            element.textContent = "—";
        });

        if (todayList) {
            todayList.innerHTML = `
                <p class="dashboard-empty-message">
                    Carregando agendamentos...
                </p>
            `;
        }

        renderPendingAlerts();

        try {
await loadGroups();
await loadTodayAppointments();

await Promise.all([
    loadEligibleManufacturers(),
    loadDashboardOperationalRows()
]);

dashboardLoadError = false;
renderDashboard();
        } catch (error) {
            showConnectionError();
            console.error("Erro ao iniciar o Dashboard:", error);
        }
    }

    groupFilter?.addEventListener("change", () => {
        renderDashboard();
    });

    initializeDashboard();
});