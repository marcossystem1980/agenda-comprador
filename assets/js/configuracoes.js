/* =========================================================
   CONFIGURACOES | AGENDA COMPRADOR
   Versao conectada ao Supabase
   ========================================================= */

(() => {
    "use strict";

    const PHOTO_BUCKET = "fotos-compradores";
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    const ALLOWED_PHOTO_TYPES = new Set([
        "image/jpeg",
        "image/png",
        "image/webp"
    ]);

    const saveSettings = document.getElementById("saveSettings");
    const photoButton = document.getElementById("photoButton");
    const photoInput = document.getElementById("photoInput");
    const profileAvatar = document.getElementById("profileAvatar");
    const buyerName = document.getElementById("buyerName");
    const buyerProfile = document.getElementById("buyerProfile");

    let accessContext = null;
    let currentBuyer = null;
    let groupCatalog = [];
    let classificationCatalog = [];
    let groupsByCode = new Map();
    let classificationsByCode = new Map();
    let savedPhotoPath = null;
    let currentPhotoDisplayUrl = null;
    let pendingPhotoFile = null;
    let pendingPhotoPreviewUrl = null;

    function normalizeCode(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();
    }

    function getInitial(name) {
        return String(name || "Comprador").trim().charAt(0).toUpperCase() || "C";
    }

    function setAvatarImage(url, name) {
        const initial = getInitial(name);
        const avatars = [
            profileAvatar,
            document.querySelector(".user-avatar")
        ].filter(Boolean);

        avatars.forEach(avatar => {
            if (url) {
                avatar.style.backgroundImage = `url("${url}")`;
                avatar.style.backgroundPosition = "center";
                avatar.style.backgroundRepeat = "no-repeat";
                avatar.style.backgroundSize = "cover";
                avatar.textContent = "";
            } else {
                avatar.style.backgroundImage = "";
                avatar.textContent = initial;
            }
        });
    }

    async function resolvePhotoUrl(photoPath) {
        if (!photoPath) return null;

        // Compatibilidade de leitura caso exista alguma URL antiga no cadastro.
        if (/^https?:\/\//i.test(photoPath)) {
            return photoPath;
        }

        const { data, error } = await supabaseClient
            .storage
            .from(PHOTO_BUCKET)
            .createSignedUrl(photoPath, 60 * 60);

        if (error) {
            console.warn("Nao foi possivel carregar a foto do comprador:", error);
            return null;
        }

        return data?.signedUrl || null;
    }

    function showError(message, error) {
        console.error(message, error || "");
        const detail = error?.message ? `\n\nDetalhe: ${error.message}` : "";
        alert(`${message}${detail}`);
    }

    function applyCatalogToCheckboxes(selector, catalogByCode, selectedIds, readOnly) {
        document.querySelectorAll(selector).forEach(input => {
            const catalogItem = catalogByCode.get(normalizeCode(input.value));
            const card = input.closest(".selection-card");

            input.dataset.catalogAvailable = catalogItem ? "true" : "false";

            if (!catalogItem) {
                input.checked = false;
                input.disabled = true;
                if (card) card.hidden = true;
                return;
            }

            if (card) card.hidden = false;
            input.checked = selectedIds.has(catalogItem.id);
            input.disabled = Boolean(readOnly);
        });
    }

    function collectSelectedIds(selector, catalogByCode) {
        const ids = new Set();

        document.querySelectorAll(`${selector}:checked`).forEach(input => {
            const row = catalogByCode.get(normalizeCode(input.value));
            if (row?.id) ids.add(row.id);
        });

        return [...ids];
    }

    function applyIdentity(name, roleLabel = "Comprador") {
        const headerName = document.querySelector(".user-info strong");
        const headerRole = document.querySelector(".user-info span");

        if (headerName) headerName.textContent = name || "Comprador";
        if (headerRole) headerRole.textContent = roleLabel;
        if (buyerProfile) buyerProfile.value = "Comprador";
    }

    async function uploadPendingPhoto(compradorId) {
        if (!pendingPhotoFile) return savedPhotoPath;

        const extensionByType = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };
        const extension = extensionByType[pendingPhotoFile.type];
        const token = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const path = `${compradorId}/${token}.${extension}`;

        const { error } = await supabaseClient
            .storage
            .from(PHOTO_BUCKET)
            .upload(path, pendingPhotoFile, {
                cacheControl: "3600",
                contentType: pendingPhotoFile.type,
                upsert: false
            });

        if (error) throw error;
        return path;
    }

    async function initialize() {
        const access = await window.AgendaAccess?.ready;

        if (!access?.allowed) return;

        if (typeof supabaseClient === "undefined") {
            showError("A conexao com o Supabase nao foi inicializada.");
            return;
        }

        accessContext = access;

        const buyerId = access.compradorId;
        if (!buyerId) {
            showError("Nao foi possivel identificar o comprador desta agenda.");
            return;
        }

        try {
            const [buyerResult, groupsResult, classificationsResult, linksResult] =
                await Promise.all([
                    supabaseClient
                        .from("compradores")
                        .select("id, nome, email, foto_url, ativo")
                        .eq("id", buyerId)
                        .maybeSingle(),
                    supabaseClient
                        .from("grupos")
                        .select("id, codigo, nome, ativo")
                        .eq("ativo", true)
                        .order("codigo"),
                    supabaseClient
                        .from("classificacoes")
                        .select("id, codigo, nome, ativo")
                        .eq("ativo", true)
                        .order("codigo"),
                    supabaseClient
                        .from("comprador_grupo_classificacoes")
                        .select("id, grupo_id, classificacao_id, ativo")
                        .eq("comprador_id", buyerId)
                ]);

            const results = [
                ["compradores", buyerResult],
                ["grupos", groupsResult],
                ["classificacoes", classificationsResult],
                ["responsabilidades", linksResult]
            ];

            for (const [label, result] of results) {
                if (result.error) {
                    throw new Error(`${label}: ${result.error.message}`);
                }
            }

            currentBuyer = buyerResult.data;
            if (!currentBuyer || currentBuyer.ativo !== true) {
                throw new Error("O cadastro do comprador nao existe ou esta inativo.");
            }

            groupCatalog = groupsResult.data || [];
            classificationCatalog = classificationsResult.data || [];
            groupsByCode = new Map(
                groupCatalog.map(item => [normalizeCode(item.codigo), item])
            );
            classificationsByCode = new Map(
                classificationCatalog.map(item => [normalizeCode(item.codigo), item])
            );

            const activeLinks = (linksResult.data || []).filter(item => item.ativo === true);
            const selectedGroupIds = new Set(activeLinks.map(item => item.grupo_id));
            const selectedClassificationIds = new Set(
                activeLinks.map(item => item.classificacao_id)
            );

            if (buyerName) {
                buyerName.value = currentBuyer.nome || "";
                buyerName.readOnly = Boolean(access.readOnly);
            }

            applyIdentity(currentBuyer.nome || access.compradorNome || "Comprador");

            applyCatalogToCheckboxes(
                'input[name="groups"]',
                groupsByCode,
                selectedGroupIds,
                access.readOnly
            );
            applyCatalogToCheckboxes(
                'input[name="classifications"]',
                classificationsByCode,
                selectedClassificationIds,
                access.readOnly
            );

            savedPhotoPath = currentBuyer.foto_url || null;
            currentPhotoDisplayUrl = await resolvePhotoUrl(savedPhotoPath);
            setAvatarImage(currentPhotoDisplayUrl, currentBuyer.nome);

            if (access.readOnly) {
                if (photoButton) photoButton.hidden = true;
                if (photoInput) photoInput.disabled = true;
                if (saveSettings) saveSettings.hidden = true;
            }

            bindEvents();
        } catch (error) {
            showError(
                "Nao foi possivel carregar as configuracoes do comprador no Supabase.",
                error
            );
        }
    }

    function bindEvents() {
        if (photoButton && photoInput) {
            photoButton.addEventListener("click", async () => {
                const access = await window.AgendaAccess?.ready;
                if (!access?.allowed || access.readOnly) return;
                photoInput.click();
            });

            photoInput.addEventListener("change", () => {
                const file = photoInput.files?.[0];
                if (!file) return;

                if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
                    photoInput.value = "";
                    alert("Selecione uma imagem JPG, PNG ou WEBP.");
                    return;
                }

                if (file.size > MAX_PHOTO_BYTES) {
                    photoInput.value = "";
                    alert("A foto deve ter no maximo 5 MB.");
                    return;
                }

                if (pendingPhotoPreviewUrl) {
                    URL.revokeObjectURL(pendingPhotoPreviewUrl);
                }

                pendingPhotoFile = file;
                pendingPhotoPreviewUrl = URL.createObjectURL(file);
                setAvatarImage(pendingPhotoPreviewUrl, buyerName?.value || currentBuyer?.nome);
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener("click", async () => {
                const access = await window.AgendaAccess?.ready;

                if (!access?.allowed) return;
                if (access.readOnly) {
                    alert("O ADM pode consultar esta pagina, mas nao salvar alteracoes.");
                    return;
                }

                const name = buyerName?.value.trim() || "";
                const groupIds = collectSelectedIds('input[name="groups"]', groupsByCode);
                const classificationIds = collectSelectedIds(
                    'input[name="classifications"]',
                    classificationsByCode
                );

                if (!name) {
                    alert("Informe o nome do comprador.");
                    buyerName?.focus();
                    return;
                }
                if (groupIds.length === 0) {
                    alert("Selecione pelo menos um grupo.");
                    return;
                }
                if (classificationIds.length === 0) {
                    alert("Selecione pelo menos uma classificacao.");
                    return;
                }

                const originalLabel = saveSettings.textContent;
                saveSettings.disabled = true;
                saveSettings.textContent = "Salvando...";

                let uploadedPath = null;
                const oldPhotoPath = savedPhotoPath;

                try {
                    const photoPath = await uploadPendingPhoto(access.compradorId);
                    if (pendingPhotoFile) uploadedPath = photoPath;

                    const { error: saveError } = await supabaseClient.rpc(
                        "salvar_configuracoes_comprador",
                        {
                            p_nome: name,
                            p_foto_url: photoPath,
                            p_grupos: groupIds,
                            p_classificacoes: classificationIds
                        }
                    );

                    if (saveError) {
                        if (uploadedPath) {
                            const { error: cleanupError } = await supabaseClient
                                .storage
                                .from(PHOTO_BUCKET)
                                .remove([uploadedPath]);
                            if (cleanupError) {
                                console.warn("Nao foi possivel remover o arquivo temporario:", cleanupError);
                            }
                        }
                        throw saveError;
                    }

                    savedPhotoPath = photoPath || null;
                    currentBuyer.nome = name;
                    currentBuyer.foto_url = savedPhotoPath;
                    applyIdentity(name);

                    if (pendingPhotoPreviewUrl) {
                        URL.revokeObjectURL(pendingPhotoPreviewUrl);
                        pendingPhotoPreviewUrl = null;
                    }
                    pendingPhotoFile = null;
                    if (photoInput) photoInput.value = "";

                    currentPhotoDisplayUrl = await resolvePhotoUrl(savedPhotoPath);
                    setAvatarImage(currentPhotoDisplayUrl, name);

                    // Remover a foto anterior somente depois que a nova configuracao foi salva.
                    if (
                        oldPhotoPath &&
                        oldPhotoPath !== savedPhotoPath &&
                        oldPhotoPath.startsWith(`${access.compradorId}/`)
                    ) {
                        const { error: removeError } = await supabaseClient
                            .storage
                            .from(PHOTO_BUCKET)
                            .remove([oldPhotoPath]);
                        if (removeError) {
                            console.warn("A configuracao foi salva, mas a foto antiga nao foi removida:", removeError);
                        }
                    }

                    alert("Configuracoes salvas com sucesso no banco de dados.");
                } catch (error) {
                    showError("Nao foi possivel salvar as configuracoes.", error);
                } finally {
                    saveSettings.disabled = false;
                    saveSettings.textContent = originalLabel || "Salvar configuracoes";
                }
            });
        }
    }

    initialize();
})();
