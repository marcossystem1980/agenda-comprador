/* =========================================
   AGENDA COMPRADOR — ÁREA ADM
========================================= */

const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");
const adminAlert = document.getElementById("adminAlert");
const logoutButton = document.getElementById("logoutButton");

const buyerSearch = document.getElementById("buyerSearch");
const buyersCount = document.getElementById("buyersCount");
const buyersTableBody = document.getElementById("buyersTableBody");

const selectedAgendaSection =
    document.getElementById("selectedAgendaSection");

const selectedAgendaHeading =
    document.getElementById("selectedAgendaHeading");

const selectedAgendaDescription =
    document.getElementById("selectedAgendaDescription");

const buyerAgendaBody =
    document.getElementById("buyerAgendaBody");

const buyerAgendaMessage =
    document.getElementById("buyerAgendaMessage");

const backToBuyersButton =
    document.getElementById("backToBuyersButton");

const accessForm = document.getElementById("accessForm");

const accessNameInput =
    document.getElementById("accessName");

const accessEmailInput =
    document.getElementById("accessEmail");

const accessProfileSelect =
    document.getElementById("accessProfile");

const accessCargoGroup =
    document.getElementById("accessCargoGroup");

const accessCargoInput =
    document.getElementById("accessCargo");

const accessFormMessage =
    document.getElementById("accessFormMessage");

const createAccessButton =
    document.getElementById("createAccessButton");


let allBuyers = [];


/* =========================================
   MENSAGENS
========================================= */

function showAdminMessage(message) {
    if (!adminAlert) return;

    adminAlert.textContent = message;
    adminAlert.hidden = false;
}

function showAgendaMessage(message) {
    if (!buyerAgendaMessage) return;

    buyerAgendaMessage.textContent = message;
    buyerAgendaMessage.hidden = false;
}

function hideAgendaMessage() {
    if (!buyerAgendaMessage) return;

    buyerAgendaMessage.textContent = "";
    buyerAgendaMessage.hidden = true;
}


/* =========================================
   CRIAR CÉLULAS COM TEXTO SEGURO
========================================= */

function createCell(value) {
    const cell = document.createElement("td");

    cell.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);

    return cell;
}

function showTableMessage(tbody, columns, message) {
    tbody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columns;
    cell.textContent = message;

    row.appendChild(cell);
    tbody.appendChild(row);
}


/* =========================================
   FORMATAR DATA E HORÁRIO
========================================= */

function formatDate(value) {
    if (!value) return "—";

    const parts = String(value).split("-");

    if (parts.length !== 3) return String(value);

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value) {
    if (!value) return "—";

    return String(value).slice(0, 5);
}


/* =========================================
   VERIFICAR SESSÃO E PERFIL ADM
========================================= */

async function initializeAdmin() {
    if (typeof supabaseClient === "undefined") {
        showAdminMessage(
            "A conexão com o Supabase não foi inicializada. " +
            "Confira a ordem dos scripts no HTML."
        );

        return;
    }

    try {
        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();

        if (authError) {
            throw authError;
        }

        if (!user) {
            window.location.replace("./login.html");
            return;
        }

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("perfis_usuario")
            .select("nome, perfil, ativo")
            .eq("user_id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "Erro ao consultar perfil:",
                profileError
            );

            showAdminMessage(
                "Não foi possível verificar as permissões. " +
                "Confira as políticas do Supabase."
            );

            return;
        }

        if (
            !profile ||
            profile.ativo !== true ||
            String(profile.perfil).trim().toLowerCase() !== "adm"
        ) {
            await supabaseClient.auth.signOut();

            window.location.replace("./login.html");
            return;
        }

        if (adminName) {
            adminName.textContent =
                profile.nome || "Administrador";
        }

        if (adminEmail) {
            adminEmail.textContent = user.email || "";
        }

        // Só carrega os compradores após confirmar o perfil ADM.
        await loadBuyers();

    } catch (error) {
        console.error(
            "Erro ao inicializar a área ADM:",
            error
        );

        showAdminMessage(
            "Não foi possível validar o acesso administrativo."
        );
    }
}


