// ============================================================
//  TRYLA SITES — panel del CRM para crear/editar los micrositios
//  de cada restaurante (logo, fotos, menu, contacto) y publicarlos
//  en subdominio.thetryla.com
// ============================================================
(function () {
  let sites = [];
  let editingId = null;
  // Guarda las URLs ya subidas mientras se edita, para no perderlas
  // si el usuario no vuelve a elegir un archivo.
  let currentLogoUrl = "";
  let currentHeroUrl = "";
  let currentGallery = [];

  const $ = (id) => document.getElementById(id);

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function menuRowHtml(item) {
    item = item || {};
    return `
      <div class="field-row menu-row">
        <div class="field"><label>Platillo</label><input class="mName" type="text" placeholder="Taco al pastor" value="${escapeHtml(item.name)}"></div>
        <div class="field" style="max-width:110px;"><label>Precio</label><input class="mPrice" type="text" placeholder="3.50" value="${escapeHtml(item.price)}"></div>
        <div class="field"><label>Descripcion</label><input class="mDesc" type="text" placeholder="Opcional" value="${escapeHtml(item.desc)}"></div>
        <div class="field" style="max-width:90px;"><label>&nbsp;</label><button type="button" class="btnRemoveMenuRow">Quitar</button></div>
      </div>`;
  }

  function addMenuRow(item) {
    const wrap = $("sMenuRows");
    const div = document.createElement("div");
    div.innerHTML = menuRowHtml(item);
    const row = div.firstElementChild;
    row.querySelector(".btnRemoveMenuRow").addEventListener("click", () => row.remove());
    wrap.appendChild(row);
  }

  function readMenuRows() {
    return Array.from(document.querySelectorAll("#sMenuRows .menu-row"))
      .map((row) => ({
        name: row.querySelector(".mName").value.trim(),
        price: row.querySelector(".mPrice").value.trim(),
        desc: row.querySelector(".mDesc").value.trim(),
      }))
      .filter((m) => m.name);
  }

  function resetForm() {
    editingId = null;
    currentLogoUrl = "";
    currentHeroUrl = "";
    currentGallery = [];
    $("sitesFormTitle").textContent = "Nuevo sitio web";
    $("sName").value = "";
    $("sSubdomain").value = "";
    $("sSubdomain").dataset.autoSlug = "1";
    $("sTagline").value = "";
    $("sDescription").value = "";
    $("sLogoFile").value = "";
    $("sHeroFile").value = "";
    $("sGalleryFile").value = "";
    $("sLogoPreviewWrap").style.display = "none";
    $("sHeroPreviewWrap").style.display = "none";
    $("sGalleryPreview").innerHTML = "";
    $("sMenuRows").innerHTML = "";
    addMenuRow();
    $("sPhone").value = "";
    $("sEmail").value = "";
    $("sAddress").value = "";
    $("sHours").value = "";
    $("sInstagram").value = "";
    $("sFacebook").value = "";
    $("sTiktok").value = "";
    $("sPublished").checked = false;
    $("sKitIncluded").checked = true;
    $("btnCancelEditSite").style.display = "none";
    $("sitesFormMsg").textContent = "";
  }

  function fillGalleryPreview() {
    const wrap = $("sGalleryPreview");
    if (!currentGallery.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = "Fotos actuales: " + currentGallery
      .map((u, i) => `<a href="${escapeHtml(u)}" target="_blank">#${i + 1}</a>`)
      .join(" &middot; ");
  }

  function loadSiteIntoForm(site) {
    editingId = site.id;
    currentLogoUrl = site.logo_url || "";
    currentHeroUrl = site.hero_image_url || "";
    currentGallery = Array.isArray(site.gallery) ? site.gallery.slice() : [];

    $("sitesFormTitle").textContent = "Editar sitio — " + site.restaurant_name;
    $("sName").value = site.restaurant_name || "";
    $("sSubdomain").value = site.subdomain || "";
    $("sSubdomain").dataset.autoSlug = "0";
    $("sTagline").value = site.tagline || "";
    $("sDescription").value = site.description || "";
    $("sTemplate").value = site.template || "kit-classic";

    $("sLogoFile").value = "";
    $("sHeroFile").value = "";
    $("sGalleryFile").value = "";
    $("sLogoPreviewWrap").style.display = currentLogoUrl ? "" : "none";
    $("sLogoPreview").href = currentLogoUrl;
    $("sHeroPreviewWrap").style.display = currentHeroUrl ? "" : "none";
    $("sHeroPreview").href = currentHeroUrl;
    fillGalleryPreview();

    $("sMenuRows").innerHTML = "";
    (Array.isArray(site.menu) && site.menu.length ? site.menu : [{}]).forEach(addMenuRow);

    $("sPhone").value = site.phone || "";
    $("sEmail").value = site.email || "";
    $("sAddress").value = site.address || "";
    $("sHours").value = site.hours || "";
    $("sInstagram").value = site.instagram || "";
    $("sFacebook").value = site.facebook || "";
    $("sTiktok").value = site.tiktok || "";
    $("sPublished").checked = !!site.published;
    $("sKitIncluded").checked = !!site.kit_included;

    $("btnCancelEditSite").style.display = "";
    $("sitesFormMsg").textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function statusPill(published) {
    return published
      ? '<span style="color:#1a8a4a;font-weight:700;">Publicado</span>'
      : '<span style="color:#9AA0AF;">Borrador</span>';
  }

  function renderSitesTable() {
    const q = ($("sitesSearch").value || "").trim().toLowerCase();
    const tbody = $("sitesTable");
    const filtered = sites.filter((s) =>
      !q || (s.restaurant_name || "").toLowerCase().includes(q) || (s.subdomain || "").toLowerCase().includes(q)
    );
    tbody.innerHTML = filtered.length
      ? filtered.map((s) => `
        <tr>
          <td>${escapeHtml(s.restaurant_name)}</td>
          <td><a href="https://${escapeHtml(s.subdomain)}.thetryla.com" target="_blank">${escapeHtml(s.subdomain)}.thetryla.com</a></td>
          <td>${escapeHtml(s.template)}</td>
          <td>${statusPill(s.published)}</td>
          <td>${s.updated_at ? new Date(s.updated_at).toLocaleDateString() : ""}</td>
          <td>
            <button type="button" data-edit="${escapeHtml(s.id)}">Editar</button>
            <button type="button" data-portal="${escapeHtml(s.subdomain)}" data-name="${escapeHtml(s.restaurant_name)}">Portal cliente</button>
            <button type="button" data-del="${escapeHtml(s.id)}">Borrar</button>
          </td>
        </tr>`).join("")
      : '<tr><td colspan="6" style="text-align:center; color:#7c8aa6;">Sin sitios todavia</td></tr>';

    tbody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const site = sites.find((s) => s.id === btn.dataset.edit);
        if (site) loadSiteIntoForm(site);
      });
    });
    tbody.querySelectorAll("[data-portal]").forEach((btn) => {
      btn.addEventListener("click", () => sharePortalLink(btn.dataset.portal, btn.dataset.name));
    });
    tbody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Borrar este sitio? Esta accion no se puede deshacer.")) return;
        try {
          await window.TrylaSites.remove(btn.dataset.del);
          if (editingId === btn.dataset.del) resetForm();
          await refresh();
        } catch (e) {
          alert("No se pudo borrar: " + (e.message || e));
        }
      });
    });
  }

  // ===== Portal del cliente: link privado para que edite su propio sitio =====
  async function sharePortalLink(subdomain, restaurantName) {
    if (!window.ClientPortal || !window.ClientPortal.ready) {
      alert("El portal de cliente requiere estar conectado a la nube (Supabase).");
      return;
    }
    try {
      const token = await window.ClientPortal.generate(restaurantName, subdomain);
      const link = `https://thetryla.app/?portal=${token}`;
      try {
        await navigator.clipboard.writeText(link);
        alert("Link del portal de cliente copiado al portapapeles:\n" + link);
      } catch (e) {
        prompt("Copia este link para darle acceso al cliente:", link);
      }
    } catch (e) {
      alert("No se pudo generar el portal de cliente: " + (e.message || e));
    }
  }

  async function refresh() {
    try {
      sites = await window.TrylaSites.list();
    } catch (e) {
      console.warn("[TrylaSites] No se pudo listar sitios:", e);
      sites = [];
    }
    renderSitesTable();
  }

  async function uploadIfChosen(inputEl, subdomain) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return null;
    return window.TrylaSites.uploadImage(file, subdomain);
  }

  async function handleSave() {
    const msg = $("sitesFormMsg");
    const name = $("sName").value.trim();
    const subdomain = slugify($("sSubdomain").value.trim());
    if (!name || !subdomain) {
      msg.textContent = "Falta el nombre del restaurante o el subdominio.";
      return;
    }

    const btn = $("btnSaveSite");
    btn.disabled = true;
    btn.textContent = "Guardando...";
    msg.textContent = "";

    try {
      const newLogo = await uploadIfChosen($("sLogoFile"), subdomain);
      const newHero = await uploadIfChosen($("sHeroFile"), subdomain);

      let gallery = currentGallery.slice();
      const galleryFiles = Array.from($("sGalleryFile").files || []);
      for (const file of galleryFiles) {
        const url = await window.TrylaSites.uploadImage(file, subdomain);
        gallery.push(url);
      }

      const site = {
        id: editingId || undefined,
        subdomain: subdomain,
        restaurant_name: name,
        tagline: $("sTagline").value.trim(),
        description: $("sDescription").value.trim(),
        logo_url: newLogo || currentLogoUrl || "",
        hero_image_url: newHero || currentHeroUrl || "",
        gallery: gallery,
        menu: readMenuRows(),
        hours: $("sHours").value.trim(),
        phone: $("sPhone").value.trim(),
        email: $("sEmail").value.trim(),
        address: $("sAddress").value.trim(),
        instagram: $("sInstagram").value.trim(),
        facebook: $("sFacebook").value.trim(),
        tiktok: $("sTiktok").value.trim(),
        template: $("sTemplate").value,
        kit_included: $("sKitIncluded").checked,
        published: $("sPublished").checked,
      };
      if (!site.id) delete site.id;

      const saved = await window.TrylaSites.save(site);
      msg.style.color = "#1a8a4a";
      msg.textContent = "Sitio guardado ✓  —  " + (saved.published ? `en linea en https://${saved.subdomain}.thetryla.com` : "guardado como borrador");
      await refresh();
      loadSiteIntoForm(saved);
    } catch (e) {
      msg.style.color = "#DC2626";
      msg.textContent = "No se pudo guardar: " + (e.message || e);
    } finally {
      btn.disabled = false;
      btn.textContent = "Guardar sitio";
    }
  }

  function init() {
    if (!$("tab-sites")) return; // markup no presente en esta version del index.html

    addMenuRow();

    $("sName").addEventListener("input", () => {
      const subEl = $("sSubdomain");
      if (subEl.dataset.autoSlug !== "0") subEl.value = slugify($("sName").value);
    });
    $("sSubdomain").addEventListener("input", () => {
      $("sSubdomain").dataset.autoSlug = "0";
    });

    $("btnAddMenuRow").addEventListener("click", () => addMenuRow());
    $("btnSaveSite").addEventListener("click", handleSave);
    $("btnCancelEditSite").addEventListener("click", resetForm);
    $("sitesSearch").addEventListener("input", renderSitesTable);

    resetForm();
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
