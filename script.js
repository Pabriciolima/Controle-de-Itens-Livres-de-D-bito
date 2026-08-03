(() => {
  "use strict";

  const config = window.FIREBASE_CONFIG || {};
  const configured = Boolean(
    config.apiKey && config.authDomain && config.projectId && window.firebase
  );

  let auth = null;
  let db = null;

  if (configured) {
    if (!firebase.apps.length) firebase.initializeApp(config);
    auth = firebase.auth();
    db = firebase.firestore();
    db.settings({ ignoreUndefinedProperties: true });
  }

  const FILIAIS = [
    { codigo: "4700",  cnpj: "05024583000104", localidade: "BELÉM",         uf: "PA" },
    { codigo: "4731",  cnpj: "05442121000107", localidade: "SÃO LUÍS",      uf: "MA" },
    { codigo: "1960",  cnpj: "05442121000298", localidade: "BACABAL",        uf: "MA" },
    { codigo: "4756",  cnpj: "09597026000133", localidade: "MACAPÁ",         uf: "AP" },
    { codigo: "4730",  cnpj: "05285816000122", localidade: "TERESINA",       uf: "PI" },
    { codigo: "4730F", cnpj: "05285816000394", localidade: "URUÇUÍ",         uf: "PI" },
    { codigo: "1928",  cnpj: "07811058000326", localidade: "SINOP",           uf: "MT" },
    { codigo: "4738",  cnpj: "07811058000164", localidade: "CUIABÁ",          uf: "MT" },
    { codigo: "4774",  cnpj: "07811058000245", localidade: "RONDONÓPOLIS",    uf: "MT" },
    { codigo: "4977",  cnpj: "84652296000115", localidade: "PORTO VELHO",     uf: "RO" },
    { codigo: "4977F", cnpj: "84652296000620", localidade: "JI-PARANÁ",       uf: "RO" },
    { codigo: "1970",  cnpj: "84652296000204", localidade: "VILHENA",         uf: "RO" }
  ];

  /*
   * Contas que já existem no Firebase Authentication.
   * O administrador pode executar a sincronização automática para criar/corrigir
   * os documentos correspondentes na coleção users e todas as filiais em branches.
   */
  const FIREBASE_USERS_SEED = [
    { uid: "ysasHWJjtbRCLvV64veCiWUmw9g2", email: "pabriciolima@grupomonaco.com.br", name: "Pabricio Lima", role: "admin", branchCode: "", branchName: "" },
    { uid: "ipHEeiJyFqYNHjIAN9xYZ06IZJu1", email: "abel@grupomonaco.com.br", name: "Abel Junior", role: "admin", branchCode: "", branchName: "" },

    { uid: "cIPaV0cCgfVscNJdOX7i0LFHVS82", email: "4700@acesso.grupomonaco.com.br", name: "Operador Belém", role: "operador", branchCode: "4700", branchName: "BELÉM" },
    { uid: "FKF6zd1uHLcTilocSLLDUpB3Pjg1", email: "4731@acesso.grupomonaco.com.br", name: "Operador São Luís", role: "operador", branchCode: "4731", branchName: "SÃO LUÍS" },
    { uid: "Rg2urCHcbYPwnt0EYmszJ5WkAwD3", email: "1960@acesso.grupomonaco.com.br", name: "Operador Bacabal", role: "operador", branchCode: "1960", branchName: "BACABAL" },
    { uid: "lfGffKiqvbccVzabiB15CjeJ9c92", email: "4756@acesso.grupomonaco.com.br", name: "Operador Macapá", role: "operador", branchCode: "4756", branchName: "MACAPÁ" },
    { uid: "QGFyOnomVaaTmAVcEvU7Zotxzny1", email: "4730@acesso.grupomonaco.com.br", name: "Operador Teresina", role: "operador", branchCode: "4730", branchName: "TERESINA" },
    { uid: "JZF5S89j8xRpgKIldHi07byp9oG2", email: "4730f@acesso.grupomonaco.com.br", name: "Operador Uruçuí", role: "operador", branchCode: "4730F", branchName: "URUÇUÍ" },
    { uid: "pxgxz4IWaEX4oxl8ooyhwvUG45x2", email: "1928@acesso.grupomonaco.com.br", name: "Operador Sinop", role: "operador", branchCode: "1928", branchName: "SINOP" },
    { uid: "Q1LYSXjOJBNoGpY4wc7Gm8m1Y643", email: "4738@acesso.grupomonaco.com.br", name: "Operador Cuiabá", role: "operador", branchCode: "4738", branchName: "CUIABÁ" },
    { uid: "UH68ZaHHIlPISy58c7ulJ9tZrVS2", email: "4774@acesso.grupomonaco.com.br", name: "Operador Rondonópolis", role: "operador", branchCode: "4774", branchName: "RONDONÓPOLIS" },
    { uid: "BQyz8DmvowSCAdnfSps61JmXqW", email: "4977@acesso.grupomonaco.com.br", name: "Operador Porto Velho", role: "operador", branchCode: "4977", branchName: "PORTO VELHO" },
    { uid: "Mi2fXm5V54bxYEuB78g9qpfYqDS2", email: "4977f@acesso.grupomonaco.com.br", name: "Operador Ji-Paraná", role: "operador", branchCode: "4977F", branchName: "JI-PARANÁ" },
    { uid: "Xs1UympDM5PKJoDBJggyitPy3kn2", email: "1970@acesso.grupomonaco.com.br", name: "Operador Vilhena", role: "operador", branchCode: "1970", branchName: "VILHENA" }
  ];

  const state = {
    session: null,
    profile: null,
    items: [],
    movements: [],
    attachments: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = value => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";
  const fmtDateTime = value => value ? new Intl.DateTimeFormat("pt-BR", {dateStyle:"short",timeStyle:"short"}).format(new Date(value)) : "—";
  const fmtMoney = value => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value || 0));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();


  const firestoreNow = () => firebase.firestore.FieldValue.serverTimestamp();
  const toIso = value => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value?.toDate) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return String(value);
  };
  const branchByName = name => FILIAIS.find(f => normalize(f.localidade) === normalize(name));
  const branchByCode = code => FILIAIS.find(f => String(f.codigo).toUpperCase() === String(code || "").toUpperCase());
  const normalizeItemCode = value => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const makeItemId = (branchCode, code) => `${String(branchCode || "").toUpperCase()}_${normalizeItemCode(code)}`;
  const dataUrlSize = dataUrl => {
    const base64 = String(dataUrl || "").split(",")[1] || "";
    return Math.max(0, Math.floor(base64.length * 0.75));
  };
  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Não foi possível ler o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
  const snapshotRows = snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const sortNewest = (a, b) => {
    const dateCompare = String(b.data_movimento || "").localeCompare(String(a.data_movimento || ""));
    return dateCompare || String(b.created_at || "").localeCompare(String(a.created_at || ""));
  };

  function toast(message, type = "success", title = type === "success" ? "Tudo certo" : "Atenção") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span>`;
    $("#toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function setLoading(button, loading, text = "Processando...") {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.textContent = text;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  async function boot() {
    try {
      bindUI();
      setDefaultDates();
    } catch (error) {
      console.error("Erro ao inicializar a interface:", error);
      const message = $("#authMessage");
      if (message) message.textContent = "Falha ao carregar a interface. Atualize a página com Ctrl + F5.";
      return;
    }

    if (!configured) {
      $("#authMessage").textContent = "Firebase não configurado. Confira o arquivo firebase-config.js.";
      return;
    }

    auth.onAuthStateChanged(async user => {
      if (user && !state.session) await enterApp(user);
      if (!user && state.session) leaveApp();
    });
  }

  function bindUI() {
    $("#loginForm").addEventListener("submit", login);
    $("#logoutButton").addEventListener("click", () => auth?.signOut());
    $("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

    $$(".nav-item").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
    $$("[data-go-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.goView)));
    $$("[data-open-modal]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.openModal)));
    $$("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModals));

    $("#itemForm").addEventListener("submit", saveItem);
    $("#entryForm").addEventListener("submit", saveEntry);
    $("#exitForm").addEventListener("submit", saveExit);
    $("#exitItemSelect").addEventListener("change", updateExitBalance);
    $("#itemFilialSelect").addEventListener("change", updateItemCnpj);
    $("#entryItemMode").addEventListener("change", updateEntryMode);
    $("#entryFilialSelect").addEventListener("change", () => { updateEntryCnpj(); suggestExistingEntryItem(); });
    $("#entryCnpjEmitente").addEventListener("input", formatCnpjEmitente);
    $("#entryCnpjInput").addEventListener("input", formatCnpjEmitente);

    ["itemSearch","itemBranchFilter","itemStatusFilter"].forEach(id => $(`#${id}`).addEventListener("input", renderItems));
    ["entrySearch","entryStartDate","entryEndDate"].forEach(id => $(`#${id}`).addEventListener("input", renderEntries));
    ["exitSearch","exitStartDate","exitEndDate"].forEach(id => $(`#${id}`).addEventListener("input", renderExits));
    ["historySearch","historyTypeFilter"].forEach(id => $(`#${id}`).addEventListener("input", renderHistory));
    ["documentSearch","documentTypeFilter"].forEach(id => $(`#${id}`).addEventListener("input", renderDocuments));

    $("#exportItemsButton").addEventListener("click", () => exportCSV("estoque-atual.csv", filteredItems().map(i => ({
      codigo:i.codigo,descricao:i.descricao,filial:i.filial,dn:i.dn,localizacao:i.localizacao,
      saldo:i.saldo,estoque_minimo:i.estoque_minimo,status:itemStatus(i),valor_unitario:i.valor_unitario
    }))));
    $("#exportEntriesButton").addEventListener("click", () => exportCSV("entradas.csv", filteredMovements("entrada")));
    $("#exportExitsButton").addEventListener("click", () => exportCSV("saidas.csv", filteredMovements("saida")));
    $("#exportHistoryButton").addEventListener("click", () => exportCSV("historico.csv", state.movements));
    $("#exportArchiveButton").addEventListener("click", exportAuditExcelPremium);
    $("#printAuditButton").addEventListener("click", printAuditReport);
    $("#clearSignatureButton")?.addEventListener("click", clearDigitalSignature);
    window.addEventListener("resize", () => {
      if ($("#exitModal")?.classList.contains("open")) resizeSignatureCanvas();
    });
    configureMobileViewport();
  }

  function setDefaultDates() {
    $$('input[name="data_movimento"]').forEach(input => input.value = today());
  }

  async function login(event) {
    event.preventDefault();

    const message = $("#authMessage");
    const button = $("#loginButton");

    if (!auth) {
      if (message) message.textContent = "Firebase não configurado. Confira firebase-config.js.";
      return;
    }

    const loginInformado = $("#loginEmail")?.value.trim() || "";
    const senhaInformada = $("#loginPassword")?.value || "";

    if (!loginInformado || !senhaInformada) {
      if (message) message.textContent = "Informe o login e a senha.";
      return;
    }

    const codigoFilial = /^[0-9]{4}F?$/i.test(loginInformado);
    const email = codigoFilial
      ? `${loginInformado.toLowerCase()}@acesso.grupomonaco.com.br`
      : loginInformado.toLowerCase();

    setLoading(button, true, "Entrando...");
    if (message) message.textContent = "";

    try {
      const credential = await auth.signInWithEmailAndPassword(email, senhaInformada);
      if (!credential?.user) throw new Error("A autenticação não retornou um usuário válido.");
      await enterApp(credential.user);
    } catch (error) {
      console.error("Falha no login:", error);
      if (message) message.textContent = translateError(error?.code || error?.message || "Falha ao entrar no sistema.");
    } finally {
      setLoading(button, false);
    }
  }

  async function enterApp(user) {
    if (state.session?.user?.uid === user.uid && state.profile) return;

    const profileDoc = await db.collection("users").doc(user.uid).get();
    if (!profileDoc.exists) {
      $("#authMessage").textContent = "Seu usuário existe no Authentication, mas o perfil não foi encontrado na coleção users.";
      await auth.signOut();
      return;
    }

    const raw = profileDoc.data();
    if (raw.active === false) {
      $("#authMessage").textContent = "Este usuário está inativo.";
      await auth.signOut();
      return;
    }

    state.session = { user };
    state.profile = {
      id: user.uid,
      nome: raw.name || raw.nome || user.email,
      email: raw.email || user.email,
      role: String(raw.role || "").trim().toLowerCase(),
      filial: raw.branchName || raw.filial || "",
      filial_slug: normalize(raw.branchName || raw.filial || "diretoria").replace(/\s+/g, "-"),
      codigo_login: raw.branchCode || raw.codigo_login || "",
      branchCode: raw.branchCode || raw.codigo_login || "",
      branchName: raw.branchName || raw.filial || "",
      ativo: raw.active !== false
    };

    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#userName").textContent = state.profile.nome;
    $("#userRole").textContent = roleName(state.profile.role);
    $("#userInitials").textContent = initials(state.profile.nome);

    applyRolePermissions();

    if (state.profile.role === "admin") {
      await synchronizeFirebaseStructure();
    }

    configureBranchFields();
    configureEntryBranchFields();
    updateEntryMode();
    await loadAll();
  }


  async function synchronizeFirebaseStructure(showSuccess = false) {
    if (!db || state.profile?.role !== "admin") return;

    try {
      const batch = db.batch();

      FILIAIS.forEach(branch => {
        const ref = db.collection("branches").doc(branch.codigo);
        batch.set(ref, {
          code: branch.codigo,
          codigo: branch.codigo,
          name: branch.localidade,
          localidade: branch.localidade,
          cnpj: branch.cnpj,
          uf: branch.uf,
          active: true,
          ativa: true,
          updatedAt: firestoreNow()
        }, { merge: true });
      });

      FIREBASE_USERS_SEED.forEach(user => {
        const ref = db.collection("users").doc(user.uid);
        batch.set(ref, {
          name: user.name,
          nome: user.name,
          email: user.email,
          role: user.role,
          branchCode: user.branchCode,
          branchName: user.branchName,
          active: true,
          ativo: true,
          updatedAt: firestoreNow()
        }, { merge: true });
      });

      await batch.commit();

      if (showSuccess) {
        toast("Todas as filiais e perfis de acesso foram sincronizados.");
      }
    } catch (error) {
      console.error("Falha ao sincronizar a estrutura do Firebase:", error);
      toast(
        translateError(error.code || error.message),
        "error",
        "Cadastros não sincronizados"
      );
    }
  }

  function leaveApp() {
    state.session = null; state.profile = null; state.items = []; state.movements = []; state.attachments = [];
    $("#appShell").classList.add("hidden");
    $("#authScreen").classList.remove("hidden");
    $("#loginForm").reset();
  }

  function applyRolePermissions() {
    const canOperate = ["admin","operador"].includes(state.profile.role);

    $$('[data-open-modal="entryModal"],[data-open-modal="exitModal"]').forEach(el => {
      el.style.display = canOperate ? "" : "none";
    });
  }


  function isGlobalAccess() {
    return ["admin","diretor"].includes(state.profile?.role);
  }

  function configureBranchFields(selectedBranch = state.profile?.filial || "") {
    const select = $("#itemFilialSelect");
    const allowed = isGlobalAccess() ? FILIAIS : FILIAIS.filter(f => f.localidade === state.profile?.filial);

    select.innerHTML = `<option value="">Selecione a filial</option>${allowed.map(f =>
      `<option value="${esc(f.localidade)}">${esc(f.codigo)} • ${esc(f.localidade)} / ${esc(f.uf)}</option>`
    ).join("")}`;

    if (selectedBranch) {
      const exists = [...select.options].some(option => option.value === selectedBranch);
      if (!exists) {
        const filial = FILIAIS.find(f => f.localidade === selectedBranch);
        select.insertAdjacentHTML("beforeend",
          `<option value="${esc(selectedBranch)}">${esc(filial?.codigo || "")} • ${esc(selectedBranch)} / ${esc(filial?.uf || "")}</option>`
        );
      }
      select.value = selectedBranch;
    }

    select.disabled = !isGlobalAccess();
    updateItemCnpj();
  }

  function updateItemCnpj() {
    const filial = FILIAIS.find(f => f.localidade === $("#itemFilialSelect").value);
    $("#itemCnpjInput").value = filial?.cnpj || "";
  }


  function configureEntryBranchFields() {
    const select = $("#entryFilialSelect");
    const allowed = isGlobalAccess()
      ? FILIAIS
      : FILIAIS.filter(f => f.localidade === state.profile?.filial);

    select.innerHTML = `<option value="">Selecione a filial</option>${allowed.map(f =>
      `<option value="${esc(f.localidade)}">${esc(f.codigo)} • ${esc(f.localidade)} / ${esc(f.uf)}</option>`
    ).join("")}`;

    if (!isGlobalAccess() && allowed[0]) {
      select.value = allowed[0].localidade;
      select.disabled = true;
    } else {
      select.disabled = false;
    }
    updateEntryCnpj();
  }

  function updateEntryCnpj() {
    const filial = branchByName($("#entryFilialSelect").value);
    const input = $("#entryCnpjInput");
    input.value = filial?.cnpj
      ? formatCnpjValue(filial.cnpj)
      : "";
  }

  function updateEntryMode() {
    const isNew = $("#entryItemMode").value === "novo";
    $("#entryNewItemFields").classList.toggle("hidden", !isNew);
    $("#entryExistingFields").classList.toggle("hidden", isNew);

    $("#entryItemSelect").required = !isNew;
    $("#entryNewCodigo").required = isNew;
    $("#entryNewDescricao").required = isNew;
    $("#entryNewLocalizacao").required = isNew;
    $("#entryFilialSelect").required = isNew;

    const submit = $("#entryForm button[type='submit']");
    submit.textContent = isNew ? "Criar item e confirmar entrada" : "Confirmar entrada";
  }

  async function loadAll() {
    try {
      const ownBranch = state.profile?.branchCode;
      const globalAccess = isGlobalAccess();

      let itemQuery = db.collection("items");
      let movementQuery = db.collection("movements");
      let attachmentQuery = db.collection("attachments");

      if (!globalAccess) {
        itemQuery = itemQuery.where("branchCode", "==", ownBranch);
        movementQuery = movementQuery.where("branchCode", "==", ownBranch);
        attachmentQuery = attachmentQuery.where("branchCode", "==", ownBranch);
      }

      const [itemSnap, movementSnap, attachmentSnap] = await Promise.all([
        itemQuery.get(), movementQuery.get(), attachmentQuery.get()
      ]);

      state.items = snapshotRows(itemSnap).map(item => ({
        ...item,
        codigo: item.codigo || item.code || "",
        descricao: item.descricao || item.description || "",
        filial: item.filial || item.branchName || "",
        filial_codigo: item.filial_codigo || item.branchCode || "",
        dn: item.dn || item.cnpj || "",
        localizacao: item.localizacao || item.location || "",
        estoque_minimo: Number(item.estoque_minimo || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        saldo: Number(item.saldo ?? item.balance ?? 0),
        created_at: toIso(item.created_at || item.createdAt),
        updated_at: toIso(item.updated_at || item.updatedAt)
      })).sort((a,b) => String(a.descricao).localeCompare(String(b.descricao), "pt-BR"));

      const itemMap = new Map(state.items.map(item => [item.id, item]));
      state.movements = snapshotRows(movementSnap).map(movement => ({
        ...movement,
        item_id: movement.item_id || movement.itemId,
        tipo: movement.tipo || movement.type,
        quantidade: Number(movement.quantidade ?? movement.quantity ?? 0),
        data_movimento: movement.data_movimento || movement.movementDate || "",
        created_at: toIso(movement.created_at || movement.createdAt),
        signed_at: toIso(movement.signed_at || movement.signedAt),
        itens: itemMap.get(movement.item_id || movement.itemId) || {
          codigo: movement.item_codigo || movement.itemCode || "",
          descricao: movement.item_descricao || movement.itemDescription || "",
          filial: movement.filial || movement.branchName || "",
          localizacao: movement.localizacao || movement.location || ""
        }
      })).sort(sortNewest);

      const movementMap = new Map(state.movements.map(m => [m.id, m]));
      const physicalAttachments = snapshotRows(attachmentSnap).map(attachment => {
        const movement = movementMap.get(attachment.movimentacao_id || attachment.movementId);
        return {
          ...attachment,
          movimentacao_id: attachment.movimentacao_id || attachment.movementId,
          tipo_movimento: attachment.tipo_movimento || attachment.movementType,
          nome_arquivo: attachment.nome_arquivo || attachment.fileName || "Documento",
          mime_type: attachment.mime_type || attachment.mimeType || "application/octet-stream",
          tamanho_bytes: Number(attachment.tamanho_bytes || attachment.sizeBytes || 0),
          data_url: attachment.data_url || attachment.dataUrl || "",
          created_at: toIso(attachment.created_at || attachment.createdAt),
          movimentacoes: movement ? {
            numero_nota: movement.numero_nota,
            numero_rem: movement.numero_rem,
            numero_os: movement.numero_os,
            item_id: movement.item_id,
            itens: movement.itens
          } : null
        };
      });

      const virtualSignatures = state.movements
        .filter(m => m.tipo === "saida" && m.signature_data && m.signature_locked === true)
        .map(m => ({
          id: `signature:${m.id}`,
          movimentacao_id: m.id,
          tipo_movimento: "saida",
          nome_arquivo: `ROMANEIO_ASSINADO_${romaneioNumber(m)}_DIGITAL.webp`,
          mime_type: "image/webp",
          tamanho_bytes: dataUrlSize(m.signature_data),
          created_at: m.signed_at || m.created_at,
          virtual_signature: true,
          movimentacoes: {
            numero_nota: m.numero_nota,
            numero_rem: m.numero_rem,
            numero_os: m.numero_os,
            item_id: m.item_id,
            itens: m.itens
          }
        }));

      state.attachments = [...virtualSignatures, ...physicalAttachments]
        .sort((a,b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

      fillSelects();
      renderAll();
      $("#lastUpdate").textContent = new Intl.DateTimeFormat("pt-BR", {dateStyle:"short",timeStyle:"short"}).format(new Date());
    } catch (error) {
      console.error(error);
      toast(translateError(error.code || error.message), "error", "Erro ao carregar");
    }
  }

  function renderAll() {
    renderDashboard(); renderItems(); renderEntries(); renderExits(); renderHistory(); renderDocuments(); renderArchive();
  }

  function fillSelects() {
    const options = state.items.filter(i => i.status !== "arquivado").map(i =>
      `<option value="${i.id}">${esc(i.codigo)} — ${esc(i.descricao)} | Saldo: ${i.saldo}</option>`
    ).join("");
    $("#entryItemSelect").innerHTML = `<option value="">Selecione o item</option>${options}`;
    $("#exitItemSelect").innerHTML = `<option value="">Selecione o item</option>${options}`;

    const branches = [...new Set(state.items.map(i => i.filial).filter(Boolean))].sort();
    const current = $("#itemBranchFilter").value;
    $("#itemBranchFilter").innerHTML = `<option value="">Todas as filiais</option>${branches.map(b => `<option>${esc(b)}</option>`).join("")}`;
    $("#itemBranchFilter").value = current;
  }

  function renderDashboard() {
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const monthMoves = state.movements.filter(m => {
      const d = new Date(`${m.data_movimento}T12:00:00`);
      return d.getMonth() === month && d.getFullYear() === year && m.status === "ativo";
    });

    $("#metricItems").textContent = state.items.filter(i => i.status !== "arquivado").length;
    $("#metricBalance").textContent = state.items.reduce((sum,i) => sum + Number(i.saldo || 0),0);
    $("#metricEntries").textContent = monthMoves.filter(m => m.tipo === "entrada").reduce((s,m)=>s+Number(m.quantidade),0);
    $("#metricExits").textContent = monthMoves.filter(m => m.tipo === "saida").reduce((s,m)=>s+Number(m.quantidade),0);
    $("#metricLowStock").textContent = state.items.filter(i => i.status === "disponivel" && Number(i.saldo) <= Number(i.estoque_minimo)).length;
    $("#metricArchive").textContent = state.movements.filter(m => ageMonths(m.data_movimento) >= 21 && ageMonths(m.data_movimento) < 24).length;

    const recent = state.movements.slice(0,6);
    $("#recentMovements").className = recent.length ? "movement-list" : "movement-list empty-state";
    $("#recentMovements").innerHTML = recent.length ? recent.map(m => `
      <div class="movement-row">
        <div class="movement-icon ${m.tipo === "entrada" ? "in" : "out"}">${m.tipo === "entrada" ? "↘" : "↗"}</div>
        <div class="movement-info"><strong>${esc(m.itens?.codigo)} — ${esc(m.itens?.descricao)}</strong><span>${esc(m.itens?.filial)} • ${fmtDate(m.data_movimento)} • ${esc(m.responsavel || m.solicitante || "Usuário")}</span></div>
        <span class="movement-qty">${m.tipo === "entrada" ? "+" : "-"}${m.quantidade}</span>
      </div>`).join("") : "Nenhuma movimentação registrada.";

    const pendings = [];
    state.items.filter(i => Number(i.saldo) <= Number(i.estoque_minimo) && i.status === "disponivel").slice(0,5).forEach(i =>
      pendings.push(`<div class="pending-row"><span class="badge warning">Estoque baixo</span><div class="movement-info"><strong>${esc(i.codigo)} — ${esc(i.descricao)}</strong><span>Saldo ${i.saldo} • mínimo ${i.estoque_minimo}</span></div></div>`)
    );
    state.movements.filter(m => ageMonths(m.data_movimento) >= 21 && ageMonths(m.data_movimento) < 24).slice(0,3).forEach(m =>
      pendings.push(`<div class="pending-row"><span class="badge danger">Prazo</span><div class="movement-info"><strong>${esc(m.itens?.codigo)} — revisar retenção</strong><span>Movimentação de ${fmtDate(m.data_movimento)}</span></div></div>`)
    );
    $("#pendingList").className = pendings.length ? "pending-list" : "pending-list empty-state";
    $("#pendingList").innerHTML = pendings.length ? pendings.join("") : "Nenhuma pendência encontrada.";
  }

  function filteredItems() {
    const q = normalize($("#itemSearch").value);
    const branch = $("#itemBranchFilter").value;
    const status = $("#itemStatusFilter").value;
    return state.items.filter(i => {
      const text = normalize([i.codigo,i.descricao,i.filial,i.dn,i.localizacao].join(" "));
      const s = itemStatusKey(i);
      return (!q || text.includes(q)) && (!branch || i.filial === branch) && (!status || s === status);
    });
  }

  function renderItems() {
    const rows = filteredItems();
    $("#itemsTableBody").innerHTML = rows.length ? rows.map(i => `
      <tr>
        <td><strong>${esc(i.codigo)}</strong></td><td>${esc(i.descricao)}<br><small>${esc(i.categoria)}</small></td>
        <td>${esc(i.filial)}<br><small>${esc(i.dn || "")}</small></td><td>${esc(i.localizacao)}</td>
        <td><strong>${i.saldo}</strong><br><small>Mínimo: ${i.estoque_minimo}</small></td>
        <td>${itemBadge(i)}</td>
        <td>
          <div class="table-actions">
            <button class="mini-btn" onclick="window.app.showItem('${i.id}')">Detalhes</button>
            ${["admin","operador"].includes(state.profile?.role) ? `
              <button class="mini-btn edit" onclick="window.app.editItem('${i.id}')">Editar</button>
              <button class="mini-btn delete" onclick="window.app.deleteItem('${i.id}')">Excluir</button>
            ` : ""}
          </div>
        </td>
      </tr>`).join("") : `<tr><td colspan="7" class="empty-state">Nenhum item encontrado.</td></tr>`;
  }

  function filteredMovements(type) {
    const prefix = type === "entrada" ? "entry" : "exit";
    const q = normalize($(`#${prefix}Search`).value);
    const start = $(`#${prefix}StartDate`).value;
    const end = $(`#${prefix}EndDate`).value;
    return state.movements.filter(m => {
      const text = normalize([
        m.itens?.codigo,m.itens?.descricao,m.itens?.filial,m.numero_nota,m.numero_rem,m.numero_os,m.chassi,
        m.responsavel,m.solicitante,m.cliente
      ].join(" "));
      return m.tipo === type && (!q || text.includes(q)) && (!start || m.data_movimento >= start) && (!end || m.data_movimento <= end);
    });
  }

  function renderEntries() {
    const rows = filteredMovements("entrada");
    $("#entriesTableBody").innerHTML = rows.length ? rows.map(m => `
      <tr><td>${fmtDate(m.data_movimento)}</td><td>${esc(m.numero_nota || m.numero_rem || m.protocolo || "Sem número")}<br><small>${esc(m.origem || "")}</small></td>
      <td><strong>${esc(m.itens?.codigo)}</strong><br>${esc(m.itens?.descricao)}</td><td>${esc(m.itens?.filial)}</td><td><strong>+${m.quantidade}</strong></td>
      <td>${esc(m.responsavel || "—")}</td><td>${attachmentButton(m.id)}</td></tr>`).join("") : `<tr><td colspan="7" class="empty-state">Nenhuma entrada encontrada.</td></tr>`;
  }

  function renderExits() {
    const rows = filteredMovements("saida");
    $("#exitsTableBody").innerHTML = rows.length ? rows.map(m => {
      const signed = signedRomaneioAttachment(m.id);
      const status = signed
        ? `<span class="badge success">Romaneio assinado</span>`
        : `<span class="badge neutral">Registro antigo sem assinatura</span>`;

      return `
        <tr>
          <td data-label="Data">${fmtDate(m.data_movimento)}</td>
          <td data-label="Item"><strong>${esc(m.itens?.codigo)}</strong><br>${esc(m.itens?.descricao)}</td>
          <td data-label="Quantidade"><strong>-${m.quantidade}</strong></td>
          <td data-label="OS / Chassi">${esc(m.numero_os || "Sem OS")}<br><small>${esc(m.chassi || m.placa || "")}</small></td>
          <td data-label="Finalidade">${esc(m.finalidade || "—")}</td>
          <td data-label="Solicitante">${esc(m.solicitante || "—")}</td>
          <td data-label="Romaneio"><div class="romaneio-status">${status}<small>${esc(romaneioNumber(m))}</small></div></td>
          <td data-label="Ações">
            <div class="table-actions romaneio-actions">
              <button class="mini-btn romaneio-print" onclick="window.app.printRomaneio('${m.id}')">Imprimir</button>
              ${signed ? `<button class="mini-btn romaneio-view" onclick="window.app.openDocument('${signed.id}')">Visualizar assinatura</button>` : ""}
            </div>
          </td>
        </tr>`;
    }).join("") : `<tr><td colspan="8" class="empty-state">Nenhuma saída encontrada.</td></tr>`;
  }

  function renderHistory() {
    const q = normalize($("#historySearch").value);
    const type = $("#historyTypeFilter").value;
    const rows = state.movements.filter(m => {
      const text = normalize([m.itens?.codigo,m.itens?.descricao,m.numero_nota,m.numero_rem,m.numero_os,m.chassi,m.responsavel,m.solicitante].join(" "));
      return (!q || text.includes(q)) && (!type || m.tipo === type);
    });
    $("#historyTimeline").className = rows.length ? "timeline" : "timeline empty-state";
    $("#historyTimeline").innerHTML = rows.length ? rows.map(m => `
      <article class="timeline-entry">
        <span class="timeline-dot ${m.tipo}"></span>
        <div class="timeline-content"><strong>${m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste"} de ${m.quantidade} un. — ${esc(m.itens?.codigo)} ${esc(m.itens?.descricao)}</strong>
        <span>${esc(m.itens?.filial)} • ${esc(m.numero_nota || m.numero_rem || m.numero_os || m.finalidade || "Movimentação interna")} • ${esc(m.responsavel || m.solicitante || "")}</span></div>
        <div class="timeline-date">${fmtDate(m.data_movimento)}<br><small>${fmtDateTime(m.created_at)}</small></div>
      </article>`).join("") : "Nenhum histórico disponível.";
  }

  function renderDocuments() {
    const q = normalize($("#documentSearch").value);
    const type = $("#documentTypeFilter").value;
    const rows = state.attachments.filter(a => {
      const m = a.movimentacoes || {};
      const text = normalize([a.nome_arquivo,m.numero_nota,m.numero_rem,m.numero_os,m.itens?.codigo,m.itens?.descricao].join(" "));
      return (!q || text.includes(q)) && (!type || a.tipo_movimento === type);
    });
    $("#documentsGrid").className = rows.length ? "documents-grid" : "documents-grid empty-state";
    $("#documentsGrid").innerHTML = rows.length ? rows.map(a => `
      <article class="document-card">
        <div class="document-top"><div class="document-icon">▤</div><span class="badge ${a.tipo_movimento==="entrada"?"success":"danger"}">${esc(a.tipo_movimento)}</span></div>
        <h4>${esc(a.nome_arquivo)}</h4>
        <p>${esc(a.movimentacoes?.itens?.codigo || "")} — ${esc(a.movimentacoes?.itens?.descricao || "")}<br>${fmtDateTime(a.created_at)} • ${formatBytes(a.tamanho_bytes)}</p>
        <button class="btn btn-secondary" onclick="window.app.openDocument('${a.id}')">Abrir documento</button>
      </article>`).join("") : "Nenhum documento anexado.";
  }

  function renderArchive() {
    const rows = [...state.movements].sort((a,b) => {
      const dateCompare = String(b.data_movimento || "").localeCompare(String(a.data_movimento || ""));
      return dateCompare || String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    const olderThanTwoYears = rows.filter(m => ageMonths(m.data_movimento) >= 24);
    const attachmentCount = state.attachments.length;

    $("#archiveEligible").textContent = rows.length;
    $("#archiveSoon").textContent = attachmentCount;
    $("#archiveDone").textContent = olderThanTwoYears.length;

    $("#archiveList").className = rows.length ? "archive-list" : "archive-list empty-state";
    $("#archiveList").innerHTML = rows.length ? rows.map(m => {
      const months = ageMonths(m.data_movimento);
      const attachmentTotal = state.attachments.filter(a => a.movimentacao_id === m.id).length;
      const document = m.numero_nota || m.numero_rem || m.numero_os || "Sem documento";
      const retentionBadge = months >= 24
        ? `<span class="badge danger">Revisar retenção</span>`
        : `<span class="badge success">Disponível para backup</span>`;

      return `
        <div class="archive-row">
          <div class="movement-info">
            <strong>${esc(m.itens?.codigo || "—")} — ${esc(m.itens?.descricao || "Item")}</strong>
            <span>
              ${m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste"}
              • ${fmtDate(m.data_movimento)}
              • ${esc(m.itens?.filial || "—")}
              • ${esc(document)}
              • ${m.quantidade} un.
              • ${attachmentTotal} anexo(s)
            </span>
          </div>
          ${retentionBadge}
        </div>`;
    }).join("") : "Nenhuma movimentação registrada.";
  }

  async function saveItem(event) {
    event.preventDefault();
    const button = event.submitter;
    const data = new FormData(event.target);
    const itemId = data.get("id");

    if (!itemId) return toast("Item não identificado para edição.", "error", "Não foi possível salvar");

    const item = state.items.find(i => i.id === itemId);
    if (!item) return toast("Item não encontrado.", "error");

    setLoading(button, true, "Salvando...");
    try {
      await db.collection("items").doc(itemId).update({
        codigo: normalizeItemCode(data.get("codigo")),
        code: normalizeItemCode(data.get("codigo")),
        descricao: String(data.get("descricao") || "").trim(),
        description: String(data.get("descricao") || "").trim(),
        categoria: data.get("categoria") || "REM - Garantia S/R",
        marca: String(data.get("marca") || "").trim(),
        localizacao: String(data.get("localizacao") || "").trim(),
        location: String(data.get("localizacao") || "").trim(),
        status: data.get("status") || "disponivel",
        observacoes: String(data.get("observacoes") || "").trim(),
        updatedAt: firestoreNow(),
        updated_at: firestoreNow()
      });
      closeModals();
      toast("Item atualizado com sucesso.");
      await loadAll();
    } catch (error) {
      toast(translateError(error.code || error.message), "error", "Item não atualizado");
    } finally {
      setLoading(button, false);
    }
  }



  function formatCnpjValue(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  }

  function formatCnpjEmitente(event) {
    event.target.value = formatCnpjValue(event.target.value);
  }

  function validarCnpjBasico(cnpj) {
    return /^\d{14}$/.test(String(cnpj || "").replace(/\D/g, ""));
  }

  async function saveEntry(event) {
    event.preventDefault();
    const button = event.submitter;
    const data = new FormData(event.target);
    const isNew = data.get("item_mode") === "novo";
    const cnpjEmitente = String(data.get("cnpj_emitente") || "").replace(/\D/g, "");
    if (!validarCnpjBasico(cnpjEmitente)) return toast("Informe um CNPJ do emitente com 14 números.", "error", "CNPJ inválido");

    const quantity = Number(data.get("quantidade"));
    if (!Number.isInteger(quantity) || quantity <= 0) return toast("Informe uma quantidade maior que zero.", "error", "Quantidade inválida");

    let itemId;
    let selectedBranch;
    let newItemData = null;

    if (isNew) {
      selectedBranch = branchByName(getEntrySelectedBranch());
      if (!selectedBranch) return toast("Selecione a filial do item.", "error", "Filial obrigatória");

      const branchCnpj = String(data.get("novo_cnpj") || "").replace(/\D/g, "");
      if (!validarCnpjBasico(branchCnpj)) {
        return toast("Informe o CNPJ da filial com 14 números.", "error", "CNPJ da filial inválido");
      }

      const code = normalizeItemCode(data.get("novo_codigo"));
      const duplicate = findExistingEntryItem(code, selectedBranch.localidade);
      if (duplicate) {
        applyExistingItemSuggestion(duplicate);
        return toast(`O item ${duplicate.codigo} já possui cadastro nesta filial. O cadastro existente foi selecionado.`, "error", "Item já cadastrado");
      }
      itemId = makeItemId(selectedBranch.codigo, code);
      newItemData = {
        codigo: code, code,
        descricao: String(data.get("novo_descricao") || "").trim(),
        description: String(data.get("novo_descricao") || "").trim(),
        categoria: data.get("novo_categoria") || "REM - Garantia S/R",
        marca: String(data.get("novo_marca") || "").trim(),
        filial: selectedBranch.localidade,
        branchName: selectedBranch.localidade,
        filial_codigo: selectedBranch.codigo,
        branchCode: selectedBranch.codigo,
        dn: branchCnpj,
        cnpj: branchCnpj,
        localizacao: String(data.get("novo_localizacao") || "").trim(),
        location: String(data.get("novo_localizacao") || "").trim(),
        saldo: quantity,
        balance: quantity,
        estoque_minimo: 0,
        valor_unitario: 0,
        status: "disponivel",
        observacoes: "",
        createdBy: state.session.user.uid,
        createdAt: firestoreNow(),
        created_at: firestoreNow(),
        updatedAt: firestoreNow(),
        updated_at: firestoreNow()
      };
      if (!newItemData.codigo || !newItemData.descricao || !newItemData.localizacao) {
        return toast("Preencha código, descrição e localização do novo item.", "error", "Dados incompletos");
      }
    } else {
      itemId = String(data.get("item_id") || "");
      if (!itemId) return toast("Selecione o item já cadastrado.", "error", "Item obrigatório");
    }

    setLoading(button, true, isNew ? "Criando item e entrada..." : "Registrando entrada...");
    let movementId = null;

    try {
      await db.runTransaction(async transaction => {
        const itemRef = db.collection("items").doc(itemId);
        const itemSnap = await transaction.get(itemRef);

        if (isNew && itemSnap.exists) throw new Error("ITEM_DUPLICADO");
        if (!isNew && !itemSnap.exists) throw new Error("ITEM_NAO_ENCONTRADO");

        let itemData;
        if (isNew) {
          itemData = newItemData;
          transaction.set(itemRef, itemData);
        } else {
          const current = itemSnap.data();
          const currentBalance = Number(current.saldo ?? current.balance ?? 0);
          itemData = current;
          transaction.update(itemRef, {
            saldo: currentBalance + quantity,
            balance: currentBalance + quantity,
            updatedAt: firestoreNow(),
            updated_at: firestoreNow()
          });
        }

        const movementRef = db.collection("movements").doc();
        movementId = movementRef.id;
        transaction.set(movementRef, {
          tipo: "entrada", type: "entrada",
          item_id: itemId, itemId,
          item_codigo: itemData.codigo || itemData.code,
          itemCode: itemData.codigo || itemData.code,
          item_descricao: itemData.descricao || itemData.description,
          itemDescription: itemData.descricao || itemData.description,
          filial: itemData.filial || itemData.branchName,
          branchName: itemData.filial || itemData.branchName,
          filial_codigo: itemData.filial_codigo || itemData.branchCode,
          branchCode: itemData.filial_codigo || itemData.branchCode,
          localizacao: itemData.localizacao || itemData.location,
          location: itemData.localizacao || itemData.location,
          quantidade: quantity, quantity,
          data_movimento: data.get("data_movimento"), movementDate: data.get("data_movimento"),
          cnpj_emitente: cnpjEmitente,
          natureza_operacao: String(data.get("natureza_operacao") || "").trim(),
          numero_nota: String(data.get("numero_nota") || "").trim(),
          numero_rem: String(data.get("numero_rem") || "").trim(),
          responsavel: String(data.get("responsavel") || "").trim(),
          observacoes: String(data.get("observacoes") || "").trim(),
          status: "ativo",
          criado_por: state.session.user.uid,
          createdBy: state.session.user.uid,
          createdAt: firestoreNow(), created_at: firestoreNow()
        });
      });

      event.target.reset();
      event.target.item_mode.value = "novo";
      event.target.novo_marca.value = "Volkswagen";
      setDefaultDates();
      configureEntryBranchFields();
      updateEntryMode();
      closeModals();
      toast(isNew ? "Novo item criado e entrada registrada com sucesso." : "Entrada registrada no item existente.");
      await loadAll();
    } catch (error) {
      console.error(error);
      if (String(error.message).includes("ITEM_DUPLICADO")) {
        const duplicate = findExistingEntryItem(data.get("novo_codigo"), selectedBranch?.localidade);
        if (duplicate) applyExistingItemSuggestion(duplicate);
      }
      toast(translateError(error.code || error.message), "error", "Erro na entrada");
    } finally {
      setLoading(button, false);
    }
  }

  async function saveExit(event) {
    event.preventDefault();
    const button = event.submitter;
    const data = new FormData(event.target);
    const receiverName = String(data.get("recebedor_nome") || "").trim();
    const receiverDocument = String(data.get("recebedor_documento") || "").trim();
    const itemId = String(data.get("item_id") || "");
    const quantity = Number(data.get("quantidade"));

    if (!itemId) return toast("Selecione o item.", "error", "Item obrigatório");
    if (!Number.isInteger(quantity) || quantity <= 0) return toast("Informe uma quantidade maior que zero.", "error", "Quantidade inválida");
    if (!receiverName || !receiverDocument) return toast("Informe o nome e o CPF ou matrícula de quem recebeu.", "error", "Identificação obrigatória");
    if (!signatureHasInk) return toast("Peça ao recebedor para assinar no campo indicado.", "error", "Assinatura obrigatória");
    if (!$("#signatureConsent")?.checked) return toast("Confirme o recebimento antes de salvar.", "error", "Confirmação obrigatória");

    setLoading(button, true, "Salvando saída e assinatura...");

    try {
      const signatureData = await compressSignatureDataUrl();
      let movementId = null;

      await db.runTransaction(async transaction => {
        const itemRef = db.collection("items").doc(itemId);
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists) throw new Error("ITEM_NAO_ENCONTRADO");

        const item = itemSnap.data();
        const currentBalance = Number(item.saldo ?? item.balance ?? 0);
        if (currentBalance < quantity) throw new Error(`Saldo insuficiente. Disponível: ${currentBalance}, solicitado: ${quantity}.`);
        if ((item.status || "disponivel") !== "disponivel") throw new Error("O item está bloqueado ou arquivado.");

        const movementRef = db.collection("movements").doc();
        movementId = movementRef.id;

        transaction.update(itemRef, {
          saldo: currentBalance - quantity,
          balance: currentBalance - quantity,
          updatedAt: firestoreNow(), updated_at: firestoreNow()
        });

        transaction.set(movementRef, {
          tipo: "saida", type: "saida",
          item_id: itemId, itemId,
          item_codigo: item.codigo || item.code,
          itemCode: item.codigo || item.code,
          item_descricao: item.descricao || item.description,
          itemDescription: item.descricao || item.description,
          filial: item.filial || item.branchName,
          branchName: item.filial || item.branchName,
          filial_codigo: item.filial_codigo || item.branchCode,
          branchCode: item.filial_codigo || item.branchCode,
          localizacao: item.localizacao || item.location,
          location: item.localizacao || item.location,
          quantidade: quantity, quantity,
          data_movimento: data.get("data_movimento"), movementDate: data.get("data_movimento"),
          finalidade: String(data.get("finalidade") || "").trim(),
          numero_os: String(data.get("numero_os") || "").trim(),
          chassi: String(data.get("chassi") || "").trim(),
          placa: String(data.get("placa") || "").trim(),
          cliente: String(data.get("cliente") || "").trim(),
          solicitante: String(data.get("solicitante") || "").trim(),
          autorizado_por: String(data.get("autorizado_por") || "").trim(),
          requisitado_por: String(data.get("autorizado_por") || "").trim(),
          observacoes: String(data.get("observacoes") || "").trim(),
          recebedor_nome: receiverName,
          receiverName,
          recebedor_documento: receiverDocument,
          receiverDocument,
          signature_data: signatureData,
          signatureData,
          signature_locked: true,
          signatureLocked: true,
          signed_at: firestoreNow(), signedAt: firestoreNow(),
          status: "ativo",
          criado_por: state.session.user.uid, createdBy: state.session.user.uid,
          createdAt: firestoreNow(), created_at: firestoreNow()
        });
      });

      event.target.reset();
      setDefaultDates();
      updateExitBalance();
      clearDigitalSignature();
      closeModals();
      await loadAll();
      toast("Saída e romaneio digital assinado foram salvos definitivamente.");
    } catch (error) {
      console.error(error);
      toast(translateError(error.code || error.message), "error", "Saída não registrada");
    } finally {
      setLoading(button, false);
    }
  }

  async function compressSignatureDataUrl() {
    const source = $("#signatureCanvas");
    const target = document.createElement("canvas");
    target.width = 600;
    target.height = 220;
    const context = target.getContext("2d", { alpha: false });
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(source, 0, 0, target.width, target.height);
    const webp = target.toDataURL("image/webp", 0.72);
    return webp.startsWith("data:image/webp") ? webp : target.toDataURL("image/jpeg", 0.72);
  }

  async function openDocument(id) {
    const attachment = state.attachments.find(a => a.id === id);
    if (!attachment) return;

    if (attachment.virtual_signature) {
      const movement = state.movements.find(m => m.id === attachment.movimentacao_id);
      if (!movement) return toast("Romaneio não encontrado.", "error");
      const svg = buildSignedRomaneioSvg(
        movement,
        movement.recebedor_nome || movement.receiverName || "—",
        movement.recebedor_documento || movement.receiverDocument || "—",
        movement.signature_data || movement.signatureData
      );
      const url = URL.createObjectURL(new Blob([svg], {type:"image/svg+xml;charset=utf-8"}));
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) toast("Permita a abertura da visualização do romaneio.", "error", "Visualização bloqueada");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    const dataUrl = attachment.data_url || attachment.dataUrl;
    if (!dataUrl) return toast("Documento sem conteúdo disponível.", "error");
    const opened = window.open(dataUrl, "_blank", "noopener,noreferrer");
    if (!opened) toast("Permita a abertura do documento no navegador.", "error", "Visualização bloqueada");
  }

  function editItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return toast("Item não encontrado.", "error");

    const form = $("#itemForm");
    form.reset();

    $("#itemEditId").value = item.id;
    form.codigo.value = item.codigo || "";
    form.descricao.value = item.descricao || "";
    form.categoria.value = item.categoria || "REM - Garantia S/R";
    form.marca.value = item.marca || "";
    form.localizacao.value = item.localizacao || "";
    form.status.value = item.status === "bloqueado" ? "bloqueado" : "disponivel";
    form.observacoes.value = item.observacoes || "";

    configureBranchFields(item.filial);
    $("#itemModalTitle").textContent = `Editar ${item.codigo}`;
    openModal("itemModal");
  }

  async function deleteItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return toast("Item não encontrado.", "error");

    const confirmed = window.confirm(`Excluir o item ${item.codigo} — ${item.descricao}?\n\nA exclusão só será permitida se ele nunca tiver movimentações.`);
    if (!confirmed) return;

    try {
      const movements = await db.collection("movements").where("itemId", "==", id).limit(1).get();
      if (!movements.empty) throw new Error("Este item possui movimentações e não pode ser excluído.");
      await db.collection("items").doc(id).delete();
      toast("Item excluído com sucesso.");
      await loadAll();
    } catch (error) {
      toast(translateError(error.code || error.message), "error", "Item não excluído");
    }
  }

  function showItem(id) {
    const i = state.items.find(x => x.id === id);
    if (!i) return;
    const moves = state.movements.filter(m => m.item_id === id);
    $("#detailTitle").textContent = `${i.codigo} — ${i.descricao}`;
    $("#itemDetailContent").innerHTML = `
      <div class="detail-grid">
        <div class="detail-box"><span>Saldo atual</span><strong>${i.saldo} unidade(s)</strong></div>
        <div class="detail-box"><span>Filial</span><strong>${esc(i.filial)}</strong></div>
        <div class="detail-box"><span>Localização</span><strong>${esc(i.localizacao)}</strong></div>
        <div class="detail-box"><span>Categoria</span><strong>${esc(i.categoria)}</strong></div>
        <div class="detail-box"><span>Status</span><strong>${itemStatus(i)}</strong></div>
        <div class="detail-box"><span>Marca</span><strong>${esc(i.marca || "—")}</strong></div>
      </div>
      <div class="detail-section"><h4>Últimas movimentações</h4>
        ${moves.length ? moves.slice(0,10).map(m=>`<div class="movement-row"><div class="movement-icon ${m.tipo==="entrada"?"in":"out"}">${m.tipo==="entrada"?"↘":"↗"}</div><div class="movement-info"><strong>${m.tipo==="entrada"?"Entrada":"Saída"} de ${m.quantidade} un.</strong><span>${fmtDate(m.data_movimento)} • ${esc(m.numero_nota||m.numero_rem||m.numero_os||m.finalidade||"")}</span></div></div>`).join("") : '<div class="empty-state">Sem movimentações.</div>'}
      </div>`;
    openModal("itemDetailModal");
  }

  function attachmentButton(movementId, compact = false) {
    const count = state.attachments.filter(a => a.movimentacao_id === movementId).length;
    if (!count) return compact ? "" : `<span class="badge neutral">Sem anexo</span>`;
    return `<button class="mini-btn" onclick="window.app.showMovementDocuments('${movementId}')">${compact ? `Outros (${count})` : `${count} arquivo(s)`}</button>`;
  }

  function signedRomaneioAttachment(movementId) {
    return state.attachments.find(a => a.movimentacao_id === movementId && a.virtual_signature) || null;
  }

  function romaneioNumber(movement) {
    const year = movement?.data_movimento
      ? String(movement.data_movimento).slice(0, 4)
      : String(new Date().getFullYear());
    const idPart = String(movement?.id || "SEMID").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
    return `ROM-${year}-${idPart}`;
  }

  let signatureContext = null;
  let signatureDrawing = false;
  let signatureHasInk = false;
  let signatureLastPoint = null;

  function openDigitalSignature(movementId) {
    const movement = state.movements.find(m => m.id === movementId && m.tipo === "saida");
    if (!movement) return toast("Saída não encontrada.", "error", "Romaneio indisponível");

    if (signedRomaneioAttachment(movementId)) {
      return toast(
        "Este romaneio já foi assinado e a assinatura é definitiva.",
        "error",
        "Assinatura já finalizada"
      );
    }

    if (!$("#signatureModal") || !$("#signatureForm")) {
      return toast("O formulário de assinatura não foi carregado. Atualize a página.", "error", "Assinatura indisponível");
    }

    $("#signatureMovementId").value = movementId;
    $("#signatureReceiverName").value = movement.solicitante || "";
    $("#signatureReceiverDocument").value = "";
    $("#signatureConsent").checked = false;
    $("#signatureRomaneioSummary").innerHTML = `
      <div><span>Romaneio</span><strong>${esc(romaneioNumber(movement))}</strong></div>
      <div><span>Item</span><strong>${esc(movement.itens?.codigo || "—")} — ${esc(movement.itens?.descricao || "—")}</strong></div>
      <div><span>Quantidade</span><strong>${Number(movement.quantidade || 0)} unidade(s)</strong></div>
      <div><span>OS / Finalidade</span><strong>${esc(movement.numero_os || "Sem OS")} • ${esc(movement.finalidade || "—")}</strong></div>`;

    openModal("signatureModal");
    requestAnimationFrame(() => {
      resizeSignatureCanvas();
      configureSignatureCanvas();
      clearDigitalSignature();
      $("#signatureReceiverName").focus();
    });
  }

  function resizeSignatureCanvas() {
    const canvas = $("#signatureCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const previous = signatureHasInk ? canvas.toDataURL("image/png") : null;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    signatureContext = canvas.getContext("2d");
    signatureContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    signatureContext.lineCap = "round";
    signatureContext.lineJoin = "round";
    signatureContext.strokeStyle = "#10213a";
    signatureContext.lineWidth = 2.6;

    if (previous) {
      const image = new Image();
      image.onload = () => signatureContext.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = previous;
    }
  }

  function configureSignatureCanvas() {
    const canvas = $("#signatureCanvas");
    if (!canvas || canvas.dataset.signatureReady === "true") return;
    canvas.dataset.signatureReady = "true";

    const pointFromEvent = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    canvas.addEventListener("pointerdown", event => {
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      signatureDrawing = true;
      signatureLastPoint = pointFromEvent(event);
      signatureHasInk = true;
      $("#signaturePlaceholder").classList.add("hidden");
      signatureContext.beginPath();
      signatureContext.moveTo(signatureLastPoint.x, signatureLastPoint.y);
    });

    canvas.addEventListener("pointermove", event => {
      if (!signatureDrawing || !signatureContext) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      signatureContext.lineTo(point.x, point.y);
      signatureContext.stroke();
      signatureLastPoint = point;
    });

    const finish = event => {
      if (!signatureDrawing) return;
      event?.preventDefault();
      signatureDrawing = false;
      signatureLastPoint = null;
      signatureContext?.closePath();
    };

    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("pointerleave", finish);
  }

  function clearDigitalSignature() {
    const canvas = $("#signatureCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!signatureContext) resizeSignatureCanvas();
    signatureContext?.clearRect(0, 0, rect.width, rect.height);
    signatureHasInk = false;
    signatureDrawing = false;
    signatureLastPoint = null;
    $("#signaturePlaceholder")?.classList.remove("hidden");
  }

  function xmlEscape(value) {
    return String(value ?? "").replace(/[<>&"']/g, char => ({
      "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"
    })[char]);
  }

  function wrapSvgText(value, maxChars = 55) {
    const words = String(value || "—").split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function buildSignedRomaneioSvg(movement, receiverName, receiverDocument, signatureDataUrl) {
    const numero = romaneioNumber(movement);
    const filial = FILIAIS.find(f => f.localidade === movement.itens?.filial);
    const signedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short", timeStyle: "medium"
    }).format(new Date());
    const descriptionLines = wrapSvgText(movement.itens?.descricao, 62);
    const observationLines = wrapSvgText(movement.observacoes || "Sem observações", 76);
    const textLines = (lines, x, y, gap=22) => lines.map((line, index) =>
      `<text x="${x}" y="${y + index * gap}" class="value">${xmlEscape(line)}</text>`
    ).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <style>
    .title{font:700 31px Arial,sans-serif;fill:#fff}.subtitle{font:16px Arial,sans-serif;fill:#d6e0ec}
    .section{font:700 17px Arial,sans-serif;fill:#fff;letter-spacing:1px}.label{font:700 15px Arial,sans-serif;fill:#66758a}
    .value{font:18px Arial,sans-serif;fill:#142033}.strong{font:700 20px Arial,sans-serif;fill:#142033}
    .small{font:14px Arial,sans-serif;fill:#66758a}.declaration{font:16px Arial,sans-serif;fill:#354258}
  </style>
  <rect width="1240" height="1754" fill="#f4f6f9"/>
  <rect x="52" y="45" width="1136" height="1662" rx="12" fill="#fff" stroke="#cdd6e2" stroke-width="2"/>
  <rect x="52" y="45" width="1136" height="168" rx="12" fill="#0b1a2d"/>
  <rect x="52" y="195" width="1136" height="18" fill="#d71928"/>
  <rect x="82" y="78" width="90" height="90" rx="22" fill="#d71928"/>
  <text x="127" y="136" text-anchor="middle" class="title" font-size="25">LD</text>
  <text x="198" y="112" class="title">ROMANEIO DIGITAL DE ENTREGA</text>
  <text x="198" y="148" class="subtitle">Controle de Itens Livres de Débito • Grupo Monaco • Projeto Zero Papel</text>
  <text x="1110" y="105" text-anchor="end" class="subtitle">${xmlEscape(numero)}</text>
  <text x="1110" y="143" text-anchor="end" class="subtitle">Saída: ${xmlEscape(fmtDate(movement.data_movimento))}</text>

  <rect x="82" y="252" width="1076" height="44" rx="6" fill="#132b48"/><text x="102" y="281" class="section">IDENTIFICAÇÃO DA OPERAÇÃO</text>
  <text x="102" y="340" class="label">FILIAL</text><text x="102" y="370" class="strong">${xmlEscape(movement.itens?.filial || "—")}</text>
  <text x="470" y="340" class="label">CNPJ</text><text x="470" y="370" class="strong">${xmlEscape(filial?.cnpj || "—")}</text>
  <text x="820" y="340" class="label">DATA/HORA DA ASSINATURA</text><text x="820" y="370" class="strong">${xmlEscape(signedAt)}</text>

  <rect x="82" y="416" width="1076" height="44" rx="6" fill="#132b48"/><text x="102" y="445" class="section">ITEM RETIRADO</text>
  <text x="102" y="505" class="label">CÓDIGO</text><text x="102" y="535" class="strong">${xmlEscape(movement.itens?.codigo || "—")}</text>
  <text x="370" y="505" class="label">QUANTIDADE</text><text x="370" y="535" class="strong">${Number(movement.quantidade || 0)} unidade(s)</text>
  <text x="720" y="505" class="label">LOCALIZAÇÃO</text><text x="720" y="535" class="strong">${xmlEscape(movement.itens?.localizacao || "—")}</text>
  <text x="102" y="590" class="label">DESCRIÇÃO</text>${textLines(descriptionLines,102,620)}

  <rect x="82" y="710" width="1076" height="44" rx="6" fill="#132b48"/><text x="102" y="739" class="section">DADOS DA RETIRADA</text>
  <text x="102" y="800" class="label">OS</text><text x="102" y="830" class="value">${xmlEscape(movement.numero_os || "Sem OS")}</text>
  <text x="380" y="800" class="label">CHASSI</text><text x="380" y="830" class="value">${xmlEscape(movement.chassi || "—")}</text>
  <text x="810" y="800" class="label">PLACA</text><text x="810" y="830" class="value">${xmlEscape(movement.placa || "—")}</text>
  <text x="102" y="885" class="label">CLIENTE</text><text x="102" y="915" class="value">${xmlEscape(movement.cliente || "—")}</text>
  <text x="600" y="885" class="label">FINALIDADE</text><text x="600" y="915" class="value">${xmlEscape(movement.finalidade || "—")}</text>
  <text x="102" y="970" class="label">SOLICITANTE</text><text x="102" y="1000" class="value">${xmlEscape(movement.solicitante || "—")}</text>
  <text x="600" y="970" class="label">REQUISITADO POR</text><text x="600" y="1000" class="value">${xmlEscape(movement.autorizado_por || "—")}</text>
  <text x="102" y="1055" class="label">OBSERVAÇÕES</text>${textLines(observationLines,102,1085)}

  <rect x="82" y="1185" width="1076" height="44" rx="6" fill="#12835b"/><text x="102" y="1214" class="section">RECEBIMENTO E ASSINATURA DIGITAL</text>
  <text x="102" y="1275" class="label">NOME DO RECEBEDOR</text><text x="102" y="1307" class="strong">${xmlEscape(receiverName)}</text>
  <text x="700" y="1275" class="label">CPF / MATRÍCULA</text><text x="700" y="1307" class="strong">${xmlEscape(receiverDocument)}</text>
  <rect x="102" y="1345" width="650" height="205" rx="8" fill="#fff" stroke="#aeb9c8" stroke-width="2"/>
  <image x="122" y="1365" width="610" height="165" preserveAspectRatio="xMidYMid meet" xlink:href="${signatureDataUrl}"/>
  <text x="780" y="1400" class="label">RESPONSÁVEL PELA ENTREGA</text><text x="780" y="1432" class="value">${xmlEscape(state.profile?.nome || "—")}</text>
  <text x="780" y="1490" class="label">VALIDAÇÃO</text><text x="780" y="1522" class="value">Assinatura capturada digitalmente</text>

  <text x="102" y="1605" class="declaration">Declaro que recebi o item acima relacionado nas condições informadas e reconheço esta assinatura digital</text>
  <text x="102" y="1632" class="declaration">como comprovante da retirada, utilização, guarda e devolução quando aplicável.</text>
  <line x1="82" y1="1665" x2="1158" y2="1665" stroke="#d7dee7"/>
  <text x="102" y="1692" class="small">Documento eletrônico vinculado à movimentação ${xmlEscape(String(movement.id))}</text>
  <text x="1138" y="1692" text-anchor="end" class="small">${xmlEscape(numero)}</text>
</svg>`;
  }

  async function svgToPngFile(svgContent, filename) {
    return new Promise((resolve, reject) => {
      const svgBlob = new Blob([svgContent], {
        type: "image/svg+xml;charset=utf-8"
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1240;
          canvas.height = 1754;

          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Não foi possível preparar o romaneio digital.");

          context.fillStyle = "#FFFFFF";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(blob => {
            URL.revokeObjectURL(svgUrl);
            if (!blob) {
              reject(new Error("Não foi possível converter o romaneio para PNG."));
              return;
            }

            resolve(new File([blob], filename, {
              type: "image/png",
              lastModified: Date.now()
            }));
          }, "image/png", 1);
        } catch (error) {
          URL.revokeObjectURL(svgUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Não foi possível montar a imagem do romaneio."));
      };

      image.src = svgUrl;
    });
  }

  async function deleteAttachment(attachment) {
    if (!attachment) return;
    if (attachment.virtual_signature) throw new Error("A assinatura digital é permanente e não pode ser excluída.");
    await db.collection("attachments").doc(attachment.id).delete();
  }

  async function printRomaneio(movementId) {
    const signed = signedRomaneioAttachment(movementId);
    if (signed) return printSignedRomaneioAttachment(signed);

    const movement = state.movements.find(m => m.id === movementId && m.tipo === "saida");
    if (!movement) return toast("Saída não encontrada para emissão.", "error", "Romaneio indisponível");

    const filial = FILIAIS.find(f => f.localidade === movement.itens?.filial);
    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date());
    const numero = romaneioNumber(movement);

    const reportHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${esc(numero)} - Romaneio de Entrega</title>
  <style>
    @page{size:A4 portrait;margin:11mm}
    *{box-sizing:border-box}
    body{margin:0;color:#142033;background:#fff;font-family:Arial,sans-serif;font-size:11px}
    .sheet{width:100%;border:1px solid #cfd7e2}
    .header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;background:#0b1a2d;color:#fff;border-bottom:4px solid #d71928}
    .brand{display:flex;align-items:center;gap:12px}.logo{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:#d71928;color:#fff;font-weight:900;font-size:15px}
    h1{margin:0 0 5px;font-size:19px}.header p{margin:0;color:#d9e2ed;font-size:10px}.number{text-align:right}.number strong{display:block;font-size:15px}.number span{color:#d9e2ed;font-size:9px}
    .content{padding:18px 20px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.meta div,.field{border:1px solid #dfe5ed;background:#f8fafc;padding:9px}.meta span,.field span{display:block;margin-bottom:4px;color:#758196;font-size:8px;font-weight:700;text-transform:uppercase}.meta strong,.field strong{font-size:11px}
    .section{margin-top:14px}.section-title{padding:7px 9px;background:#eaf0f7;border-left:4px solid #132b48;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:7px}.grid.three{grid-template-columns:repeat(3,1fr)}.span-2{grid-column:span 2}.span-3{grid-column:span 3}
    .declaration{margin-top:16px;padding:11px;border:1px solid #dfe5ed;background:#fff;font-size:9px;line-height:1.55;color:#46546a}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px}.signature{padding-top:8px;border-top:1px solid #263247;text-align:center}.signature strong{display:block;font-size:10px}.signature span{display:block;margin-top:4px;color:#758196;font-size:8px}
    .receiver-data{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}.line{height:28px;border-bottom:1px solid #7d8795}.line-label{color:#758196;font-size:8px;text-transform:uppercase}
    .footer{display:flex;justify-content:space-between;margin-top:22px;padding-top:9px;border-top:1px solid #dfe5ed;color:#758196;font-size:8px}
    .actions{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}.actions button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.print{background:#d71928;color:#fff}.close{background:#edf1f5;color:#263247}
    @media print{.actions{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
  <div class="actions"><button class="close" onclick="window.close()">Fechar</button><button class="print" onclick="window.print()">Imprimir / Salvar PDF</button></div>
  <main class="sheet">
    <header class="header">
      <div class="brand"><div class="logo">LD</div><div><h1>ROMANEIO DE ENTREGA DE ITEM</h1><p>Controle de Itens Livres de Débito • Grupo Monaco</p></div></div>
      <div class="number"><strong>${esc(numero)}</strong><span>Emitido em ${esc(generatedAt)}</span></div>
    </header>
    <div class="content">
      <div class="meta">
        <div><span>Filial</span><strong>${esc(movement.itens?.filial || "—")}</strong></div>
        <div><span>CNPJ</span><strong>${esc(filial?.cnpj || "—")}</strong></div>
        <div><span>Data da saída</span><strong>${esc(fmtDate(movement.data_movimento))}</strong></div>
      </div>

      <section class="section"><div class="section-title">Dados do item</div><div class="grid three">
        <div class="field"><span>Código</span><strong>${esc(movement.itens?.codigo || "—")}</strong></div>
        <div class="field span-2"><span>Descrição</span><strong>${esc(movement.itens?.descricao || "—")}</strong></div>
        <div class="field"><span>Quantidade</span><strong>${esc(movement.quantidade)} unidade(s)</strong></div>
        <div class="field"><span>Localização</span><strong>${esc(movement.itens?.localizacao || "—")}</strong></div>
        <div class="field"><span>Finalidade</span><strong>${esc(movement.finalidade || "—")}</strong></div>
      </div></section>

      <section class="section"><div class="section-title">Dados da retirada / aplicação</div><div class="grid three">
        <div class="field"><span>OS</span><strong>${esc(movement.numero_os || "—")}</strong></div>
        <div class="field"><span>Placa</span><strong>${esc(movement.placa || "—")}</strong></div>
        <div class="field"><span>Chassi</span><strong>${esc(movement.chassi || "—")}</strong></div>
        <div class="field span-2"><span>Cliente</span><strong>${esc(movement.cliente || "—")}</strong></div>
        <div class="field"><span>Solicitante</span><strong>${esc(movement.solicitante || "—")}</strong></div>
        <div class="field span-2"><span>Requisitado por</span><strong>${esc(movement.autorizado_por || "—")}</strong></div>
        <div class="field"><span>Responsável pela entrega</span><strong>${esc(state.profile?.nome || "—")}</strong></div>
        <div class="field span-3"><span>Observações</span><strong>${esc(movement.observacoes || "Sem observações")}</strong></div>
      </div></section>

      <div class="declaration">Declaro que recebi o(s) item(ns) acima relacionado(s), nas condições informadas, ficando responsável por sua utilização, guarda e devolução quando aplicável.</div>

      <div class="receiver-data">
        <div><div class="line"></div><div class="line-label">Nome completo de quem recebeu</div></div>
        <div><div class="line"></div><div class="line-label">CPF ou matrícula</div></div>
      </div>

      <div class="signatures">
        <div class="signature"><strong>${esc(state.profile?.nome || "Responsável pela entrega")}</strong><span>Assinatura de quem entregou</span></div>
        <div class="signature"><strong>Responsável pelo recebimento</strong><span>Assinatura de quem retirou</span></div>
      </div>

      <footer class="footer"><span>Sistema de Controle de Itens Livres de Débito</span><span>${esc(numero)} • Uso interno</span></footer>
    </div>
  </main>
</body>
</html>`;

    const oldFrame = document.getElementById("romaneioPrintFrame");
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement("iframe");
    frame.id = "romaneioPrintFrame";
    frame.setAttribute("title", "Romaneio para impressão");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument || frame.contentWindow?.document;
    if (!frameDocument) {
      frame.remove();
      return toast("Não foi possível preparar o romaneio.", "error", "Erro de impressão");
    }

    frameDocument.open();
    frameDocument.write(reportHtml);
    frameDocument.close();

    const printFrame = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1800);
      } catch (error) {
        frame.remove();
        toast("Não foi possível abrir a impressão do romaneio.", "error", "Erro de impressão");
      }
    };

    if (frame.contentWindow?.document?.readyState === "complete") setTimeout(printFrame, 300);
    else frame.onload = () => setTimeout(printFrame, 300);
  }

  function showMovementDocuments(movementId) {
    showView("documentsView");
    const movement = state.movements.find(m=>m.id===movementId);
    $("#documentSearch").value = movement?.numero_nota || movement?.numero_rem || movement?.numero_os || movement?.itens?.codigo || "";
    renderDocuments();
  }

  function updateExitBalance() {
    const item = state.items.find(i => i.id === $("#exitItemSelect").value);
    $("#exitBalanceHint").textContent = `Saldo disponível: ${item?.saldo ?? 0}`;
  }

  function itemStatusKey(item) {
    if (item.status === "bloqueado") return "bloqueado";
    if (Number(item.saldo) <= 0) return "zerado";
    if (Number(item.saldo) <= Number(item.estoque_minimo)) return "baixo";
    return "disponivel";
  }
  function itemStatus(item) { return ({bloqueado:"Bloqueado",zerado:"Sem saldo",baixo:"Estoque baixo",disponivel:"Disponível"})[itemStatusKey(item)]; }
  function itemBadge(item) {
    const key = itemStatusKey(item);
    const cls = key === "disponivel" ? "success" : key === "baixo" ? "warning" : "danger";
    return `<span class="badge ${cls}">${itemStatus(item)}</span>`;
  }

  function ageMonths(date) {
    const start = new Date(`${date}T12:00:00`), end = new Date();
    let months = (end.getFullYear()-start.getFullYear())*12 + end.getMonth()-start.getMonth();
    if (end.getDate() < start.getDate()) months--;
    return months;
  }

  function printAuditReport() {
    if (!state.movements.length) {
      return toast("Não há movimentações para imprimir.", "error", "Relatório vazio");
    }

    const rows = [...state.movements].sort((a,b) =>
      String(a.data_movimento || "").localeCompare(String(b.data_movimento || ""))
    );

    const totalEntradas = rows
      .filter(m => m.tipo === "entrada" && m.status === "ativo")
      .reduce((sum,m) => sum + Number(m.quantidade || 0), 0);

    const totalSaidas = rows
      .filter(m => m.tipo === "saida" && m.status === "ativo")
      .reduce((sum,m) => sum + Number(m.quantidade || 0), 0);

    const branches = [...new Set(rows.map(m => m.itens?.filial).filter(Boolean))];
    const branchLabel = state.profile?.role === "operador"
      ? state.profile.filial
      : branches.length === 1 ? branches[0] : "Todas as filiais";

    const firstDate = rows[0]?.data_movimento;
    const lastDate = rows[rows.length - 1]?.data_movimento;
    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date());

    const tableRows = rows.map((m, index) => {
      const anexos = state.attachments.filter(a => a.movimentacao_id === m.id);
      const tipoLabel = m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste";
      const qtdLabel = `${m.tipo === "saida" ? "-" : "+"}${m.quantidade}`;
      const documento = m.numero_nota || m.numero_rem || m.numero_os || "—";
      const responsavel = m.responsavel || m.solicitante || "—";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(fmtDate(m.data_movimento))}</td>
          <td><span class="print-type ${m.tipo}">${tipoLabel}</span></td>
          <td class="print-code">${esc(m.itens?.codigo || "—")}</td>
          <td>${esc(m.itens?.descricao || "—")}</td>
          <td>${esc(m.itens?.filial || "—")}</td>
          <td>${esc(m.itens?.localizacao || "—")}</td>
          <td class="print-qty">${qtdLabel}</td>
          <td class="print-code">${esc(documento)}</td>
          <td class="print-code">${esc(m.cnpj_emitente || "—")}</td>
          <td>${esc(m.natureza_operacao || m.finalidade || "—")}</td>
          <td>${esc(responsavel)}</td>
          <td>${anexos.length}</td>
        </tr>`;
    }).join("");

    const reportHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Auditoria - Estoque Auxiliar</title>
  <style>
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    body{margin:0;font-family:Arial,sans-serif;color:#162033;background:#fff;font-size:9px}
    .report{width:100%}
    .report-header{
      display:flex;justify-content:space-between;align-items:center;
      padding:0 0 12px;border-bottom:3px solid #d71928;margin-bottom:12px
    }
    .brand{display:flex;align-items:center;gap:12px}
    .logo{
      width:46px;height:46px;border-radius:13px;display:grid;place-items:center;
      color:#fff;background:linear-gradient(135deg,#ed2431,#b90e18);
      font-weight:900;font-size:14px
    }
    h1{font-size:18px;margin:0 0 4px}
    .subtitle{color:#68758a;font-size:9px}
    .report-meta{text-align:right;line-height:1.7}
    .report-meta strong{color:#172033}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .summary-card{border:1px solid #dfe5ed;border-radius:10px;padding:10px;background:#f8fafc}
    .summary-card span{display:block;color:#758196;font-size:8px;text-transform:uppercase;font-weight:700;margin-bottom:5px}
    .summary-card strong{font-size:17px}
    table{width:100%;border-collapse:collapse;table-layout:auto}
    thead{display:table-header-group}
    th{
      background:#0b1a2d;color:#fff;padding:7px 5px;text-align:left;
      font-size:7px;text-transform:uppercase;letter-spacing:.05em
    }
    td{padding:6px 5px;border-bottom:1px solid #e5e9ef;vertical-align:top;word-break:break-word}
    tbody tr:nth-child(even){background:#f7f9fc}
    .print-code{font-family:"Courier New",monospace;white-space:nowrap}
    .print-qty{font-weight:700;white-space:nowrap}
    .print-type{display:inline-block;border-radius:10px;padding:3px 6px;font-weight:700}
    .print-type.entrada{color:#0c704a;background:#e6f6ee}
    .print-type.saida{color:#a5222e;background:#ffe7ea}
    .print-type.ajuste{color:#926000;background:#fff2d6}
    .footer{
      display:flex;justify-content:space-between;
      margin-top:12px;padding-top:8px;border-top:1px solid #dfe5ed;
      color:#758196;font-size:8px
    }
    .screen-actions{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}
    .screen-actions button{
      border:0;border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer
    }
    .print-button{background:#d71928;color:#fff}
    .close-button{background:#edf1f5;color:#263247}
    @media print{
      .screen-actions{display:none}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="screen-actions">
      <button class="close-button" onclick="window.close()">Fechar</button>
      <button class="print-button" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>

    <header class="report-header">
      <div class="brand">
        <div class="logo">LD</div>
        <div>
          <h1>Relatório de Auditoria — Estoque Auxiliar</h1>
          <div class="subtitle">Controle de itens livres de débito • REM / Garantia S/R</div>
        </div>
      </div>
      <div class="report-meta">
        <div><strong>Filial:</strong> ${esc(branchLabel || "—")}</div>
        <div><strong>Período:</strong> ${esc(fmtDate(firstDate))} a ${esc(fmtDate(lastDate))}</div>
        <div><strong>Gerado em:</strong> ${esc(generatedAt)}</div>
        <div><strong>Usuário:</strong> ${esc(state.profile?.nome || "—")}</div>
      </div>
    </header>

    <section class="summary">
      <div class="summary-card"><span>Movimentações</span><strong>${rows.length}</strong></div>
      <div class="summary-card"><span>Entradas</span><strong>+${totalEntradas}</strong></div>
      <div class="summary-card"><span>Saídas</span><strong>-${totalSaidas}</strong></div>
      <div class="summary-card"><span>Saldo movimentado</span><strong>${totalEntradas-totalSaidas}</strong></div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th><th>Data</th><th>Tipo</th><th>Código</th><th>Descrição</th>
          <th>Filial</th><th>Localização</th><th>Qtd.</th><th>Documento</th>
          <th>CNPJ emitente</th><th>Natureza/Finalidade</th><th>Responsável</th><th>Anexos</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <footer class="footer">
      <span>Documento gerado pelo Sistema de Controle de Itens Livres de Débito.</span>
      <span>Uso interno • Auditoria e rastreabilidade</span>
    </footer>
  </div>
</body>
</html>`;

    const oldFrame = document.getElementById("auditPrintFrame");
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement("iframe");
    frame.id = "auditPrintFrame";
    frame.setAttribute("title", "Relatório de auditoria para impressão");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";

    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument || frame.contentWindow?.document;
    if (!frameDocument) {
      frame.remove();
      return toast("Não foi possível preparar o relatório para impressão.", "error", "Erro de impressão");
    }

    frameDocument.open();
    frameDocument.write(reportHtml);
    frameDocument.close();

    const printFrame = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();

        setTimeout(() => {
          if (document.body.contains(frame)) frame.remove();
        }, 1500);
      } catch (error) {
        frame.remove();
        toast("Não foi possível abrir a impressão. Tente novamente.", "error", "Erro de impressão");
      }
    };

    if (frame.contentWindow?.document?.readyState === "complete") {
      setTimeout(printFrame, 250);
    } else {
      frame.onload = () => setTimeout(printFrame, 250);
    }
  }

  async function exportAuditExcelPremium() {
    if (!state.movements.length) {
      return toast("Não há movimentações para exportar.", "error", "Relatório vazio");
    }

    if (!window.ExcelJS) {
      return toast(
        "A biblioteca do Excel não foi carregada. Verifique a internet e atualize a página.",
        "error",
        "Excel indisponível"
      );
    }

    const button = $("#exportArchiveButton");
    setLoading(button, true, "Gerando Excel...");

    try {
      const rows = [...state.movements].sort((a,b) => {
        const dateCompare = String(a.data_movimento || "").localeCompare(String(b.data_movimento || ""));
        return dateCompare || String(a.created_at || "").localeCompare(String(b.created_at || ""));
      });

      const totalEntradas = rows
        .filter(m => m.tipo === "entrada" && m.status === "ativo")
        .reduce((sum,m) => sum + Number(m.quantidade || 0), 0);

      const totalSaidas = rows
        .filter(m => m.tipo === "saida" && m.status === "ativo")
        .reduce((sum,m) => sum + Number(m.quantidade || 0), 0);

      const branches = [...new Set(rows.map(m => m.itens?.filial).filter(Boolean))];
      const branchLabel = state.profile?.role === "operador"
        ? state.profile.filial
        : branches.length === 1 ? branches[0] : "Todas as filiais";

      const workbook = new ExcelJS.Workbook();
      workbook.creator = state.profile?.nome || "Sistema de Itens Livres de Débito";
      workbook.lastModifiedBy = workbook.creator;
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.company = "Grupo Monaco";
      workbook.subject = "Auditoria do estoque auxiliar de itens livres de débito";
      workbook.title = "Relatório de Auditoria";
      workbook.description = "Entradas, saídas, documentos e rastreabilidade do estoque auxiliar.";

      const sheet = workbook.addWorksheet("Auditoria", {
        views: [{ state: "frozen", ySplit: 9, xSplit: 0 }]
      });

      sheet.properties.defaultRowHeight = 18;
      sheet.pageSetup = {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25, right: 0.25, top: 0.45,
          bottom: 0.45, header: 0.15, footer: 0.15
        }
      };

      const navy = "FF0B1A2D";
      const navy2 = "FF132B48";
      const red = "FFD71928";
      const green = "FF14805B";
      const lightBlue = "FFEAF0F7";
      const canvas = "FFF5F7FA";
      const line = "FFDDE4ED";
      const white = "FFFFFFFF";
      const text = "FF172033";
      const muted = "FF718096";
      const lightGreen = "FFE7F6EF";
      const lightRed = "FFFDE9EC";

      const columns = [
        { header: "Nº", key: "ordem", width: 7 },
        { header: "Data", key: "data", width: 13 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Código do item", key: "codigo", width: 20 },
        { header: "Descrição", key: "descricao", width: 36 },
        { header: "Filial", key: "filial", width: 20 },
        { header: "Localização", key: "localizacao", width: 15 },
        { header: "Quantidade", key: "quantidade", width: 13 },
        { header: "Nota fiscal", key: "nota", width: 17 },
        { header: "REM", key: "rem", width: 16 },
        { header: "OS", key: "os", width: 16 },
        { header: "CNPJ emitente", key: "cnpj", width: 21 },
        { header: "Natureza / Finalidade", key: "natureza", width: 31 },
        { header: "Chassi", key: "chassi", width: 24 },
        { header: "Placa", key: "placa", width: 13 },
        { header: "Cliente", key: "cliente", width: 25 },
        { header: "Responsável", key: "responsavel", width: 21 },
        { header: "Autorizado por", key: "autorizado", width: 21 },
        { header: "Observações", key: "observacoes", width: 38 },
        { header: "Anexos", key: "anexos", width: 10 },
        { header: "Arquivos anexados", key: "arquivos", width: 34 },
        { header: "Data/hora do registro", key: "data_registro", width: 21 }
      ];
      sheet.columns = columns;

      // Título.
      sheet.mergeCells("A1:W1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "RELATÓRIO DE AUDITORIA — ESTOQUE AUXILIAR";
      titleCell.font = {
        name: "Arial",
        size: 18,
        bold: true,
        color: { argb: white }
      };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      sheet.getRow(1).height = 34;

      sheet.mergeCells("A2:W2");
      const subtitleCell = sheet.getCell("A2");
      subtitleCell.value = "Controle de itens livres de débito • REM / Garantia S/R";
      subtitleCell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FFD4DEEA" }
      };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy2 } };
      subtitleCell.alignment = { horizontal: "left", vertical: "middle" };
      sheet.getRow(2).height = 23;

      // Metadados.
      sheet.mergeCells("A4:F4");
      sheet.mergeCells("G4:L4");
      sheet.mergeCells("M4:R4");
      sheet.mergeCells("S4:W4");

      const firstDate = rows[0]?.data_movimento;
      const lastDate = rows[rows.length - 1]?.data_movimento;
      const generatedAt = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date());

      const metadata = [
        ["A4", `Filial: ${branchLabel || "—"}`],
        ["G4", `Período: ${fmtDate(firstDate)} a ${fmtDate(lastDate)}`],
        ["M4", `Gerado por: ${state.profile?.nome || "—"}`],
        ["S4", `Gerado em: ${generatedAt}`]
      ];

      metadata.forEach(([address, value]) => {
        const cell = sheet.getCell(address);
        cell.value = value;
        cell.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: text }
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: line } },
          bottom: { style: "thin", color: { argb: line } },
          left: { style: "thin", color: { argb: line } },
          right: { style: "thin", color: { argb: line } }
        };
      });
      sheet.getRow(4).height = 26;

      // KPIs.
      const kpis = [
        { range: "A6:E7", label: "TOTAL DE MOVIMENTAÇÕES", value: rows.length, color: navy },
        { range: "G6:K7", label: "ENTRADAS", value: `+${totalEntradas}`, color: green },
        { range: "M6:Q7", label: "SAÍDAS", value: `-${totalSaidas}`, color: red },
        { range: "S6:W7", label: "SALDO MOVIMENTADO", value: totalEntradas-totalSaidas, color: navy2 }
      ];

      kpis.forEach(kpi => {
        sheet.mergeCells(kpi.range);
        const start = kpi.range.split(":")[0];
        const cell = sheet.getCell(start);
        cell.value = `${kpi.label}\n${kpi.value}`;
        cell.font = {
          name: "Arial",
          size: 11,
          bold: true,
          color: { argb: white }
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.color } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: kpi.color } },
          bottom: { style: "thin", color: { argb: kpi.color } },
          left: { style: "thin", color: { argb: kpi.color } },
          right: { style: "thin", color: { argb: kpi.color } }
        };
      });
      sheet.getRow(6).height = 22;
      sheet.getRow(7).height = 25;

      // Header.
      const headerRow = sheet.getRow(9);
      columns.forEach((column, index) => {
        headerRow.getCell(index + 1).value = column.header;
      });
      headerRow.height = 30;
      headerRow.eachCell(cell => {
        cell.font = {
          name: "Arial",
          size: 9,
          bold: true,
          color: { argb: white }
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: navy } },
          bottom: { style: "thin", color: { argb: navy } },
          left: { style: "thin", color: { argb: "FF263A54" } },
          right: { style: "thin", color: { argb: "FF263A54" } }
        };
      });

      rows.forEach((m, index) => {
        const attachments = state.attachments.filter(a => a.movimentacao_id === m.id);
        const dateValue = m.data_movimento
          ? new Date(`${m.data_movimento}T12:00:00`)
          : null;
        const createdValue = m.created_at ? new Date(m.created_at) : null;
        const isExit = m.tipo === "saida";
        const tipoLabel = m.tipo === "entrada" ? "Entrada" : isExit ? "Saída" : "Ajuste";

        const row = sheet.addRow({
          ordem: index + 1,
          data: dateValue,
          tipo: tipoLabel,
          status: m.status || "",
          codigo: String(m.itens?.codigo || ""),
          descricao: m.itens?.descricao || "",
          filial: m.itens?.filial || "",
          localizacao: m.itens?.localizacao || "",
          quantidade: isExit ? -Number(m.quantidade || 0) : Number(m.quantidade || 0),
          nota: String(m.numero_nota || ""),
          rem: String(m.numero_rem || ""),
          os: String(m.numero_os || ""),
          cnpj: String(m.cnpj_emitente || ""),
          natureza: m.natureza_operacao || m.finalidade || "",
          chassi: String(m.chassi || ""),
          placa: m.placa || "",
          cliente: m.cliente || "",
          responsavel: m.responsavel || m.solicitante || "",
          autorizado: m.autorizado_por || "",
          observacoes: m.observacoes || "",
          anexos: attachments.length,
          arquivos: attachments.map(a => a.nome_arquivo).join(" | "),
          data_registro: createdValue
        });

        row.height = 31;
        const zebra = index % 2 === 0 ? white : canvas;

        row.eachCell((cell, colNumber) => {
          cell.font = {
            name: "Arial",
            size: 9,
            color: { argb: text }
          };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
          cell.alignment = {
            horizontal: [1,2,3,4,9,21].includes(colNumber) ? "center" : "left",
            vertical: "middle",
            wrapText: true
          };
          cell.border = {
            bottom: { style: "thin", color: { argb: line } },
            left: { style: "hair", color: { argb: "FFEEF1F5" } },
            right: { style: "hair", color: { argb: "FFEEF1F5" } }
          };
        });

        // Datas.
        row.getCell(2).numFmt = "dd/mm/yyyy";
        row.getCell(23).numFmt = "dd/mm/yyyy hh:mm";

        // Identificadores como texto.
        [5,10,11,12,13,15].forEach(col => {
          row.getCell(col).numFmt = "@";
          row.getCell(col).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        });

        // Tipo e quantidade com cor.
        const typeCell = row.getCell(3);
        typeCell.font = {
          name: "Arial", size: 9, bold: true,
          color: isExit ? red : m.tipo === "entrada" ? green : "9A6500"
        };
        typeCell.fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: isExit ? lightRed : m.tipo === "entrada" ? lightGreen : "FFF1D2" }
        };

        const qtyCell = row.getCell(9);
        qtyCell.font = {
          name: "Arial", size: 10, bold: true,
          color: {
            argb: Number(qtyCell.value) < 0 ? red : green
          }
        };
        qtyCell.numFmt = '+0;-0;0';
      });

      // AutoFilter e impressão.
      sheet.autoFilter = {
        from: { row: 9, column: 1 },
        to: { row: 9 + rows.length, column: columns.length }
      };
      sheet.pageSetup.printTitlesRow = "1:9";
      sheet.headerFooter.oddFooter =
        `&LGrupo Monaco • Uso interno&CRelatório de Auditoria&RPage &P of &N`;

      // Linha final.
      const endRow = 10 + rows.length;
      sheet.mergeCells(`A${endRow}:W${endRow}`);
      const footer = sheet.getCell(`A${endRow}`);
      footer.value = "Documento gerado pelo Sistema de Controle de Itens Livres de Débito — Auditoria e rastreabilidade.";
      footer.font = {
        name: "Arial",
        size: 8,
        italic: true,
        color: { argb: muted }
      };
      footer.alignment = { horizontal: "center", vertical: "middle" };
      footer.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      sheet.getRow(endRow).height = 22;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob(
        [buffer],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `auditoria-estoque-${today()}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast("Relatório Excel premium gerado com sucesso.");
    } catch (error) {
      console.error(error);
      toast(
        error.message || "Não foi possível gerar o arquivo Excel.",
        "error",
        "Erro na exportação"
      );
    } finally {
      setLoading(button, false);
    }
  }

  function exportArchive() {
    const rows = state.movements.map(m => {
      const itemAttachments = state.attachments.filter(a => a.movimentacao_id === m.id);
      return {
        id_movimentacao: m.id,
        data_movimento: m.data_movimento,
        data_registro: m.created_at,
        idade_meses: ageMonths(m.data_movimento),
        tipo: m.tipo,
        status: m.status,
        codigo_item: m.itens?.codigo || "",
        descricao_item: m.itens?.descricao || "",
        filial: m.itens?.filial || "",
        localizacao: m.itens?.localizacao || "",
        quantidade: m.quantidade,
        numero_nota: m.numero_nota || "",
        numero_rem: m.numero_rem || "",
        numero_os: m.numero_os || "",
        cnpj_emitente: m.cnpj_emitente || "",
        natureza_operacao: m.natureza_operacao || "",
        chassi: m.chassi || "",
        placa: m.placa || "",
        cliente: m.cliente || "",
        finalidade: m.finalidade || "",
        responsavel: m.responsavel || "",
        solicitante: m.solicitante || "",
        autorizado_por: m.autorizado_por || "",
        observacoes: m.observacoes || "",
        quantidade_anexos: itemAttachments.length,
        nomes_anexos: itemAttachments.map(a => a.nome_arquivo).join(" | ")
      };
    });

    exportCSV(`backup-completo-auditoria-${today()}.csv`, rows);
  }

  function exportCSV(filename, rows) {
    if (!rows.length) return toast("Não há dados para exportar.","error","Exportação vazia");

    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];

    const excelCell = value => {
      let text = typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? "");

      // Evita execução de fórmulas inseridas por campos de texto.
      if (/^[=+\-@]/.test(text)) text = `'${text}`;

      // Mantém CNPJ, chassi, nota e códigos numéricos longos como texto no Excel.
      if (/^\d{11,}$/.test(text)) {
        return `"=""${text.replace(/"/g,'""')}"""`;
      }

      return `"${text.replace(/"/g,'""')}"`;
    };

    const csv = "\uFEFF" + [
      headers.map(excelCell).join(";"),
      ...rows.map(row => headers.map(header => excelCell(row[header])).join(";"))
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], {
      type:"text/csv;charset=utf-8"
    }));

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  let duplicateSuggestionTimer = null;

  function getEntrySelectedBranch() {
    return $("#entryFilialSelect")?.value || state.profile?.filial || "";
  }

  function findExistingEntryItem(code, branch) {
    const normalizedCode = normalize(String(code || "").replace(/\s+/g, ""));
    if (!normalizedCode || !branch) return null;
    return state.items.find(item =>
      normalize(String(item.codigo || "").replace(/\s+/g, "")) === normalizedCode &&
      item.filial === branch && item.status !== "arquivado"
    ) || null;
  }

  function applyExistingItemSuggestion(item) {
    if (!item) return;
    $("#entryItemMode").value = "existente";
    updateEntryMode();
    $("#entryItemSelect").value = item.id;
    const suggestion = $("#entryDuplicateSuggestion");
    if (suggestion) {
      suggestion.classList.remove("hidden");
      suggestion.innerHTML = `<strong>Item já cadastrado nesta filial.</strong><span>${esc(item.codigo)} — ${esc(item.descricao)} • Saldo atual: ${Number(item.saldo || 0)}. O cadastro existente foi selecionado.</span>`;
    }
  }

  function suggestExistingEntryItem() {
    const input = $("#entryNewCodigo");
    const suggestion = $("#entryDuplicateSuggestion");
    if (!input || $("#entryItemMode")?.value !== "novo") return;
    const item = findExistingEntryItem(input.value, getEntrySelectedBranch());
    if (item) {
      applyExistingItemSuggestion(item);
      toast(`O código ${item.codigo} já possui cadastro nesta filial. Use o item sugerido para registrar apenas a nova entrada.`, "error", "Item já cadastrado");
    } else if (suggestion) {
      suggestion.classList.add("hidden");
      suggestion.innerHTML = "";
    }
  }

  function debounceSuggestExistingEntryItem() {
    clearTimeout(duplicateSuggestionTimer);
    duplicateSuggestionTimer = setTimeout(suggestExistingEntryItem, 450);
  }

  function configureMobileViewport() {
    const update = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
      document.body.classList.toggle("keyboard-open", Boolean(viewport && window.innerHeight - viewport.height > 140));
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    document.addEventListener("focusin", event => {
      if (!event.target.matches("input,select,textarea")) return;
      setTimeout(() => event.target.scrollIntoView({ behavior: "smooth", block: "center" }), 260);
    });
  }

  async function printSignedRomaneioAttachment(attachment) {
    const movement = state.movements.find(m => m.id === attachment.movimentacao_id);
    if (!movement?.signature_data && !movement?.signatureData) {
      return toast("Assinatura digital não encontrada.", "error", "Impressão indisponível");
    }

    const svg = buildSignedRomaneioSvg(
      movement,
      movement.recebedor_nome || movement.receiverName || "—",
      movement.recebedor_documento || movement.receiverDocument || "—",
      movement.signature_data || movement.signatureData
    );

    const oldFrame = document.getElementById("signedRomaneioPrintFrame");
    oldFrame?.remove();
    const frame = document.createElement("iframe");
    frame.id = "signedRomaneioPrintFrame";
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument || frame.contentWindow?.document;
    frameDoc.open();
    frameDoc.write(`<!doctype html><html><head><style>@page{size:A4 portrait;margin:0}html,body{margin:0;width:100%;height:100%}svg{display:block;width:100%;height:auto}</style></head><body>${svg}</body></html>`);
    frameDoc.close();
    frame.onload = () => setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1500);
    }, 250);
  }

  function showView(viewId) {
    $$(".view").forEach(v => v.classList.toggle("active",v.id===viewId));
    $$(".nav-item").forEach(n => n.classList.toggle("active",n.dataset.view===viewId));
    const btn = $(`.nav-item[data-view="${viewId}"]`);
    $("#pageTitle").textContent = btn ? btn.textContent.trim().replace(/^[^\wÀ-ÿ]+/,"") : "Sistema";
    $("#sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function openModal(id) {
    $(`#${id}`)?.classList.add("open");
    $(`#${id}`)?.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    if (id === "exitModal") {
      requestAnimationFrame(() => {
        resizeSignatureCanvas();
        configureSignatureCanvas();
        clearDigitalSignature();
        $("#signatureConsent").checked = false;
      });
    }
  }
  function closeModals() {
    $$(".modal.open").forEach(m => {m.classList.remove("open");m.setAttribute("aria-hidden","true")});
    document.body.style.overflow="";
  }

  function roleName(role) { return ({admin:"Administrador",diretor:"Diretor",gestor:"Gestor",operador:"Operador",auditoria:"Auditoria"})[role] || role; }
  function initials(name) { return String(name).split(/\s+/).slice(0,2).map(n=>n[0]).join("").toUpperCase(); }
  function formatBytes(bytes) {
    const n=Number(bytes||0); if(!n)return"0 B"; const units=["B","KB","MB","GB"]; const i=Math.floor(Math.log(n)/Math.log(1024));
    return `${(n/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
  }
  function translateError(message="") {
    const m = String(message).toLowerCase();
    if (m.includes("auth/invalid-credential") || m.includes("auth/wrong-password") || m.includes("auth/user-not-found") || m.includes("invalid login")) return "E-mail ou senha incorretos.";
    if (m.includes("auth/too-many-requests")) return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
    if (m.includes("permission-denied")) return "Seu perfil não possui permissão para esta operação. Confira as regras do Firestore e o documento users do usuário.";
    if (m.includes("failed-precondition")) return "O Firestore solicitou um índice para esta consulta. Abra o link mostrado no Console do navegador e crie o índice.";
    if (m.includes("item_duplicado") || m.includes("already-exists") || m.includes("duplicate")) return "Este item já possui cadastro nesta filial. Use o cadastro existente para registrar a entrada.";
    if (m.includes("item_nao_encontrado") || m.includes("não encontrado") || m.includes("nao encontrado")) return "Item não encontrado.";
    if (m.includes("saldo insuficiente")) return message;
    if (m.includes("possui movimentações") || m.includes("possui movimentacoes")) return "Este item já possui movimentações e não pode ser excluído. Bloqueie-o pela opção Editar.";
    if (m.includes("network") || m.includes("failed to fetch") || m.includes("unavailable")) return "Não foi possível conectar ao Firebase. Confira sua internet e o firebase-config.js.";
    return message || "Ocorreu um erro inesperado.";
  }

  window.app = {
    synchronizeFirebaseStructure: () => synchronizeFirebaseStructure(true),
    showItem,
    editItem,
    deleteItem,
    openDocument,
    showMovementDocuments,
    printRomaneio,
  };
  document.addEventListener("DOMContentLoaded", boot);
})();