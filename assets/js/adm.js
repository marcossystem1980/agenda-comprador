/* =========================================================
   AGENDA COMPRADOR — ADMINISTRAÇÃO
   Shell compartilhado, segurança visual, cartões e convites.
   Mantém as regras de acesso e o fluxo de convite existentes.
========================================================= */
(() => {
    "use strict";

    const adminName = document.getElementById("adminName");
    const adminEmail = document.getElementById("adminEmail");
    const adminAvatar = document.getElementById("adminAvatar");
    const adminAlert = document.getElementById("adminAlert");
    const logoutButton = document.getElementById("logoutButton");

    const buyerSearch = document.getElementById("buyerSearch");
    const buyersCount = document.getElementById("buyersCount");
    const buyersCardsGrid = document.getElementById("buyersCardsGrid");

    const accessForm = document.getElementById("accessForm");
    const accessNameInput = document.getElementById("accessName");
    const accessEmailInput = document.getElementById("accessEmail");
    const accessProfileSelect = document.getElementById("accessProfile");
    const accessCargoGroup = document.getElementById("accessCargoGroup");
    const accessCargoInput = document.getElementById("accessCargo");
    const accessFormMessage = document.getElementById("accessFormMessage");
    const createAccessButton = document.getElementById("createAccessButton");

    let allBuyers = [];
    let admContext = null;

    function showAdminMessage(message, type = "error") {
        if (!adminAlert) return;
        adminAlert.textContent = message;
        adminAlert.hidden = false;
        adminAlert.dataset.state = type;
    }

    function showInlineMessage(element, message, type = "info") {
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
        element.dataset.state = type;
    }

    function hideInlineMessage(element) {
        if (!element) return;
        element.textContent = "";
        element.hidden = true;
        delete element.dataset.state;
    }

    function initials(name) {
        const clean = String(name || "Administrador").trim();
        if (!clean) return "A";
        const parts = clean.split(/\s+/).filter(Boolean);
        return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0])
            .toUpperCase()
            .slice(0, 2);
    }

    function clearAvatar(element, name) {
        if (!element) return;
        element.style.backgroundImage = "";
        element.textContent = initials(name);
    }

    async function getProfile(userId) {
        // foto_url pode ainda não ter sido adicionada caso a migração de perfil não tenha sido executada.
        const withPhoto = await supabaseClient
            .from("perfis_usuario")
            .select("user_id, nome, perfil, ativo, foto_url")
            .eq("user_id", userId)
            .maybeSingle();

        if (!withPhoto.error) return withPhoto;

        const fallback = await supabaseClient
            .from("perfis_usuario")
            .select("user_id, nome, perfil, ativo")
            .eq("user_id", userId)
            .maybeSingle();

        if (fallback.error) throw fallback.error;
        return { data: fallback.data ? { ...fallback.data, foto_url: null } : null, error: null };
    }

    async function applyAdminIdentity(profile, user) {
        const name = profile?.nome || "Administrador";
        if (adminName) adminName.textContent = name;
        if (adminEmail) adminEmail.textContent = user?.email || "";
        clearAvatar(adminAvatar, name);

        const photoPath = profile?.foto_url;
        if (!photoPath || !adminAvatar) return;

        try {
            let url = photoPath;
            if (!/^https?:\/\//i.test(photoPath)) {
                const { data, error } = await supabaseClient
                    .storage
                    .from("fotos-administradores")
                    .createSignedUrl(photoPath, 3600);
                if (error) throw error;
                url = data?.signedUrl;
            }
            if (url) {
                adminAvatar.style.backgroundImage = `url("${url}")`;
                adminAvatar.style.backgroundPosition = "center";
                adminAvatar.style.backgroundSize = "cover";
                adminAvatar.style.backgroundRepeat = "no-repeat";
                adminAvatar.textContent = "";
            }
        } catch (error) {
            console.error("Não foi possível carregar a foto do administrador:", error);
            // Mantém as iniciais como alternativa se a foto falhar.
            clearAvatar(adminAvatar, name);
        }
    }

    async function initializeAdmin() {
        if (typeof supabaseClient === "undefined") {
            showAdminMessage("A conexão com o Supabase não foi inicializada. Confira os scripts no HTML.");
            return { allowed: false };
        }

        try {
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;
            const user = authData?.user;

            if (!user) {
                window.location.replace("./login.html");
                return { allowed: false };
            }

            const { data: profile, error: profileError } = await getProfile(user.id);
            if (profileError) throw profileError;

            if (!profile || profile.ativo !== true || String(profile.perfil || "").trim().toLowerCase() !== "adm") {
                await supabaseClient.auth.signOut();
                window.location.replace("./login.html");
                return { allowed: false };
            }

            admContext = { allowed: true, user, profile };
            await applyAdminIdentity(profile, user);

            if (buyersCardsGrid) await loadBuyers();
            return admContext;
        } catch (error) {
            console.error("Erro ao inicializar a área ADM:", error);
            showAdminMessage(`Não foi possível validar o acesso administrativo. ${error?.message || "Confira as permissões do Supabase."}`);
            return { allowed: false, error };
        }
    }

    async function loadBuyers() {
        if (!buyersCardsGrid) return;
        buyersCardsGrid.replaceChildren();
        const loading = document.createElement("div");
        loading.className = "adm-loading-card";
        loading.textContent = "Carregando compradores...";
        buyersCardsGrid.appendChild(loading);

        try {
            const { data, error } = await supabaseClient
                .from("compradores")
                .select("id, nome, email, cargo, ativo, foto_url")
                .order("nome", { ascending: true });
            if (error) throw error;
allBuyers = await Promise.all(
    (data || []).map(async buyer => {
        let fotoAssinada = null;

        if (buyer.foto_url) {
            try {
                const { data: photoData, error: photoError } =
                    await supabaseClient
                        .storage
                        .from("fotos-compradores")
                        .createSignedUrl(
                            buyer.foto_url,
                            3600
                        );

                if (photoError) {
                    throw photoError;
                }

                fotoAssinada =
                    photoData?.signedUrl || null;

            } catch (error) {
                console.error(
                    `Erro ao carregar foto de ${buyer.nome}:`,
                    error
                );
            }
        }

        return {
            ...buyer,
            fotoAssinada
        };
    })
);

renderBuyers();
        } catch (error) {
            console.error("Erro ao carregar compradores:", error);
            allBuyers = [];
            buyersCardsGrid.replaceChildren();
            const message = document.createElement("div");
            message.className = "adm-empty-state";
            message.textContent = "Não foi possível carregar os compradores. Verifique as permissões de leitura.";
            buyersCardsGrid.appendChild(message);
            if (buyersCount) buyersCount.textContent = "Erro na consulta";
        }
    }

    function renderBuyers() {
        if (!buyersCardsGrid) return;
        const term = buyerSearch?.value?.trim().toLocaleLowerCase("pt-BR") || "";
        const filtered = allBuyers.filter(buyer => [buyer.nome, buyer.email, buyer.cargo]
            .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(term));

        if (buyersCount) buyersCount.textContent = `${filtered.length} comprador(es)`;
        buyersCardsGrid.replaceChildren();

        if (!filtered.length) {
            const empty = document.createElement("div");
            empty.className = "adm-empty-state";
            empty.textContent = allBuyers.length ? "Nenhum comprador corresponde à busca." : "Nenhum comprador cadastrado.";
            buyersCardsGrid.appendChild(empty);
            return;
        }

        filtered.forEach(buyer => {
            const card = document.createElement("article");
            card.className = "adm-buyer-card";

            const top = document.createElement("div");
            top.className = "adm-buyer-card-top";
const avatar = document.createElement("div");

avatar.className = "adm-buyer-avatar";

if (buyer.fotoAssinada) {
    avatar.style.backgroundImage =
        `url("${buyer.fotoAssinada}")`;

    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.style.backgroundRepeat = "no-repeat";

    avatar.textContent = "";

    avatar.setAttribute(
        "aria-label",
        `Foto de ${buyer.nome || "comprador"}`
    );
} else {
    avatar.textContent =
        initials(buyer.nome || "Comprador");

    avatar.setAttribute(
        "aria-label",
        `Iniciais de ${buyer.nome || "comprador"}`
    );
}
            const identity = document.createElement("div");
            identity.className = "adm-buyer-identity";
            const name = document.createElement("h3");
            name.textContent = buyer.nome || "Comprador sem nome";
            const email = document.createElement("p");
            email.textContent = buyer.email || "Sem e-mail cadastrado";
            identity.append(name, email);
            top.append(avatar, identity);

            const meta = document.createElement("div");
            meta.className = "adm-buyer-meta";
            const status = document.createElement("span");
            status.className = `adm-status-pill${buyer.ativo ? "" : " inactive"}`;
            status.textContent = buyer.ativo ? "Ativo" : "Inativo";
            const cargo = document.createElement("span");
            cargo.className = "adm-buyer-cargo";
            cargo.textContent = buyer.cargo || "Comprador";
            meta.append(status, cargo);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "adm-table-action";
            button.textContent = "Consultar agenda";
            button.disabled = !buyer.ativo;
            button.addEventListener("click", () => openBuyerAgenda(buyer));

            card.append(top, meta, button);
            buyersCardsGrid.appendChild(card);
        });
    }

    function openBuyerAgenda(buyer) {
        if (!buyer?.id) {
            showAdminMessage("Não foi possível identificar o comprador selecionado.");
            return;
        }
        const url = new URL("./paginas/agenda-compras/agenda.html", window.location.href);
        url.searchParams.set("comprador", buyer.id);
        window.location.assign(url.href);
    }

    function updateAccessFields() {
        if (!accessProfileSelect) return;
        const isAdm = accessProfileSelect.value === "adm";
        if (accessCargoGroup) accessCargoGroup.hidden = isAdm;
        if (isAdm && accessCargoInput) accessCargoInput.value = "";
    }

    async function submitAccess(event) {
        event.preventDefault();
        hideInlineMessage(accessFormMessage);
        const nome = accessNameInput?.value?.trim() || "";
        const email = accessEmailInput?.value?.trim().toLowerCase() || "";
        const perfil = accessProfileSelect?.value || "";
        const cargo = perfil === "comprador" ? accessCargoInput?.value?.trim() || "" : "";

        if (nome.length < 2) {
            showInlineMessage(accessFormMessage, "Informe o nome completo do usuário.", "error");
            accessNameInput?.focus();
            return;
        }
        if (!email) {
            showInlineMessage(accessFormMessage, "Informe o e-mail de acesso.", "error");
            accessEmailInput?.focus();
            return;
        }
        if (!['comprador', 'adm'].includes(perfil)) {
            showInlineMessage(accessFormMessage, "Selecione Comprador ou Administrador.", "error");
            return;
        }
        if (!window.AdmAccess || !admContext?.allowed) {
            showInlineMessage(accessFormMessage, "A validação do acesso administrativo ainda não foi concluída.", "error");
            return;
        }

        if (createAccessButton) {
            createAccessButton.disabled = true;
            createAccessButton.textContent = "Enviando convite...";
        }
        try {
            const { data, error } = await supabaseClient.functions.invoke("criar-acesso", {
                body: { nome, email, perfil, cargo }
            });
            if (error) {
                let serverMessage = "";
                if (error.context && typeof error.context.clone === "function") {
                    try {
                        const body = await error.context.clone().json();
                        serverMessage = body.error || body.message || "";
                    } catch { /* mantém mensagem controlada */ }
                }
                throw new Error(serverMessage || "Não foi possível enviar o convite. Confira os logs da função no Supabase.");
            }
            if (!data || data.success !== true) throw new Error(data?.error || "O servidor não confirmou a criação do acesso.");

            accessForm.reset();
            updateAccessFields();
            showInlineMessage(accessFormMessage, `Convite enviado para ${email}. O usuário deverá acessar o e-mail e definir a própria senha.`, "success");
            if (perfil === "comprador" && buyersCardsGrid) await loadBuyers();
        } catch (error) {
            console.error("Erro ao criar acesso:", error);
            showInlineMessage(accessFormMessage, error?.message || "Ocorreu um erro ao criar o acesso.", "error");
        } finally {
            if (createAccessButton) {
                createAccessButton.disabled = false;
                createAccessButton.textContent = "Enviar convite";
            }
        }
    }

    if (buyerSearch) buyerSearch.addEventListener("input", renderBuyers);
    if (accessProfileSelect) {
        accessProfileSelect.addEventListener("change", updateAccessFields);
        updateAccessFields();
    }
    if (accessForm) accessForm.addEventListener("submit", submitAccess);
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Saindo...";
            try {
                const { error } = await supabaseClient.auth.signOut();
                if (error) throw error;
                window.location.replace("./login.html");
            } catch (error) {
                console.error("Erro ao sair:", error);
                showAdminMessage("Não foi possível encerrar a sessão. Tente novamente.");
                logoutButton.disabled = false;
                logoutButton.textContent = "Sair";
            }
        });
    }

    const ready = initializeAdmin();
    window.AdmAccess = { ready, get context() { return admContext; } };
})();
