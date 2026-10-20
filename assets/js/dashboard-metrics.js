/* =========================================================
   AGENDA COMPRADOR — MÉTRICAS DO DASHBOARD
   Responsabilidade: regras de negócio e cálculos
========================================================= */

(() => {
    "use strict";

    function isInSelectedGroup(groupId, selectedGroup) {
        return selectedGroup === "all" ||
            String(groupId ?? "") === String(selectedGroup ?? "");
    }

    function getManufacturerPairs(eligibleManufacturers) {
        return new Set(
            (eligibleManufacturers || [])
                .filter(item => item.grupo_id && item.fabricante_id)
                .map(item =>
                    `${item.grupo_id}|${item.fabricante_id}`
                )
        );
    }

    /*
     * Consolida ruptura por:
     * grupo + classificação + fabricante.
     *
     * Se algum valor recebido estiver ausente ou inválido,
     * a combinação fica marcada como incompleta.
     */
    function aggregateRuptureScopes(rows, selectedGroup, eligiblePairs) {
        const aggregates = new Map();

        (rows || []).forEach(row => {
            if (
                !row.grupo_id ||
                !row.classificacao_id ||
                !row.fabricante_id ||
                !isInSelectedGroup(row.grupo_id, selectedGroup)
            ) {
                return;
            }

            const manufacturerPair =
                `${row.grupo_id}|${row.fabricante_id}`;

            if (!eligiblePairs.has(manufacturerPair)) {
                return;
            }

            const key = [
                row.grupo_id,
                row.classificacao_id,
                row.fabricante_id
            ].join("|");

            if (!aggregates.has(key)) {
                aggregates.set(key, {
                    groupId: String(row.grupo_id),
                    classificationId: String(row.classificacao_id),
                    manufacturerId: String(row.fabricante_id),
                    total: 0,
                    rowCount: 0,
                    complete: true
                });
            }

            const aggregate = aggregates.get(key);
            const value = row.ruptura_valor;

            aggregate.rowCount++;

            if (
                value === null ||
                value === undefined ||
                value === "" ||
                !Number.isFinite(Number(value))
            ) {
                aggregate.complete = false;
                return;
            }

            aggregate.total += Number(value);
        });

        return [...aggregates.values()];
    }

    /* =====================================================
       INDICADOR: FABRICANTES FORA DA AGENDA
       Ruptura acima de R$ 50 e sem agendamento para hoje
    ===================================================== */

    function getOutsideAgendaCount({
        selectedGroup = "all",
        appointmentsToday = [],
        eligibleManufacturers = [],
        operationalRows = [],
        manufacturerCatalogAvailable = false,
        operationalDataAvailable = false
    } = {}) {
        if (
            !manufacturerCatalogAvailable ||
            !operationalDataAvailable
        ) {
            return null;
        }

        const eligiblePairs =
            getManufacturerPairs(eligibleManufacturers);

        const scheduledScopes = new Set();

        appointmentsToday.forEach(item => {
            if (
                !item.grupo_id ||
                !item.classificacao_id ||
                !item.fabricante_id ||
                !isInSelectedGroup(item.grupo_id, selectedGroup)
            ) {
                return;
            }

            scheduledScopes.add([
                item.grupo_id,
                item.classificacao_id,
                item.fabricante_id
            ].join("|"));
        });

        const scopes = aggregateRuptureScopes(
            operationalRows,
            selectedGroup,
            eligiblePairs
        );

        /*
         * Conta cada fabricante uma única vez por grupo,
         * mesmo que esteja em risco em várias classificações.
         */
        const outsideManufacturers = new Set();

        scopes.forEach(scope => {
            if (
                !scope.complete ||
                scope.rowCount === 0 ||
                !Number.isFinite(scope.total) ||
                scope.total <= 50
            ) {
                return;
            }

            const scopeKey = [
                scope.groupId,
                scope.classificationId,
                scope.manufacturerId
            ].join("|");

            if (scheduledScopes.has(scopeKey)) {
                return;
            }

            outsideManufacturers.add(
                `${scope.groupId}|${scope.manufacturerId}`
            );
        });

        return outsideManufacturers.size;
    }

    /* =====================================================
       INDICADOR: RISCO DE RUPTURA
       Combinações com valor total superior a R$ 250
    ===================================================== */

    function getHighRiskScopes({
        selectedGroup = "all",
        buyerScopeRows = [],
        eligibleManufacturers = [],
        operationalRows = [],
        manufacturerCatalogAvailable = false,
        operationalDataAvailable = false
    } = {}) {
        if (
            !manufacturerCatalogAvailable ||
            !operationalDataAvailable
        ) {
            return null;
        }

        const eligiblePairs =
            getManufacturerPairs(eligibleManufacturers);

        const scopes = aggregateRuptureScopes(
            operationalRows,
            selectedGroup,
            eligiblePairs
        );

        const manufacturerNames = new Map(
            eligibleManufacturers.map(item => [
                `${item.grupo_id}|${item.fabricante_id}`,
                item.nome_fabricante
            ])
        );

        const output = scopes
            .filter(scope =>
                scope.complete &&
                scope.rowCount > 0 &&
                Number.isFinite(scope.total) &&
                scope.total > 250
            )
            .map(scope => {
                const buyerScope = buyerScopeRows.find(row =>
                    String(row.grupo_id) === scope.groupId &&
                    String(row.classificacao_id) === scope.classificationId
                );

                return {
                    ...scope,
                    groupName:
                        buyerScope?.grupo_nome ||
                        buyerScope?.grupo_codigo ||
                        "Grupo",
                    classificationName:
                        buyerScope?.classificacao_nome ||
                        buyerScope?.classificacao_codigo ||
                        "Classificação",
                    manufacturerName:
                        manufacturerNames.get(
                            `${scope.groupId}|${scope.manufacturerId}`
                        ) || "Fabricante"
                };
            });

        return output.sort((a, b) => b.total - a.total);
    }

    window.DashboardMetrics = Object.freeze({
        getOutsideAgendaCount,
        getHighRiskScopes
    });
})();