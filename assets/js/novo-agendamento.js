/* =========================================================
   NOVO AGENDAMENTO
   AGENDA COMPRADOR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* =================================================
           IDENTIFICAR COMPRADOR AUTENTICADO
        ================================================= */

        const access = await window.AgendaAccess?.ready;

        if (
            !access?.allowed ||
            !access?.compradorId
        ) {
            console.error(
                "Agendamento bloqueado: comprador não identificado."
            );

            return;
        }

        // ID real do comprador vinculado à sessão ou
        // selecionado pelo ADM no modo somente leitura.
        const COMPRADOR_ID = access.compradorId;



        /* =================================================
           ELEMENTOS
        ================================================= */

        const modal =
            document.getElementById(
                "appointmentModal"
            );


        const openButton =
            document.getElementById(
                "newAppointmentButton"
            );


        const closeButton =
            document.getElementById(
                "closeAppointmentModal"
            );


        const cancelButton =
            document.getElementById(
                "cancelAppointmentButton"
            );


        const form =
            document.getElementById(
                "appointmentForm"
            );


        const groupSelect =
            document.getElementById(
                "appointmentGroup"
            );


        const classificationsContainer =
            document.getElementById(
                "appointmentClassifications"
            );


        const manufacturerSearch =
            document.getElementById(
                "appointmentManufacturerSearch"
            );


        const manufacturerResults =
            document.getElementById(
                "appointmentManufacturerResults"
            );


        const selectedManufacturers =
            document.getElementById(
                "appointmentSelectedManufacturers"
            );


        const formMessage =
            document.getElementById(
                "appointmentFormMessage"
            );


        const saveButton =
            document.getElementById(
                "saveAppointmentButton"
            );


        /* =================================================
           ESTADO
        ================================================= */

let groups = [];

let classifications = [];

let manufacturerList = [];

let searchTimer = null;

let editingRuleId = null;
let editLoadFailed = false;

const selectedManufacturerMap = new Map();


        /* =================================================
           DATA ATUAL — FORMATO YYYY-MM-DD
        ================================================= */

        function getTodayISO() {

            const now =
                new Date();


            const year =
                now.getFullYear();


            const month =
                String(
                    now.getMonth() + 1
                )
                .padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    now.getDate()
                )
                .padStart(
                    2,
                    "0"
                );


            return `${year}-${month}-${day}`;

        }


/* =================================================
   ABRIR MODAL
   NOVO AGENDAMENTO OU EDITAR UNIVERSAL
================================================= */

