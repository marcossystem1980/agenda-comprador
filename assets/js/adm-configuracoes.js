/* =========================================================
   PERFIL DO ADMINISTRADOR — Agenda Comprador
   Depende de assets/js/adm.js e da migração SQL 05.
========================================================= */
(() => {
    "use strict";
    const form = document.getElementById("adminProfileForm");
    const nameInput = document.getElementById("adminProfileName");
    const emailInput = document.getElementById("adminProfileEmail");
    const roleInput = document.getElementById("adminProfileRole");
    const photoInput = document.getElementById("adminPhotoInput");
    const preview = document.getElementById("adminProfilePreview");
    const message = document.getElementById("adminProfileMessage");
    const saveButton = document.getElementById("saveAdminProfileButton");
    const photoLabel = document.querySelector(".adm-upload-label");

    let context = null;
    let savedPhotoPath = null;
    let selectedPhoto = null;
    let previewObjectUrl = null;

    function setMessage(text, type = "info") {
        if (!message) return;
        message.textContent = text;
        message.hidden = false;
        message.dataset.state = type;
    }
    function hideMessage() {
        if (!message) return;
        message.textContent = "";
        message.hidden = true;
        delete message.dataset.state;
    }
    function setPreviewInitials(name) {
        if (!preview) return;
        const parts = String(name || "Administrador").trim().split(/\s+/).filter(Boolean);
        preview.style.backgroundImage = "";
        preview.textContent = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.[0] || "A").toUpperCase().slice(0, 2);
    }
    async function applyStoredPhoto(path) {
        setPreviewInitials(nameInput?.value || context?.profile?.nome || "Administrador");
        if (!path || !preview) return;
        try {
            let url = path;
            if (!/^https?:\/\//i.test(path)) {
                const { data, error } = await supabaseClient.storage.from("fotos-administradores").createSignedUrl(path, 3600);
                if (error) throw error;
                url = data?.signedUrl;
            }
            if (url) {
                preview.style.backgroundImage = `url("${url}")`;
                preview.style.backgroundPosition = "center";
                preview.style.backgroundSize = "cover";
                preview.style.backgroundRepeat = "no-repeat";
                preview.textContent = "";
            }
        } catch (error) {
            console.error("Erro ao carregar a foto do perfil ADM:", error);
            setMessage("Não foi possível carregar a foto atual. Você pode selecionar uma nova imagem.", "error");
        }
    }

    async function initializeForm() {
        context = await window.AdmAccess?.ready;
        if (!context?.allowed) {
            setMessage("Não foi possível validar o perfil administrativo.", "error");
            return;
        }
        const profile = context.profile || {};
        savedPhotoPath = profile.foto_url || null;
        if (nameInput) nameInput.value = profile.nome || "";
        if (emailInput) emailInput.value = context.user?.email || "";
        if (roleInput) roleInput.value = "Administrador";
        await applyStoredPhoto(savedPhotoPath);
        if (photoLabel && photoInput) {
            photoLabel.addEventListener("click", event => {
                event.preventDefault();
                photoInput.click();
            });
        }
    }

    if (photoInput) {
        photoInput.addEventListener("change", () => {
            hideMessage();
            const file = photoInput.files?.[0];
            if (!file) return;
            const allowed = ["image/jpeg", "image/png", "image/webp"];
            if (!allowed.includes(file.type)) {
                photoInput.value = "";
                selectedPhoto = null;
                setMessage("Selecione uma imagem JPG, PNG ou WEBP.", "error");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                photoInput.value = "";
                selectedPhoto = null;
                setMessage("A imagem ultrapassa o limite de 5 MB.", "error");
                return;
            }
            selectedPhoto = file;
            if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = URL.createObjectURL(file);
            if (preview) {
                preview.style.backgroundImage = `url("${previewObjectUrl}")`;
                preview.style.backgroundPosition = "center";
                preview.style.backgroundSize = "cover";
                preview.style.backgroundRepeat = "no-repeat";
                preview.textContent = "";
            }
        });
    }

    if (nameInput) nameInput.addEventListener("input", () => {
        if (!selectedPhoto && !savedPhotoPath) setPreviewInitials(nameInput.value);
    });

    if (form) {
        form.addEventListener("submit", async event => {
            event.preventDefault();
            hideMessage();
            const ctx = await window.AdmAccess?.ready;
            if (!ctx?.allowed || !ctx.user?.id) {
                setMessage("Sessão administrativa inválida. Entre novamente.", "error");
                return;
            }
            const nome = nameInput?.value?.trim() || "";
            if (nome.length < 2) {
                setMessage("Informe um nome de pelo menos 2 caracteres.", "error");
                nameInput?.focus();
                return;
            }
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = "Salvando perfil...";
            }
            let uploadedPath = null;
            try {
                let photoPath = savedPhotoPath;
                if (selectedPhoto) {
                    const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
                    const extension = extensionByType[selectedPhoto.type];
                    const filename = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    uploadedPath = `${ctx.user.id}/${filename}.${extension}`;
                    const { error: uploadError } = await supabaseClient.storage
                        .from("fotos-administradores")
                        .upload(uploadedPath, selectedPhoto, { upsert: false, contentType: selectedPhoto.type, cacheControl: "3600" });
                    if (uploadError) throw uploadError;
                    photoPath = uploadedPath;
                }

                const { data, error } = await supabaseClient.rpc("atualizar_perfil_adm", {
                    p_nome: nome,
                    p_foto_url: photoPath
                });
                if (error) throw error;
                if (data?.success !== true) throw new Error(data?.message || "O Supabase não confirmou a atualização do perfil.");

                savedPhotoPath = photoPath;
                selectedPhoto = null;
                if (photoInput) photoInput.value = "";
                setMessage("Perfil atualizado com sucesso.", "success");
                // Recarregar o cabeçalho compartilhado com os dados atualizados.
                setTimeout(() => window.location.replace("adm-configuracoes.html?saved=1"), 700);
            } catch (error) {
                console.error("Erro ao salvar perfil ADM:", error);
                if (uploadedPath) {
                    try { await supabaseClient.storage.from("fotos-administradores").remove([uploadedPath]); }
                    catch (cleanupError) { console.warn("Não foi possível limpar um upload não associado:", cleanupError); }
                }
                setMessage(`Não foi possível salvar o perfil. ${error?.message || "Confira as permissões do Supabase."}`, "error");
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = "Salvar perfil";
                }
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("saved") === "1") setMessage("Perfil atualizado com sucesso.", "success");
    });

    initializeForm().catch(error => {
        console.error("Erro ao carregar configurações do administrador:", error);
        setMessage(`Não foi possível carregar o perfil. ${error?.message || ""}`, "error");
    });
})();
