/* =========================================================
   AGENDA COMPRADOR — REGRAS COMPARTILHADAS
   Situação e conclusão dos agendamentos
========================================================= */

(() => {
    "use strict";

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
    }

    function isCompleted(item) {
        if (
            item?.completed === true ||
            item?.concluido === true
        ) {
            return true;
        }

        const completedLabels = [
            "COMPLETED",
            "CONCLUIDO",
            "CONCLUIDA",
            "FINALIZADO",
            "FINALIZADA"
        ];

        return [
            item?.status,
            item?.status_label,
            item?.statusLabel
        ].some(value =>
            completedLabels.includes(normalizeText(value))
        );
    }

    function getSituation(item) {
        if (isCompleted(item)) {
            return {
                status: "completed",
                statusLabel: "Concluído"
            };
        }

        const combined = [
            item?.status,
            item?.status_label,
            item?.statusLabel
        ]
            .map(normalizeText)
            .join(" ");

        if (
            combined.includes("RISK") ||
            combined.includes("RISCO")
        ) {
            return {
                status: "risk",
                statusLabel: "Risco"
            };
        }

        if (
            combined.includes("URGENT") ||
            combined.includes("URGENTE")
        ) {
            return {
                status: "urgent",
                statusLabel: "Urgente"
            };
        }

        if (
            combined.includes("ATTENTION") ||
            combined.includes("ATENCAO")
        ) {
            return {
                status: "attention",
                statusLabel: "Atenção"
            };
        }

        return {
            status: "normal",
            statusLabel: item?.status_label ||
                item?.statusLabel ||
                "Normal"
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

    /*
     * Uma ocorrência só é concluída quando todos
     * os registros que a compõem estão concluídos.
     */
    function getOccurrenceStatus(items) {
        if (!items?.length) {
            return {
                key: "normal",
                label: "Normal"
            };
        }

        const activeItems = items.filter(
            item => !isCompleted(item)
        );

        if (!activeItems.length) {
            return {
                key: "completed",
                label: "Concluído"
            };
        }

        const situations = activeItems.map(item => ({
            ...getSituation(item)
        }));

        situations.sort(
            (a, b) =>
                getSituationWeight(b.status) -
                getSituationWeight(a.status)
        );

        const mostCritical = situations[0];

        return {
            key: mostCritical.status,
            label: mostCritical.statusLabel
        };
    }

    function getMostCriticalSituation(items) {
        const result = getOccurrenceStatus(items);

        return {
            status: result.key,
            statusLabel: result.label
        };
    }

    window.AgendaRules = Object.freeze({
        isCompleted,
        getSituation,
        getSituationWeight,
        getOccurrenceStatus,
        getMostCriticalSituation
    });
})();