async function openModal(prefill = null) {
    if (!modal) return;

    const requestedEdit =
        prefill?.mode === "edit" ||
        prefill?.modo === "editar";

    editingRuleId = requestedEdit
        ? String(prefill?.ruleId || prefill?.regraId || "")
        : null;

    editLoadFailed = requestedEdit;

    clearMessage();

    if (form) {
        form.reset();
    }

    selectedManufacturerMap.clear();
    manufacturerList = [];

    if (manufacturerSearch) {
        manufacturerSearch.value = "";
        manufacturerSearch.disabled = true;
    }

    if (manufacturerResults) {
        manufacturerResults.innerHTML = "";
    }

    renderSelectedManufacturers();

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = requestedEdit
            ? "Salvar alterações"
            : "Salvar agendamento";

        saveButton.dataset.originalText =
            saveButton.textContent;
    }

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    await loadGroups();

    if (requestedEdit) {
        if (!editingRuleId) {
            editLoadFailed = true;

            if (saveButton) {
                saveButton.disabled = true;
            }

            showMessage(
                "Não foi possível identificar a regra que será editada."
            );

            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
        }

        await loadRuleForEditing(editingRuleId);
        return;
    }

    if (prefill) {
        await applyPrefill(prefill);
    }
}


        /* =================================================
           FECHAR MODAL
        ================================================= */

        function closeModal() {

            if (!modal) {
                return;
            }

            modal.classList.add("hidden");

            document.body.classList.remove("modal-open");

            clearMessage();

            /* LIMPAR ESTADO DE EDIÇÃO */
            editingRuleId = null;
            editLoadFailed = false;

            /* RESTAURAR BOTÃO PARA NOVO AGENDAMENTO */
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Salvar agendamento";
                saveButton.dataset.originalText = "Salvar agendamento";
            }

        }


        /* =================================================
           MENSAGEM
        ================================================= */

        function showMessage(
            message
        ) {

            if (!formMessage) {
                return;
            }


            formMessage.textContent =
                message;


            formMessage.classList.remove(
                "hidden"
            );

        }


        function clearMessage() {

            if (!formMessage) {
                return;
            }


            formMessage.textContent =
                "";


            formMessage.classList.add(
                "hidden"
            );

        }


        /* =================================================
           CARREGAR GRUPOS
        ================================================= */

        async function loadGroups() {

            if (!groupSelect) {
                return;
            }


            groupSelect.innerHTML = `
                <option value="">
                    Selecione o grupo
                </option>
            `;


            classifications = [];


            if (classificationsContainer) {

                classificationsContainer.innerHTML = `
                    <div class="agendamento-empty">
                        Selecione um grupo primeiro.
                    </div>
                `;

            }


            if (manufacturerSearch) {

                manufacturerSearch.value =
                    "";

                manufacturerSearch.disabled =
                    true;

            }


            if (manufacturerResults) {

                manufacturerResults.innerHTML =
                    "";

            }


            selectedManufacturerMap.clear();

            manufacturerList = [];


            renderSelectedManufacturers();


            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient

                        .from(
                            "vw_comprador_classificacoes"
                        )

                        .select(
                            "grupo_id, grupo_codigo, grupo_nome"
                        )

                        .eq(
                            "comprador_id",
                            COMPRADOR_ID
                        )

                        .order(
                            "grupo_codigo"
                        );


                if (error) {
                    throw error;
                }


                const uniqueGroups =
                    Array.from(
                        new Map(
                            (data || []).map(
                                item => [
                                    item.grupo_id,
                                    item
                                ]
                            )
                        )
                        .values()
                    );


                groups =
                    uniqueGroups;


                groups.forEach(
                    group => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            group.grupo_id;


                        option.textContent =
                            group.grupo_nome ||
                            group.grupo_codigo;


                        option.dataset.codigo =
                            group.grupo_codigo;


                        groupSelect.appendChild(
                            option
                        );

                    }
                );


            } catch (error) {

                console.error(
                    "Erro ao carregar grupos:",
                    error
                );


                showMessage(
                    "Não foi possível carregar os grupos do comprador."
                );

            }

        }


        /* =================================================
           MUDANÇA DE GRUPO
        ================================================= */

        async function handleGroupChange() {

            const grupoId =
                groupSelect.value;


            classifications = [];

            manufacturerList = [];


            selectedManufacturerMap.clear();


            renderSelectedManufacturers();


            manufacturerSearch.value =
                "";


            manufacturerResults.innerHTML =
                "";


            if (!grupoId) {

                manufacturerSearch.disabled =
                    true;


                classificationsContainer.innerHTML = `
                    <div class="agendamento-empty">
                        Selecione um grupo primeiro.
                    </div>
                `;


                return;

            }


            manufacturerSearch.disabled =
                false;


            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient

                        .from(
                            "vw_comprador_classificacoes"
                        )

                        .select(
                            "classificacao_id, classificacao_codigo, classificacao_nome"
                        )

                        .eq(
                            "comprador_id",
                            COMPRADOR_ID
                        )

                        .eq(
                            "grupo_id",
                            grupoId
                        )

                        .order(
                            "classificacao_nome"
                        );


                if (error) {
                    throw error;
                }


                const uniqueClassifications =
                    Array.from(
                        new Map(
                            (data || []).map(
                                item => [
                                    item.classificacao_id,
                                    item
                                ]
                            )
                        )
                        .values()
                    );


                classifications =
                    uniqueClassifications;


                renderClassifications();


            } catch (error) {

                console.error(
                    "Erro ao carregar classificações:",
                    error
                );


                classificationsContainer.innerHTML = `
                    <div class="agendamento-empty">
                        Não foi possível carregar as classificações.
                    </div>
                `;

            }

        }

/* =================================================
   CARREGAR REGRA PARA EDITAR UNIVERSAL
================================================= */

