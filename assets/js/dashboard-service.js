/* =========================================================
   AGENDA COMPRADOR — SERVIÇOS DO DASHBOARD
   Responsabilidade: consultas e recuperação de dados
========================================================= */

(() => {
    "use strict";

    async function loadBuyerScopes(client, compradorId) {
        const { data, error } = await client
            .from("vw_comprador_classificacoes")
            .select(`
                comprador_id,
                grupo_id,
                grupo_codigo,
                grupo_nome,
                classificacao_id,
                classificacao_codigo,
                classificacao_nome
            `)
            .eq("comprador_id", compradorId)
            .order("grupo_codigo")
            .order("classificacao_nome");

        if (error) throw error;

        return data || [];
    }

    async function loadTodayAppointments(client, compradorId, today) {
        const { data, error } = await client
            .from("vw_agenda_compras")
            .select(`
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
                status_label,
                concluido
            `)
            .eq("comprador_id", compradorId)
            .gte("data_agendamento", today)
            .lte("data_agendamento", today)
            .order("hora_inicio", { ascending: true })
            .order("nome_fabricante", { ascending: true });

        if (error) throw error;

        return data || [];
    }

    async function loadEligibleManufacturers(client, groupIds) {
        if (!groupIds.length) return [];

        const pageSize = 1000;
        let offset = 0;
        const allRows = [];

        while (true) {
            const { data, error } = await client
                .from("vw_fabricantes_por_grupo")
                .select("grupo_id, fabricante_id, nome_fabricante")
                .in("grupo_id", groupIds)
                .order("grupo_id", { ascending: true })
                .order("nome_fabricante", { ascending: true })
                .range(offset, offset + pageSize - 1);

            if (error) throw error;

            const page = data || [];
            allRows.push(...page);

            if (page.length < pageSize) break;

            offset += pageSize;
        }

        // Uma entrada por combinação de grupo e fabricante.
        const uniqueRows = new Map();

        allRows.forEach(row => {
            if (!row.grupo_id || !row.fabricante_id) return;

            const key = `${row.grupo_id}|${row.fabricante_id}`;

            if (!uniqueRows.has(key)) {
                uniqueRows.set(key, row);
            }
        });

        return [...uniqueRows.values()];
    }

    async function loadOperationalData(client, buyerScopes) {
        const scopes = (buyerScopes || []).filter(
            row => row.grupo_id && row.classificacao_id
        );

        if (!scopes.length) {
            return {
                rows: [],
                available: true,
                importation: null
            };
        }

        const groupIds = [
            ...new Set(scopes.map(row => String(row.grupo_id)))
        ];

        const classificationIds = [
            ...new Set(
                scopes.map(row => String(row.classificacao_id))
            )
        ];

        const allowedPairs = new Set(
            scopes.map(row =>
                `${row.grupo_id}|${row.classificacao_id}`
            )
        );

        const { data: importation, error: importError } = await client
            .from("importacoes_operacionais")
            .select("id, data_referencia, created_at")
            .eq("status", "concluida")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (importError) throw importError;

        if (!importation?.id) {
            return {
                rows: [],
                available: false,
                importation: null
            };
        }

        const pageSize = 1000;
        let offset = 0;
        const allRows = [];

        while (true) {
            const { data, error } = await client
                .from("dados_operacionais")
                .select(`
                    id,
                    importacao_id,
                    grupo_id,
                    classificacao_id,
                    fabricante_id,
                    uf,
                    ruptura_valor
                `)
                .eq("importacao_id", importation.id)
                .in("grupo_id", groupIds)
                .in("classificacao_id", classificationIds)
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

        // Impede misturar uma classificação pertencente a outro grupo.
        const rows = allRows.filter(row =>
            allowedPairs.has(
                `${row.grupo_id}|${row.classificacao_id}`
            )
        );

        return {
            rows,
            available: true,
            importation
        };
    }

    window.DashboardService = Object.freeze({
        loadBuyerScopes,
        loadTodayAppointments,
        loadEligibleManufacturers,
        loadOperationalData
    });
})();