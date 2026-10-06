/* =========================================================
   NOVO AGENDAMENTO
   AGENDA COMPRADOR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* =================================================
           COMPRADOR DE TESTE
           TEMPORÁRIO
        ================================================= */

        const COMPRADOR_ID =
            "c84c12af-5c2c-4734-9d2b-e075ac4cf0f2";


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

        const selectedManufacturerMap =
            new Map();


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
        ================================================= */

        async function openModal() {

            if (!modal) {
                return;
            }


            clearMessage();


            if (form) {
                form.reset();
            }


            selectedManufacturerMap.clear();

            manufacturerList = [];


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


            renderSelectedManufacturers();


            modal.classList.remove(
                "hidden"
            );


            document.body.classList.add(
                "modal-open"
            );


            await loadGroups();

        }


        /* =================================================
           FECHAR MODAL
        ================================================= */

        function closeModal() {

            if (!modal) {
                return;
            }


            modal.classList.add(
                "hidden"
            );


            document.body.classList.remove(
                "modal-open"
            );


            clearMessage();

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
                           CHAMAR FUNÇÃO DO SUPABASE
                        ================================================= */

                        const {
                            data,
                            error
                        } =
                            await supabaseClient.rpc(
                                "criar_agendamento_completo",
                                {

                                    p_comprador_id:
                                        COMPRADOR_ID,

                                    p_grupo_id:
                                        grupoId,

                                    p_nome_visual:
                                        nomeVisual,

                                    p_modo_classificacao:
                                        modo,

                                    p_dia_fixo:
                                        dia,

                                    p_hora_inicio:
                                        hora,

                                    p_observacao:
                                        observacao ||
                                        null,

                                    p_classificacao_ids:
                                        classificationIds,

                                    p_fabricante_ids:
                                        fabricanteIds,

                                    p_data_base:
                                        getTodayISO()

                                }
                            );


                        if (error) {
                            throw error;
                        }


                        console.log(
                            "Agendamento criado com sucesso:",
                            data
                        );


                        showMessage(
                            "Agendamento salvo com sucesso."
                        );

window.dispatchEvent(
    new CustomEvent(
        "agenda:updated"
    )
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