async function loadRuleForEditing(ruleId) {
    try {
        const {
            data: rule,
            error: ruleError
        } = await supabaseClient
            .from("regras_agendamento")
            .select(`
                id,
                comprador_id,
                grupo_id,
                nome_visual,
                modo_classificacao,
                dia_fixo,
                hora_inicio,
                observacao,
                recorrente
            `)
            .eq("id", ruleId)
            .eq("comprador_id", COMPRADOR_ID)
            .maybeSingle();

        if (ruleError) {
            throw ruleError;
        }

        if (!rule) {
            throw new Error(
                "A regra não foi encontrada ou não está disponível para este comprador."
            );
        }

        if (rule.recorrente !== true) {
            throw new Error(
                "O Editar Universal desta etapa atende regras recorrentes. Agendamentos pontuais precisam de edição própria."
            );
        }

        const [
            classificationResult,
            manufacturerResult
        ] = await Promise.all([
            supabaseClient
                .from("regra_agendamento_classificacoes")
                .select("classificacao_id")
                .eq("regra_agendamento_id", rule.id),

            supabaseClient
                .from("regra_agendamento_fabricantes")
                .select("fabricante_id")
                .eq("regra_agendamento_id", rule.id)
        ]);

        if (classificationResult.error) {
            throw classificationResult.error;
        }

        if (manufacturerResult.error) {
            throw manufacturerResult.error;
        }

        const classificationIds = [
            ...new Set(
                (classificationResult.data || [])
                    .map(item => String(item.classificacao_id))
            )
        ];

        const manufacturerIds = [
            ...new Set(
                (manufacturerResult.data || [])
                    .map(item => String(item.fabricante_id))
            )
        ];

        if (!classificationIds.length) {
            throw new Error(
                "Esta regra não possui classificações vinculadas."
            );
        }

        if (!manufacturerIds.length) {
            throw new Error(
                "Esta regra não possui fabricantes vinculados."
            );
        }

        /* Selecionar o grupo e carregar suas classificações. */
        groupSelect.value = String(rule.grupo_id);

        await handleGroupChange();

        const classificationInputs = [
            ...classificationsContainer.querySelectorAll(
                'input[name="appointmentClassification"]'
            )
        ];

        for (const classificationId of classificationIds) {
            const input = classificationInputs.find(
                item => String(item.value) === classificationId
            );

            if (!input) {
                throw new Error(
                    "Uma das classificações desta regra não está disponível para o grupo selecionado."
                );
            }

            input.checked = true;
        }

        /* Buscar os nomes dos fabricantes associados. */
        const {
            data: manufacturers,
            error: manufacturersError
        } = await supabaseClient
            .from("vw_fabricantes_por_grupo")
            .select("fabricante_id, nome_fabricante")
            .eq("grupo_id", rule.grupo_id)
            .in("fabricante_id", manufacturerIds)
            .order("nome_fabricante");

        if (manufacturersError) {
            throw manufacturersError;
        }

        const loadedManufacturers = manufacturers || [];

        if (loadedManufacturers.length !== manufacturerIds.length) {
            throw new Error(
                "Nem todos os fabricantes da regra estão disponíveis para o grupo selecionado."
            );
        }

        selectedManufacturerMap.clear();

        loadedManufacturers.forEach(manufacturer => {
            selectedManufacturerMap.set(
                String(manufacturer.fabricante_id),
                manufacturer
            );
        });

        renderSelectedManufacturers();

        /* Preencher os demais campos do formulário. */
        const visualNameInput =
            document.getElementById("appointmentVisualName");

        const dayInput =
            document.getElementById("appointmentDay");

        const timeInput =
            document.getElementById("appointmentTime");

        const observationInput =
            document.getElementById("appointmentObservation");

        if (visualNameInput) {
            visualNameInput.value = rule.nome_visual || "";
        }

        if (dayInput) {
            dayInput.value = String(rule.dia_fixo ?? "");
        }

        if (timeInput) {
            timeInput.value = String(rule.hora_inicio || "").slice(0, 5);
        }

        if (observationInput) {
            observationInput.value = rule.observacao || "";
        }

        const modeValue =
            rule.modo_classificacao || "JUNTAS";

        const modeInput = [
            ...document.querySelectorAll(
                'input[name="modo_classificacao"]'
            )
        ].find(input => input.value === modeValue);

        if (!modeInput) {
            throw new Error(
                "O modo de classificação cadastrado não é reconhecido pelo formulário."
            );
        }

        modeInput.checked = true;

        editingRuleId = String(rule.id);
        editLoadFailed = false;

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Salvar alterações";
            saveButton.dataset.originalText = "Salvar alterações";
        }

        clearMessage();

    } catch (error) {
        console.error(
            "Erro ao carregar regra para edição:",
            error
        );

        editLoadFailed = true;

        if (saveButton) {
            saveButton.disabled = true;
        }

        showMessage(
            error?.message ||
            "Não foi possível carregar os dados da regra para edição."
        );
    }
}

        /* =================================================
   PREENCHER FORMULÁRIO VINDO DA AGENDA POR RUPTURA
================================================= */

