/* ================================================================
   AGENDA COMPRADOR — IMPORTAÇÕES DO PAINEL ADM
   Este arquivo é adicional: não substitui assets/js/adm.js.
   Depende de supabaseClient e da biblioteca XLSX carregadas no HTML.
================================================================ */
(() => {
    "use strict";

    const operationalForm = document.getElementById("operationalImportForm");
    const operationalFileInput = document.getElementById("operationalImportFile");
    const operationalDateInput = document.getElementById("operationalReferenceDate");
    const operationalMessage = document.getElementById("operationalImportMessage");
    const operationalButton = document.getElementById("operationalImportButton");

    const manufacturersForm = document.getElementById("manufacturersImportForm");
    const manufacturersFileInput = document.getElementById("manufacturersImportFile");
    const manufacturersMessage = document.getElementById("manufacturersImportMessage");
    const manufacturersButton = document.getElementById("manufacturersImportButton");

    const MAX_FILE_BYTES = 20 * 1024 * 1024;
    const MAX_OPERATIONAL_ROWS = 50000;
    const MAX_MANUFACTURER_ROWS = 100000;

    function normalizeHeader(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    }

    function valueAsText(value) {
        if (value === null || value === undefined) return "";
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }
        return String(value).trim();
    }

    function showMessage(element, message, type = "info") {
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
        element.dataset.state = type;
        element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    }

    function hideMessage(element) {
        if (!element) return;
        element.textContent = "";
        element.hidden = true;
        delete element.dataset.state;
    }

    function setBusy(button, busy, busyText, idleText) {
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? busyText : idleText;
    }

    function setDefaultDate() {
        if (!operationalDateInput || operationalDateInput.value) return;
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 10);
        operationalDateInput.value = localDate;
    }

    function isBlankRow(row) {
        return Object.values(row || {}).every(value => valueAsText(value) === "");
    }

    async function readRowsFromFile(file) {
        if (!file) throw new Error("Selecione um arquivo antes de continuar.");
        if (file.size > MAX_FILE_BYTES) {
            throw new Error("O arquivo ultrapassa o limite de 20 MB.");
        }
        if (!window.XLSX) {
            throw new Error("A biblioteca de leitura de Excel não foi carregada. Confira a conexão e a tag XLSX no adm.html.");
        }

        const ext = file.name.split(".").pop().toLowerCase();
        if (!["csv", "xlsx", "xls", "xlsm"].includes(ext)) {
            throw new Error("Formato não suportado. Use CSV, XLS, XLSX ou XLSM.");
        }

        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, {
            type: "array",
            raw: true,
            cellDates: false
        });

        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) throw new Error("O arquivo não possui uma planilha legível.");

        const sheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: true,
            blankrows: false
        }).filter(row => !isBlankRow(row));

        if (!rows.length) {
            throw new Error("Não encontrei linhas de dados abaixo do cabeçalho.");
        }

        return rows;
    }

    function findColumn(headers, aliases) {
        const normalized = headers.map(header => ({
            original: header,
            key: normalizeHeader(header)
        }));

        for (const alias of aliases) {
            const target = normalizeHeader(alias);
            const match = normalized.find(header => header.key === target);
            if (match) return match.original;
        }
        return null;
    }

    function normalizeNumeric(value, fieldLabel, rowNumber) {
        let text = valueAsText(value);
        if (text === "") return "";
        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                throw new Error(`Linha ${rowNumber}: ${fieldLabel} contém um número inválido.`);
            }
            return String(value);
        }

        text = text
            .replace(/[\s\u00a0]/g, "")
            .replace(/^R\$/i, "")
            .replace(/%$/, "");

        const commaIndex = text.lastIndexOf(",");
        const dotIndex = text.lastIndexOf(".");

        if (commaIndex >= 0 && dotIndex >= 0) {
            // 1.234,56 => 1234.56; 1,234.56 => 1234.56
            if (commaIndex > dotIndex) {
                text = text.replace(/\./g, "").replace(",", ".");
            } else {
                text = text.replace(/,/g, "");
            }
        } else if (commaIndex >= 0) {
            // Os CSVs com padrão brasileiro costumam usar vírgula decimal.
            text = text.replace(/,/g, ".");
        } else if ((text.match(/\./g) || []).length > 1) {
            const pieces = text.split(".");
            const last = pieces.pop();
            if (last.length === 3 && pieces.every(piece => piece.length > 0)) {
                text = pieces.join("") + last;
            } else {
                text = pieces.join("") + "." + last;
            }
        } else if (
            ["total_vendido", "dias_sem_estoque"].includes(fieldLabel) &&
            /^\d{1,3}(?:\.\d{3})+$/.test(text)
        ) {
            // Nessas colunas normalmente inteiras, 19.357 costuma ser 19357
            // em CSVs do padrão brasileiro; valores decimais permanecem aceitos
            // quando não seguem um agrupamento de milhar.
            text = text.replace(/\./g, "");
        }

        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
            throw new Error(`Linha ${rowNumber}: ${fieldLabel} = "${valueAsText(value)}" não é um número válido.`);
        }

        return text;
    }

    function mapOperationalRows(sourceRows) {
        const headers = Object.keys(sourceRows[0] || {});
        const columnMap = {
            grupo_codigo: findColumn(headers, ["grupo_codigo", "codigo_grupo", "grupo"]),
            uf: findColumn(headers, ["uf", "estado"]),
            classificacao_codigo: findColumn(headers, ["classificacao_codigo", "codigo_classificacao", "classificacao"]),
            fabricante_nome: findColumn(headers, ["fabricante_nome", "fabricante_conexao", "nome_fabricante", "nome_visual", "fabricante"]),
            curva_qtd: findColumn(headers, ["curva_qtd", "curva_quantidade", "curva qtd"]),
            curva_valor: findColumn(headers, ["curva_valor", "curva valor"]),
            total_vendido: findColumn(headers, ["total_vendido", "total vendido", "vendido_total"]),
            dias_sem_estoque: findColumn(headers, ["dias_sem_estoque", "dias sem estoque"]),
            ruptura_quantidade: findColumn(headers, ["ruptura_quantidade", "ruptura quantidade", "quantidade_ruptura"]),
            ruptura_valor: findColumn(headers, ["ruptura_valor", "ruptura valor", "valor_ruptura"])
        };

        const missing = Object.entries(columnMap)
            .filter(([, header]) => !header)
            .map(([field]) => field);

        if (missing.length) {
            throw new Error(
                "Não encontrei todas as colunas obrigatórias no arquivo operacional. " +
                "Colunas ausentes: " + missing.join(", ") + ". " +
                "Use os nomes das colunas de stg_dados_operacionais."
            );
        }

        const mapped = sourceRows.map((source, index) => {
            const rowNumber = index + 2;
            const get = field => valueAsText(source[columnMap[field]]);

            return {
                grupo_codigo: get("grupo_codigo"),
                uf: get("uf").toUpperCase(),
                classificacao_codigo: get("classificacao_codigo"),
                fabricante_nome: get("fabricante_nome"),
                curva_qtd: get("curva_qtd").toUpperCase(),
                curva_valor: get("curva_valor").toUpperCase(),
                total_vendido: normalizeNumeric(source[columnMap.total_vendido], "total_vendido", rowNumber),
                dias_sem_estoque: normalizeNumeric(source[columnMap.dias_sem_estoque], "dias_sem_estoque", rowNumber),
                ruptura_quantidade: normalizeNumeric(source[columnMap.ruptura_quantidade], "ruptura_quantidade", rowNumber),
                ruptura_valor: normalizeNumeric(source[columnMap.ruptura_valor], "ruptura_valor", rowNumber)
            };
        });

        const missingCore = mapped.findIndex(row =>
            !row.grupo_codigo || !row.uf || !row.classificacao_codigo ||
            !row.fabricante_nome || !row.curva_qtd || !row.curva_valor
        );
        if (missingCore >= 0) {
            throw new Error(`Há um campo obrigatório vazio próximo à linha ${missingCore + 2}.`);
        }

        if (mapped.length > MAX_OPERATIONAL_ROWS) {
            throw new Error(`O arquivo ultrapassa o limite de ${MAX_OPERATIONAL_ROWS} linhas.`);
        }

        return mapped;
    }

    function mapManufacturerRows(sourceRows) {
        const headers = Object.keys(sourceRows[0] || {});
        const columnMap = {
            grupo: findColumn(headers, ["grupo", "grupo_codigo", "codigo_grupo"]),
            nome_visual: findColumn(headers, ["nome_visual", "nome visual", "fabricante_visual"]),
            fabricante_conexao: findColumn(headers, ["fabricante_conexao", "fabricante conexao", "conexao", "fabricante_nome"]),
            ativo: findColumn(headers, ["ativo", "situacao", "status"]),
            origem: findColumn(headers, ["origem", "fonte"])
        };

        const missing = Object.entries(columnMap)
            .filter(([field, header]) => field !== "origem" && !header)
            .map(([field]) => field);

        if (missing.length) {
            throw new Error(
                "Não encontrei todas as colunas obrigatórias no arquivo de fabricantes. " +
                "Colunas ausentes: " + missing.join(", ") + ". " +
                "O arquivo deve conter grupo, nome_visual, fabricante_conexao e ativo."
            );
        }

        const mapped = sourceRows.map(source => {
            const get = field => columnMap[field] ? valueAsText(source[columnMap[field]]) : "";
            return {
                grupo: get("grupo"),
                nome_visual: get("nome_visual"),
                fabricante_conexao: get("fabricante_conexao"),
                ativo: get("ativo"),
                origem: get("origem")
            };
        });

        const invalidIndex = mapped.findIndex(row =>
            !row.grupo || !row.nome_visual || !row.fabricante_conexao || !row.ativo
        );
        if (invalidIndex >= 0) {
            throw new Error(`Há um campo obrigatório vazio próximo à linha ${invalidIndex + 2}.`);
        }

        if (mapped.length > MAX_MANUFACTURER_ROWS) {
            throw new Error(`O arquivo ultrapassa o limite de ${MAX_MANUFACTURER_ROWS} linhas.`);
        }

        return mapped;
    }

    async function callRpc(functionName, args) {
        if (typeof supabaseClient === "undefined") {
            throw new Error("A conexão com o Supabase não foi inicializada.");
        }

        const { data, error } = await supabaseClient.rpc(functionName, args);
        if (error) {
            const detail = [error.message, error.details, error.hint]
                .filter(Boolean)
                .join(" — ");
            throw new Error(detail || "O Supabase recusou a importação.");
        }
        if (!data || data.success !== true) {
            throw new Error(data?.message || "O servidor não confirmou a importação.");
        }
        return data;
    }

    if (operationalForm) {
        operationalForm.addEventListener("submit", async event => {
            event.preventDefault();
            hideMessage(operationalMessage);

            const file = operationalFileInput?.files?.[0];
            const dateReference = operationalDateInput?.value;
            if (!dateReference) {
                showMessage(operationalMessage, "Informe a data de referência.", "error");
                operationalDateInput?.focus();
                return;
            }

            setBusy(operationalButton, true, "Validando e importando...", "Validar e substituir dados");
            try {
                const sourceRows = await readRowsFromFile(file);
                const rows = mapOperationalRows(sourceRows);
                const confirmed = window.confirm(
                    `O arquivo "${file.name}" contém ${rows.length} linhas válidas na leitura inicial.\n\n` +
                    `Data de referência: ${dateReference.split("-").reverse().join("/")}.\n\n` +
                    "A importação vai substituir os dados operacionais e a tabela de preparação atuais. " +
                    "Não será mantido histórico de cargas anteriores.\n\nDeseja continuar? " +
                    "A validação de vínculos no banco ainda será executada antes de confirmar a troca."
                );
                if (!confirmed) return;

                const result = await callRpc("adm_importar_dados_operacionais", {
                    p_rows: rows,
                    p_nome_arquivo: file.name,
                    p_data_referencia: dateReference
                });

                showMessage(
                    operationalMessage,
                    `${result.message} Linhas: ${result.quantidade_linhas}. ` +
                    `Referência: ${String(result.data_referencia).split("-").reverse().join("/")}. ` +
                    `Fabricantes obsoletos removidos com segurança: ${result.fabricantes_obsoletos_removidos ?? 0}.`,
                    "success"
                );
                operationalForm.reset();
                setDefaultDate();
            } catch (error) {
                console.error("Falha na importação de dados operacionais:", error);
                showMessage(
                    operationalMessage,
                    `Importação não concluída. A base anterior foi preservada se a transação foi rejeitada. Detalhe: ${error.message}`,
                    "error"
                );
            } finally {
                setBusy(operationalButton, false, "Validando e importando...", "Validar e substituir dados");
            }
        });
    }

    if (manufacturersForm) {
        manufacturersForm.addEventListener("submit", async event => {
            event.preventDefault();
            hideMessage(manufacturersMessage);

            const file = manufacturersFileInput?.files?.[0];
            setBusy(manufacturersButton, true, "Validando e importando...", "Validar e substituir fabricantes");
            try {
                const sourceRows = await readRowsFromFile(file);
                const rows = mapManufacturerRows(sourceRows);
                const confirmed = window.confirm(
                    `O arquivo "${file.name}" contém ${rows.length} linhas válidas na leitura inicial.\n\n` +
                    "A tabela de mapeamento fabricantes_importacao será substituída integralmente. " +
                    "Os fabricantes usados por agendas, decisões ou dados vigentes serão preservados.\n\n" +
                    "Deseja continuar? A validação de grupos e mapeamentos será executada no banco antes da troca."
                );
                if (!confirmed) return;

                const result = await callRpc("adm_importar_fabricantes", {
                    p_rows: rows,
                    p_nome_arquivo: file.name
                });

                showMessage(
                    manufacturersMessage,
                    `${result.message} Mapeamentos: ${result.quantidade_linhas}. ` +
                    `Novos fabricantes cadastrados: ${result.fabricantes_novos ?? 0}. ` +
                    `Fabricantes obsoletos removidos com segurança: ${result.fabricantes_obsoletos_removidos ?? 0}.`,
                    "success"
                );
                manufacturersForm.reset();
            } catch (error) {
                console.error("Falha na importação de fabricantes:", error);
                showMessage(
                    manufacturersMessage,
                    `Importação não concluída. A lista anterior foi preservada se a transação foi rejeitada. Detalhe: ${error.message}`,
                    "error"
                );
            } finally {
                setBusy(manufacturersButton, false, "Validando e importando...", "Validar e substituir fabricantes");
            }
        });
    }

    setDefaultDate();
})();