/* =========================================
   CARREGAR COMPRADORES DO SUPABASE
========================================= */

async function loadBuyers() {
    if (!buyersTableBody) return;

    showTableMessage(
        buyersTableBody,
        5,
        "Carregando compradores..."
    );

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("compradores")
            .select("id, nome, email, cargo, ativo")
            .order("nome", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        allBuyers = data || [];

        renderBuyers();

    } catch (error) {
        console.error(
            "Erro ao carregar compradores:",
            error
        );

        allBuyers = [];

        showTableMessage(
            buyersTableBody,
            5,
            "Não foi possível carregar os compradores. " +
            "Verifique as permissões de leitura."
        );

        if (buyersCount) {
            buyersCount.textContent = "Erro na consulta";
        }
    }
}


/* =========================================
   EXIBIR E FILTRAR COMPRADORES
========================================= */

function renderBuyers() {
    if (!buyersTableBody) return;

    const searchTerm = buyerSearch
        ? buyerSearch.value.trim().toLowerCase()
        : "";

    const filteredBuyers = allBuyers.filter(buyer => {
        const searchableText = [
            buyer.nome,
            buyer.email,
            buyer.cargo
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchTerm);
    });

    if (buyersCount) {
        buyersCount.textContent =
            `${filteredBuyers.length} comprador(es)`;
    }

    buyersTableBody.replaceChildren();

    if (filteredBuyers.length === 0) {
        showTableMessage(
            buyersTableBody,
            5,
            allBuyers.length === 0
                ? "Nenhum comprador cadastrado."
                : "Nenhum comprador corresponde à busca."
        );

        return;
    }

    filteredBuyers.forEach(buyer => {
        const row = document.createElement("tr");

        row.appendChild(createCell(buyer.nome));
        row.appendChild(createCell(buyer.email));
        row.appendChild(createCell(buyer.cargo || "Comprador"));
        row.appendChild(
            createCell(buyer.ativo ? "Ativo" : "Inativo")
        );

        const actionCell = document.createElement("td");
        const openButton = document.createElement("button");

        openButton.type = "button";
        openButton.className = "adm-table-action";
        openButton.textContent = "Ver agenda";

        openButton.addEventListener("click", () => {
            openBuyerAgenda(buyer, openButton);
        });

        actionCell.appendChild(openButton);
        row.appendChild(actionCell);

        buyersTableBody.appendChild(row);
    });
}


/* =========================================
   ABRIR A AGENDA DO COMPRADOR
========================================= */

function openBuyerAgenda(buyer, button) {

    // Validar o comprador selecionado.
    if (!buyer || !buyer.id) {

        showAdminMessage(
            "Não foi possível identificar o comprador selecionado."
        );

        return;
    }

    // Preparar a URL da agenda completa.
    const agendaUrl = new URL(
        "./paginas/agenda-compras/agenda.html",
        window.location.href
    );

    // Informar qual comprador o ADM deseja visualizar.
    agendaUrl.searchParams.set(
        "comprador",
        buyer.id
    );

    // Abrir o calendário completo.
    window.location.assign(
        agendaUrl.toString()
    );
}


/* =========================================
   EVENTOS DA INTERFACE
========================================= */

if (buyerSearch) {
    buyerSearch.addEventListener("input", renderBuyers);
}

if (backToBuyersButton) {
    backToBuyersButton.addEventListener("click", () => {
        if (selectedAgendaSection) {
            selectedAgendaSection.hidden = true;
        }

        document
            .getElementById("compradoresLista")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Saindo...";

        try {
            const {
                error
            } = await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.replace("./login.html");

        } catch (error) {
            console.error("Erro ao sair:", error);

            showAdminMessage(
                "Não foi possível encerrar a sessão. Tente novamente."
            );

            logoutButton.disabled = false;
            logoutButton.textContent = "Sair";
        }
    });
}

/* =========================================
   CADASTRO DE ACESSOS
========================================= */