async function applyPrefill(prefill) {

    try {

const dateValue = String(
    prefill.dataAgendamento ||
    prefill.date ||
    ""
);

const timeValue = String(
    prefill.horaInicio ||
    prefill.time ||
    ""
);

const dateParts = dateValue.split("-");

const dayValue =
    prefill.diaFixo ||
    (
        dateParts.length === 3
            ? Number(dateParts[2])
            : null
    );

const dayInput =
    document.getElementById("appointmentDay");

const timeInput =
    document.getElementById("appointmentTime");


if (dayInput && dayValue) {
    dayInput.value = String(dayValue);
}

if (timeInput && timeValue) {
    timeInput.value = timeValue;
}


const grupoId =
    String(prefill.grupoId || "");

const classificacaoId =
    String(prefill.classificacaoId || "");

const fabricanteId =
    String(prefill.fabricanteId || "");


/*
 * Abertura originada apenas de uma data vazia.
 * Não exige grupo, classificação ou fabricante.
 */

if (
    !grupoId &&
    !classificacaoId &&
    !fabricanteId
) {
    return;
}


if (
    !grupoId ||
    !classificacaoId ||
    !fabricanteId
) {
    showMessage(
        "Não foi possível identificar o grupo, a classificação e o fabricante."
    );

    return;
}


        /*
         * O grupo precisa estar entre os grupos
         * disponíveis para este comprador.
         */

        const grupoPermitido =
            groups.some(group =>
                String(group.grupo_id) === grupoId
            );


        if (!grupoPermitido) {

            showMessage(
                "O grupo selecionado não está disponível para este comprador."
            );

            return;

        }


        /*
         * Seleciona o grupo e carrega suas classificações.
         */

        groupSelect.value = grupoId;

        await handleGroupChange();


        /*
         * Marca somente a classificação recebida.
         */

        const classificationInput =
            Array.from(
                classificationsContainer.querySelectorAll(
                    'input[name="appointmentClassification"]'
                )
            ).find(input =>
                input.value === classificacaoId
            );


        if (!classificationInput) {

            showMessage(
                "A classificação selecionada não pertence ao grupo escolhido."
            );

            return;

        }


        classificationInput.checked = true;


        /*
         * Confere se o fabricante está disponível
         * para o grupo selecionado.
         */

        const {
            data: manufacturer,
            error
        } = await supabaseClient

            .from("vw_fabricantes_por_grupo")

            .select(
                "fabricante_id, nome_fabricante"
            )

            .eq(
                "grupo_id",
                grupoId
            )

            .eq(
                "fabricante_id",
                fabricanteId
            )

            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!manufacturer) {

            showMessage(
                "O fabricante não foi encontrado para o grupo selecionado."
            );

            return;

        }


        /*
         * Preenche a lista de fabricantes selecionados.
         */

        selectedManufacturerMap.clear();

        selectedManufacturerMap.set(
            manufacturer.fabricante_id,
            manufacturer
        );

        renderSelectedManufacturers();


        /*
         * Utiliza o nome do fabricante como nome visual inicial.
         * O comprador ainda pode editá-lo.
         */

        const visualNameInput =
            document.getElementById(
                "appointmentVisualName"
            );


        if (visualNameInput) {

            visualNameInput.value =
                manufacturer.nome_fabricante || "";

        }


    } catch (error) {

        console.error(
            "Erro ao preencher o agendamento vindo da ruptura:",
            error
        );

        showMessage(
            error.message ||
            "Não foi possível preencher os dados do agendamento."
        );

    }

}


        /* =================================================
           RENDERIZAR CLASSIFICAÇÕES
        ================================================= */

        function renderClassifications() {

            if (!classificationsContainer) {
                return;
            }


            if (
                classifications.length === 0
            ) {

                classificationsContainer.innerHTML = `
                    <div class="agendamento-empty">
                        Nenhuma classificação configurada para este grupo.
                    </div>
                `;


                return;

            }


            classificationsContainer.innerHTML =
                classifications
                    .map(
                        classification => `

                            <label
                                class="agendamento-check-option"
                            >

                                <input
                                    type="checkbox"
                                    name="appointmentClassification"
                                    value="${escapeHtml(
                                        classification.classificacao_id
                                    )}"
                                    data-code="${escapeHtml(
                                        classification.classificacao_codigo
                                    )}"
                                    data-name="${escapeHtml(
                                        classification.classificacao_nome
                                    )}"
                                >

                                <span>
                                    ${escapeHtml(
                                        classification.classificacao_nome
                                    )}
                                </span>

                            </label>

                        `
                    )
                    .join("");

        }


        /* =================================================
           BUSCAR FABRICANTES
        ================================================= */

        if (manufacturerSearch) {

            manufacturerSearch.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        searchTimer
                    );


                    searchTimer =
                        setTimeout(
                            () => {

                                searchManufacturers();

                            },
                            250
                        );

                }
            );

        }


        async function searchManufacturers() {

            const grupoId =
                groupSelect.value;


            const termo =
                manufacturerSearch.value
                    .trim();


            manufacturerResults.innerHTML =
                "";


            manufacturerList = [];


            if (!grupoId) {
                return;
            }


            if (termo.length < 2) {

                if (termo.length > 0) {

                    manufacturerResults.innerHTML = `
                        <div class="agendamento-empty">
                            Digite pelo menos 2 caracteres.
                        </div>
                    `;

                }


                return;

            }


            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient

                        .from(
                            "vw_fabricantes_por_grupo"
                        )

                        .select(
                            "fabricante_id, nome_fabricante"
                        )

                        .eq(
                            "grupo_id",
                            grupoId
                        )

                        .ilike(
                            "nome_fabricante",
                            `%${termo}%`
                        )

                        .order(
                            "nome_fabricante"
                        )

                        .limit(
                            30
                        );


                if (error) {
                    throw error;
                }


                manufacturerList =
                    data || [];


                renderManufacturerResults();


            } catch (error) {

                console.error(
                    "Erro ao pesquisar fabricantes:",
                    error
                );


                manufacturerResults.innerHTML = `
                    <div class="agendamento-empty">
                        Não foi possível pesquisar os fabricantes.
                    </div>
                `;

            }

        }


        /* =================================================
           RESULTADOS DOS FABRICANTES
        ================================================= */

        function renderManufacturerResults() {

            if (!manufacturerResults) {
                return;
            }


            if (
                manufacturerList.length === 0
            ) {

                manufacturerResults.innerHTML = `
                    <div class="agendamento-empty">
                        Nenhum fabricante encontrado.
                    </div>
                `;


                return;

            }


            manufacturerResults.innerHTML =
                manufacturerList

                    .map(
                        manufacturer => {

                            const selected =
                                selectedManufacturerMap.has(
                                    manufacturer.fabricante_id
                                );


                            return `

                                <div
                                    class="
                                        agendamento-search-result
                                        ${selected ? "selected" : ""}
                                    "
                                    data-manufacturer-id="${escapeHtml(
                                        manufacturer.fabricante_id
                                    )}"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            manufacturer.nome_fabricante
                                        )}
                                    </strong>

                                    <small>
                                        ${selected
                                            ? "Selecionado"
                                            : "Selecionar"
                                        }
                                    </small>

                                </div>

                            `;

                        }
                    )
                    .join("");

        }


        /* =================================================
           SELECIONAR FABRICANTE
        ================================================= */

        if (manufacturerResults) {

            manufacturerResults.addEventListener(
                "click",
                event => {

                    const item =
                        event.target.closest(
                            ".agendamento-search-result"
                        );


                    if (!item) {
                        return;
                    }


                    const id =
                        item.dataset.manufacturerId;


                    const manufacturer =
                        manufacturerList.find(
                            entry =>
                                entry.fabricante_id ===
                                id
                        );


                    if (!manufacturer) {
                        return;
                    }


                    if (
                        selectedManufacturerMap.has(
                            id
                        )
                    ) {

                        selectedManufacturerMap.delete(
                            id
                        );

                    } else {

                        selectedManufacturerMap.set(
                            id,
                            manufacturer
                        );

                    }


                    renderSelectedManufacturers();


                    /* -------------------------------------------------
                       LIMPAR PESQUISA
                    ------------------------------------------------- */

                    manufacturerSearch.value =
                        "";


                    manufacturerResults.innerHTML =
                        "";


                    manufacturerList = [];


                    /* -------------------------------------------------
                       PREPARAR PRÓXIMA PESQUISA
                    ------------------------------------------------- */

                    manufacturerSearch.focus();

                }
            );

        }


        /* =================================================
           FABRICANTES SELECIONADOS
        ================================================= */

        function renderSelectedManufacturers() {

            if (!selectedManufacturers) {
                return;
            }


            if (
                selectedManufacturerMap.size === 0
            ) {

                selectedManufacturers.innerHTML = `
                    <div class="agendamento-empty">
                        Nenhum fabricante selecionado.
                    </div>
                `;


                return;

            }


            selectedManufacturers.innerHTML =
                Array.from(
                    selectedManufacturerMap.values()
                )
                .map(
                    manufacturer => `

                        <span
                            class="agendamento-selected-item"
                        >

                            ${escapeHtml(
                                manufacturer.nome_fabricante
                            )}

                            <button
                                type="button"
                                class="agendamento-selected-remove"
                                data-remove-manufacturer="${escapeHtml(
                                    manufacturer.fabricante_id
                                )}"
                                aria-label="Remover fabricante"
                            >
                                ×
                            </button>

                        </span>

                    `
                )
                .join("");

        }


        /* =================================================
           REMOVER FABRICANTE
        ================================================= */

        if (selectedManufacturers) {

            selectedManufacturers.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "[data-remove-manufacturer]"
                        );


                    if (!button) {
                        return;
                    }


                    selectedManufacturerMap.delete(
                        button.dataset.removeManufacturer
                    );


                    renderSelectedManufacturers();


                    manufacturerSearch.value =
                        "";


                    manufacturerResults.innerHTML =
                        "";

                }
            );

        }


        /* =================================================
           SALVAR AGENDAMENTO
        ================================================= */

        if (form) {

            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    clearMessage();


                    const grupoId =
                        groupSelect.value;


                    const classificationIds =
                        [
                            ...document.querySelectorAll(
                                'input[name="appointmentClassification"]:checked'
                            )
                        ]
                        .map(
                            input =>
                                input.value
                        );


                    const nomeVisual =
                        document
                            .getElementById(
                                "appointmentVisualName"
                            )
                            .value
                            .trim();


                    const modo =
                        document.querySelector(
                            'input[name="modo_classificacao"]:checked'
                        )
                        ?.value ||
                        "JUNTAS";


                    const dia =
                        Number(
                            document
                                .getElementById(
                                    "appointmentDay"
                                )
                                .value
                        );


                    const hora =
                        document
                            .getElementById(
                                "appointmentTime"
                            )
                            .value;


                    const observacao =
                        document
                            .getElementById(
                                "appointmentObservation"
                            )
                            .value
                            .trim();


                    const fabricanteIds =
                        Array.from(
                            selectedManufacturerMap.keys()
                        );


                    /* =================================================
                       VALIDAÇÕES
                    ================================================= */

                    if (!grupoId) {

                        showMessage(
                            "Selecione um grupo."
                        );

                        return;

                    }


                    if (
                        classificationIds.length === 0
                    ) {

                        showMessage(
                            "Selecione pelo menos uma classificação."
                        );

                        return;

                    }


                    if (
                        fabricanteIds.length === 0
                    ) {

                        showMessage(
                            "Selecione pelo menos um fabricante."
                        );

                        return;

                    }


                    if (!nomeVisual) {

                        showMessage(
                            "Informe o nome que aparecerá na agenda."
                        );

                        return;

                    }


                    if (
                        !Number.isInteger(dia) ||
                        dia < 1 ||
                        dia > 31
                    ) {

                        showMessage(
                            "Informe um dia fixo entre 1 e 31."
                        );

                        return;

                    }


                    if (!hora) {

                        showMessage(
                            "Informe o horário."
                        );

                        return;

                    }

                    if (editLoadFailed) {
    showMessage(
        "Não é possível salvar porque os dados da regra não foram carregados corretamente."
    );

    return;
}

const savingEdit = Boolean(editingRuleId);

if (savingEdit) {
    const confirmed = window.confirm(
        "EDITAR TODA A RECORRÊNCIA?\n\n" +
        "As alterações serão aplicadas à regra inteira e a todas as ocorrências vinculadas, " +
        "incluindo datas passadas, atuais e futuras.\n\n" +
        "Isso inclui grupo, fabricantes, classificações, dia fixo, horário e observações.\n\n" +
        "Os status de conclusão serão preservados sempre que os IDs das ocorrências forem mantidos.\n\n" +
        "Deseja continuar?"
    );

    if (!confirmed) {
        return;
    }
}


                    /* =================================================
                       BLOQUEAR BOTÃO
                    ================================================= */

                    if (saveButton) {

                        saveButton.disabled =
                            true;


                        saveButton.dataset.originalText =
                            saveButton.textContent;


                        saveButton.textContent =
                            "Salvando...";

                    }


                    try {

/* =================================================
   CRIAR NOVA REGRA OU EDITAR REGRA EXISTENTE
================================================= */

let data;
let error;

if (savingEdit) {
    const result = await supabaseClient.rpc(
        "editar_regra_agendamento_universal",
        {
            p_regra_agendamento_id: editingRuleId,
            p_comprador_id: COMPRADOR_ID,
            p_grupo_id: grupoId,
            p_nome_visual: nomeVisual,
            p_modo_classificacao: modo,
            p_dia_fixo: dia,
            p_hora_inicio: hora,
            p_observacao: observacao || null,
            p_classificacao_ids: classificationIds,
            p_fabricante_ids: fabricanteIds
        }
    );

    data = result.data;
    error = result.error;

} else {
    const result = await supabaseClient.rpc(
        "criar_agendamento_completo",
        {
            p_comprador_id: COMPRADOR_ID,
            p_grupo_id: grupoId,
            p_nome_visual: nomeVisual,
            p_modo_classificacao: modo,
            p_dia_fixo: dia,
            p_hora_inicio: hora,
            p_observacao: observacao || null,
            p_classificacao_ids: classificationIds,
            p_fabricante_ids: fabricanteIds,
            p_data_base: getTodayISO()
        }
    );

    data = result.data;
    error = result.error;
}

if (error) {
    throw error;
}

console.log(
    savingEdit
        ? "Regra recorrente atualizada:"
        : "Agendamento criado:",
    data
);

showMessage(
    savingEdit
        ? "Regra recorrente atualizada com sucesso."
        : "Agendamento salvo com sucesso."
);

window.dispatchEvent(
    new CustomEvent("agenda:updated")
);

                        /* =================================================
                           LIMPAR FORMULÁRIO
                        ================================================= */

                        if (form) {
                            form.reset();
                        }


                        selectedManufacturerMap.clear();

                        renderSelectedManufacturers();


                        manufacturerSearch.value =
                            "";


                        manufacturerSearch.disabled =
                            true;


                        manufacturerResults.innerHTML =
                            "";


                        /* =================================================
                           FECHAR APÓS PEQUENO INTERVALO
                        ================================================= */

                        setTimeout(
                            () => {

                                closeModal();

                            },
                            700
                        );


                    } catch (error) {

                        console.error(
                            "Erro ao salvar agendamento:",
                            error
                        );


                        let mensagem =
                            "Não foi possível salvar o agendamento.";


                        if (
                            error?.message
                        ) {

                            mensagem =
                                error.message;

                        }


                        showMessage(
                            mensagem
                        );

                    } finally {

                        if (saveButton) {

                            saveButton.disabled =
                                false;


                            saveButton.textContent =
                                saveButton.dataset.originalText ||
                                "Salvar agendamento";

                        }

                    }

                }
            );

        }


        /* =================================================
           ESCUTAS
        ================================================= */

        openButton?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openModal();

            }
        );


        closeButton?.addEventListener(
            "click",
            closeModal
        );


        cancelButton?.addEventListener(
            "click",
            closeModal
        );


        groupSelect?.addEventListener(
            "change",
            handleGroupChange
        );


        modal?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closeModal();

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    modal &&
                    !modal.classList.contains(
                        "hidden"
                    )
                ) {

                    closeModal();

                }

            }
        );


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
           EXPOR ABERTURA
        ================================================= */

        window.abrirNovoAgendamento =
            openModal;

    }
);