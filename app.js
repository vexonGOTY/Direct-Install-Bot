(() => {
  const STORAGE_KEYS = {
    history: "direct-install-bot:linksHistory",
    token: "direct-install-bot:githubToken",
    auth: "direct-install-bot:authGate",
  };

  const OWNER = "vexonGOTY";
  const REPO = "Direct-Install-Bot";

  const els = {
    loginScreen: document.getElementById("loginScreen"),
    loginCard: document.getElementById("loginCard"),
    loginPassword: document.getElementById("loginPassword"),
    loginButton: document.getElementById("loginButton"),

    githubRepoDisplay: document.getElementById("githubRepoDisplay"),

    appForm: document.getElementById("appForm"),
    appName: document.getElementById("appName"),
    bundleId: document.getElementById("bundleId"),
    version: document.getElementById("version"),
    folderName: document.getElementById("folderName"),
    ipaFile: document.getElementById("ipaFile"),
    ipaFileLabel: document.getElementById("ipaFileLabel"),
    ipaUrl: document.getElementById("ipaUrl"),
    useCustomUrl: document.getElementById("useCustomUrl"),

    cleanupToggle: document.getElementById("cleanupToggle"),
    cleanupBadge: document.getElementById("cleanupBadge"),
    submitButton: document.getElementById("submitButton"),

    githubToken: document.getElementById("githubToken"),

    statusBar: document.getElementById("statusBar"),
    statusLabel: document.getElementById("statusLabel"),
    githubContext: document.getElementById("githubContext"),

    linksList: document.getElementById("linksList"),
    linksEmptyState: document.getElementById("linksEmptyState"),
    linksCountBadge: document.getElementById("linksCountBadge"),
    clearHistory: document.getElementById("clearHistory"),

    toastRoot: document.getElementById("toastRoot"),
  };

  function safeParseJSON(str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEYS.history) || "[]";
    const items = safeParseJSON(raw, []);
    if (!Array.isArray(items)) return [];
    return items;
  }

  function persistHistory(items) {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items));
  }

  function loadToken() {
    const token = localStorage.getItem(STORAGE_KEYS.token) || "";
    if (els.githubToken) {
      els.githubToken.value = token;
    }
  }

  function persistToken(token) {
    localStorage.setItem(STORAGE_KEYS.token, token.trim());
  }

  function createToast({ title, description, variant = "info" }) {
    if (!els.toastRoot) return;
    const wrapper = document.createElement("div");
    wrapper.className =
      "pointer-events-auto w-full max-w-md rounded-xl border px-3.5 py-2.5 text-xs shadow-lg shadow-black/40 flex items-start gap-2.5 bg-slate-900/95 backdrop-blur border-slate-700/80";

    const colorClasses =
      variant === "success"
        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-100"
        : variant === "error"
        ? "bg-rose-500/10 border-rose-500/60 text-rose-100"
        : variant === "warn"
        ? "bg-amber-500/10 border-amber-500/60 text-amber-50"
        : "bg-slate-900/95 border-slate-700/80 text-slate-100";

    wrapper.className = wrapper.className
      .replace(/bg-[^ ]+/, "")
      .replace(/border-[^ ]+/, "") + ` ${colorClasses}`;

    const badge = document.createElement("div");
    badge.className =
      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/40 text-[10px] font-semibold";
    badge.textContent =
      variant === "success" ? "OK" : variant === "error" ? "!" : "i";

    const body = document.createElement("div");
    body.className = "flex-1";

    const titleEl = document.createElement("div");
    titleEl.className = "font-semibold";
    titleEl.textContent = title;

    const descEl = document.createElement("p");
    descEl.className = "mt-0.5 text-[11px] opacity-90";
    descEl.textContent = description;

    body.appendChild(titleEl);
    body.appendChild(descEl);

    wrapper.appendChild(badge);
    wrapper.appendChild(body);

    // Set transition up front so later opacity/transform changes animate.
    wrapper.style.transition =
      "opacity 150ms ease-out, transform 150ms ease-out";

    els.toastRoot.appendChild(wrapper);
    setTimeout(() => {
      wrapper.classList.add("opacity-0", "-translate-y-1");
      setTimeout(() => {
        wrapper.remove();
      }, 160);
    }, 3800);
  }

  function setStatus(label, phase) {
    if (els.statusLabel) {
      els.statusLabel.textContent = label;
    }
    if (!els.statusBar) return;

    els.statusBar.dataset.phase = phase || "idle";
  }

  function toggleSubmitting(isSubmitting) {
    if (!els.submitButton) return;
    els.submitButton.disabled = isSubmitting;
    if (isSubmitting) {
      els.submitButton.dataset.loading = "true";
      els.submitButton.innerHTML =
        '<span class="loading-dot"></span><span>Working…</span>';
    } else {
      els.submitButton.dataset.loading = "false";
      els.submitButton.innerHTML =
        '<span class="i-lucide-rocket w-4 h-4"></span><span>Dispatch Workflow</span>';
    }
  }

  async function uploadToFilebin(file) {
    const binId =
      "direct-install-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    const safeName = encodeURIComponent(file.name);
    const endpoint = `https://filebin.net/${binId}/${safeName}`;

    const resp = await fetch(endpoint, {
      method: "PUT",
      body: file,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `File upload failed (${resp.status}). ${
          text ? `Response: ${text.slice(0, 140)}` : ""
        }`,
      );
    }

    return endpoint;
  }

  async function triggerWorkflow({
    owner,
    repo,
    token,
    url,
    bundleId,
    version,
    appName,
    cleanupOld,
    folderName,
  }) {
    const endpoint = `https://api.github.com/repos/${encodeURIComponent(
      owner,
    )}/${encodeURIComponent(repo)}/actions/workflows/main.yml/dispatches`;

    const body = {
      ref: "main",
      inputs: {
        url,
        bundleid: bundleId,
        version,
        appname: appName,
        cleanup_old: cleanupOld ? "true" : "false",
        folder_name: cleanupOld ? "" : folderName || "",
      },
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 204) {
      return;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `GitHub workflow dispatch failed (${resp.status}). ${
          text ? `Response: ${text.slice(0, 200)}` : ""
        }`,
      );
    }
  }

  function computeInstallLink({ owner, repo, cleanupOld, folderName }) {
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);

    let manifestPath;
    let encodedManifestPath;

    if (cleanupOld) {
      manifestPath = "manifest.plist";
      encodedManifestPath = "manifest.plist";
    } else {
      manifestPath = `${folderName}/manifest.plist`;
      const encodedFolder = encodeURIComponent(folderName);
      encodedManifestPath = `${encodedFolder}/manifest.plist`;
    }

    const rawUrl = `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/generated/${encodedManifestPath}`;
    const itmsLink =
      "itms-services://?action=download-manifest&url=" + rawUrl;

    return { rawUrl, itmsLink, manifestPath };
  }

  function renderHistoryItem(item) {
    const li = document.createElement("li");
    li.className =
      "rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2.5 flex flex-col gap-1.5";

    const topRow = document.createElement("div");
    topRow.className = "flex items-center justify-between gap-2";

    const left = document.createElement("div");
    left.className = "space-y-0.5";

    const title = document.createElement("div");
    title.className =
      "text-[11px] font-semibold text-slate-100 flex flex-wrap items-center gap-1.5";
    title.textContent = item.appName;

    const badge = document.createElement("span");
    badge.className =
      "inline-flex items-center rounded-full bg-slate-800/90 px-1.5 py-[1px] text-[9px] font-medium text-slate-300";
    badge.textContent = `${item.bundleId} · v${item.version}`;

    title.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "text-[10px] text-slate-400";
    meta.textContent = `generated/${item.manifestPath}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "flex items-center gap-1.5";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className =
      "inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-900 hover:bg-white";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.itmsLink);
        createToast({
          title: "Link copied",
          description: "The itms-services install link is in your clipboard.",
          variant: "success",
        });
      } catch {
        createToast({
          title: "Copy failed",
          description: "Clipboard access was blocked by the browser.",
          variant: "error",
        });
      }
    });

    const installBtn = document.createElement("button");
    installBtn.type = "button";
    installBtn.className =
      "inline-flex items-center justify-center rounded-md bg-indigo-500/90 px-2.5 py-1 text-[10px] font-semibold text-slate-50 hover:bg-indigo-400";
    installBtn.textContent = "Install";
    installBtn.addEventListener("click", () => {
      window.location.href = item.itmsLink;
    });

    right.appendChild(copyBtn);
    right.appendChild(installBtn);

    topRow.appendChild(left);
    topRow.appendChild(right);

    const urlRow = document.createElement("div");
    urlRow.className =
      "mt-0.5 flex items-center justify-between gap-2 text-[10px] text-slate-500";
    const urlSpan = document.createElement("span");
    urlSpan.className =
      "font-mono break-all text-[10px] text-slate-400 max-w-[260px]";
    urlSpan.textContent = item.itmsLink;

    const tsSpan = document.createElement("span");
    tsSpan.className = "text-[10px] text-slate-500";
    tsSpan.textContent = item.createdAtLabel;

    urlRow.appendChild(urlSpan);
    urlRow.appendChild(tsSpan);

    li.appendChild(topRow);
    li.appendChild(urlRow);

    return li;
  }

  function refreshHistoryUI() {
    const history = loadHistory();
    if (!els.linksList || !els.linksEmptyState || !els.linksCountBadge) return;

    els.linksList.innerHTML = "";
    if (!history.length) {
      els.linksEmptyState.classList.remove("hidden");
      els.linksCountBadge.textContent = "0";
      return;
    }

    els.linksEmptyState.classList.add("hidden");
    els.linksCountBadge.textContent = String(history.length);

    history
      .slice()
      .reverse()
      .forEach((item) => {
        els.linksList.appendChild(renderHistoryItem(item));
      });
  }

  function initCleanupToggle() {
    if (!els.cleanupToggle || !els.cleanupBadge) return;

    const updateUI = () => {
      const state = els.cleanupToggle.dataset.state || "off";
      const on = state === "on";
      els.cleanupToggle.setAttribute("aria-pressed", on ? "true" : "false");
      els.cleanupBadge.textContent = on ? "Single latest manifest" : "Keep history";
      if (on) {
        els.cleanupBadge.classList.remove("border-emerald-400/40", "bg-emerald-500/10", "text-emerald-300");
        els.cleanupBadge.classList.add("border-rose-400/50", "bg-rose-500/10", "text-rose-200");
      } else {
        els.cleanupBadge.classList.add("border-emerald-400/40", "bg-emerald-500/10", "text-emerald-300");
        els.cleanupBadge.classList.remove("border-rose-400/50", "bg-rose-500/10", "text-rose-200");
      }
    };

    updateUI();

    els.cleanupToggle.addEventListener("click", () => {
      const current = els.cleanupToggle.dataset.state || "off";
      els.cleanupToggle.dataset.state = current === "on" ? "off" : "on";
      updateUI();
    });
  }

  function initFileInput() {
    if (!els.ipaFile || !els.ipaFileLabel) return;
    els.ipaFile.addEventListener("change", () => {
      const file = els.ipaFile.files && els.ipaFile.files[0];
      if (file) {
        els.ipaFileLabel.textContent = file.name;
      } else {
        els.ipaFileLabel.textContent = "Choose signed .ipa file";
      }
    });
  }

  function initHistoryControls() {
    refreshHistoryUI();
    if (!els.clearHistory) return;
    els.clearHistory.addEventListener("click", () => {
      persistHistory([]);
      refreshHistoryUI();
      createToast({
        title: "History cleared",
        description: "Local list of generated links has been cleared.",
        variant: "success",
      });
    });
  }

  function initCustomUrlToggle() {
    if (!els.useCustomUrl || !els.ipaUrl) return;

    const sync = () => {
      const enabled = els.useCustomUrl.checked;
      els.ipaUrl.disabled = !enabled;
      els.ipaUrl.classList.toggle("opacity-60", !enabled);
      els.ipaUrl.classList.toggle("cursor-not-allowed", !enabled);
    };

    sync();
    els.useCustomUrl.addEventListener("change", sync);
  }

  function initAuthGate() {
    if (!els.loginScreen || !els.loginCard || !els.loginPassword || !els.loginButton) {
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEYS.auth) === "true";
    if (stored) {
      els.loginScreen.classList.add("hidden");
      return;
    }

    const attemptLogin = () => {
      const value = els.loginPassword.value.trim();
      if (value === "1312") {
        localStorage.setItem(STORAGE_KEYS.auth, "true");
        els.loginScreen.classList.add("hidden");
        els.loginPassword.value = "";
      } else {
        els.loginPassword.value = "";
        els.loginCard.classList.remove("shake");
        // retrigger animation
        void els.loginCard.offsetWidth;
        els.loginCard.classList.add("shake");
      }
    };

    els.loginButton.addEventListener("click", (event) => {
      event.preventDefault();
      attemptLogin();
    });

    if (els.loginForm) {
      els.loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        attemptLogin();
      });
    }

    els.loginPassword.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        attemptLogin();
      }
    });
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  function initForm() {
    if (!els.appForm) return;

    els.appForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const owner = OWNER;
      const repoName = REPO;
      const token =
        (els.githubToken && els.githubToken.value.trim()) ||
        localStorage.getItem(STORAGE_KEYS.token) ||
        "";

      if (!token) {
        createToast({
          title: "Missing GitHub token",
          description:
            "Enter a GitHub Personal Access Token with repo and workflow scopes.",
          variant: "error",
        });
        return;
      }

      persistToken(token);

      const appName = els.appName.value.trim();
      const bundleId = els.bundleId.value.trim();
      const version = els.version.value.trim();
      const folderName = els.folderName.value.trim();
      const cleanupOld = (els.cleanupToggle.dataset.state || "off") === "on";

      if (!appName || !bundleId || !version) {
        createToast({
          title: "Missing fields",
          description: "App name, bundle ID, and version are required.",
          variant: "error",
        });
        return;
      }

      if (!cleanupOld && !folderName) {
        createToast({
          title: "Folder name required",
          description:
            "When keeping multiple manifests, please provide a folder name to make the URL deterministic.",
          variant: "warn",
        });
        return;
      }

      const file =
        els.ipaFile.files && els.ipaFile.files.length
          ? els.ipaFile.files[0]
          : null;
      const useCustomUrl = els.useCustomUrl && els.useCustomUrl.checked;
      let url = "";

      if (!file && !useCustomUrl) {
        createToast({
          title: "Missing IPA source",
          description:
            "Upload a signed IPA file or enable and provide a custom IPA URL.",
          variant: "error",
        });
        return;
      }

      if (!file && useCustomUrl) {
        url = els.ipaUrl.value.trim();
        if (!url) {
          createToast({
            title: "Missing custom URL",
            description:
              "Enable and provide a direct IPA URL, or upload a signed IPA file.",
            variant: "error",
          });
          return;
        }
      }

      setStatus("Preparing request…", "dispatch");
      toggleSubmitting(true);

      try {
        if (file) {
          setStatus("Uploading file…", "upload");
          url = await uploadToFilebin(file);
        }

        setStatus("Triggering workflow…", "dispatch");
        await triggerWorkflow({
          owner,
          repo: repoName,
          token,
          url,
          bundleId,
          version,
          appName,
          cleanupOld,
          folderName,
        });

        setStatus("Manifest generation started…", "dispatch");

        const { rawUrl, itmsLink, manifestPath } = computeInstallLink({
          owner,
          repo: repoName,
          cleanupOld,
          folderName: cleanupOld ? "" : folderName,
        });

        const history = loadHistory();
        const createdAt = Date.now();
        const item = {
          appName,
          bundleId,
          version,
          rawUrl,
          itmsLink,
          manifestPath,
          createdAt,
          createdAtLabel: formatTimestamp(createdAt),
        };
        history.push(item);
        persistHistory(history);
        refreshHistoryUI();

        setStatus("Install link ready.", "success");

        createToast({
          title: "Workflow dispatched",
          description:
            "The GitHub Actions workflow was triggered. The install link has been added to the list below.",
          variant: "success",
        });
      } catch (err) {
        console.error(err);
        setStatus("Something went wrong.", "error");
        createToast({
          title: "Action failed",
          description: err && err.message ? err.message : "Unknown error.",
          variant: "error",
        });
      } finally {
        toggleSubmitting(false);
      }
    });
  }

  function init() {
    initAuthGate();
    initCleanupToggle();
    initFileInput();
    initHistoryControls();
    initCustomUrlToggle();
    loadToken();
    initForm();
    setStatus("Idle", "idle");

    const fixedRepoDisplay = `${OWNER}/${REPO}`;
    if (els.githubRepoDisplay) {
      els.githubRepoDisplay.textContent = fixedRepoDisplay;
    }
    if (els.githubContext) {
      els.githubContext.textContent = `Repository: ${fixedRepoDisplay}`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