function mostrarMensagemAcesso(mensagem) {
    if (!accessFormMessage) return;

    accessFormMessage.textContent = mensagem;
    accessFormMessage.hidden = false;
}


/* =========================================
   EXIBIR CAMPO CARGO CONFORME O PERFIL
========================================= */

function atualizarCamposAcesso() {
    if (!accessProfileSelect) return;

    const perfilAdm = accessProfileSelect.value === "adm";

    if (accessCargoGroup) {
        accessCargoGroup.hidden = perfilAdm;
        accessCargoGroup.style.display =
            perfilAdm ? "none" : "";
    }

    if (perfilAdm && accessCargoInput) {
        accessCargoInput.value = "";
    }
}

if (accessProfileSelect) {
    accessProfileSelect.addEventListener(
        "change",
        atualizarCamposAcesso
    );

    atualizarCamposAcesso();
}


/* =========================================
   ENVIAR CONVITE PELO SUPABASE
========================================= */

if (accessForm) {
    accessForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!accessNameInput ||
            !accessEmailInput ||
            !accessProfileSelect) {
            mostrarMensagemAcesso(
                "Não foi possível identificar os campos do formulário."
            );

            return;
        }

        const nome = accessNameInput.value.trim();

        const email =
            accessEmailInput.value.trim().toLowerCase();

        const perfil = accessProfileSelect.value;

        const cargo =
            perfil === "comprador" && accessCargoInput
                ? accessCargoInput.value.trim()
                : "";

        /* Validar os dados antes de chamar a função */

        if (nome.length < 2) {
            mostrarMensagemAcesso(
                "Informe o nome completo do usuário."
            );

            accessNameInput.focus();
            return;
        }

        if (!email) {
            mostrarMensagemAcesso(
                "Informe o e-mail de acesso."
            );

            accessEmailInput.focus();
            return;
        }

        if (!["comprador", "adm"].includes(perfil)) {
            mostrarMensagemAcesso(
                "Selecione Comprador ou Administrador."
            );

            return;
        }

        if (typeof supabaseClient === "undefined") {
            mostrarMensagemAcesso(
                "Não foi possível conectar ao Supabase."
            );

            return;
        }

        /* Preparar o botão */

        if (createAccessButton) {
            createAccessButton.disabled = true;
            createAccessButton.textContent =
                "Enviando convite...";
        }

        try {
            /* Chamar a Edge Function publicada */

            const { data, error } =
                await supabaseClient.functions.invoke(
                    "criar-acesso",
                    {
                        body: {
                            nome,
                            email,
                            perfil,
                            cargo
                        }
                    }
                );

            /* Ler a mensagem retornada pelo servidor */

            if (error) {
                let mensagemServidor = "";

                if (
                    error.context &&
                    typeof error.context.clone === "function"
                ) {
                    try {
                        const resposta =
                            await error.context.clone().json();

                        mensagemServidor =
                            resposta.error ||
                            resposta.message ||
                            "";
                    } catch {
                        // Mantém a mensagem genérica abaixo.
                    }
                }

                throw new Error(
                    mensagemServidor ||
                    "Não foi possível enviar o convite. " +
                    "Confira os logs da função no Supabase."
                );
            }

            if (!data || data.success !== true) {
                throw new Error(
                    data?.error ||
                    "O servidor não confirmou a criação do acesso."
                );
            }

            /* Limpar o formulário após o sucesso */

            accessForm.reset();
            atualizarCamposAcesso();

            mostrarMensagemAcesso(
                `Convite enviado para ${email}. ` +
                "O usuário deverá acessar o e-mail e definir a própria senha."
            );

            /* Atualizar a lista caso seja um comprador */

            if (perfil === "comprador") {
                await loadBuyers();
            }

        } catch (error) {
            console.error(
                "Erro ao criar acesso:",
                error
            );

            mostrarMensagemAcesso(
                error.message ||
                "Ocorreu um erro ao criar o acesso."
            );

        } finally {
            if (createAccessButton) {
                createAccessButton.disabled = false;
                createAccessButton.textContent =
                    "Enviar convite";
            }
        }
    });
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

initializeAdmin();