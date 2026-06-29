const STATUS_ORDER = [
  "idea", "researched", "outlined", "drafted",
  "reviewed", "checked", "approved", "metadata",
  "ready", "published",
];

const STATUS_LABELS = {
  idea: "Idea", researched: "Researched", outlined: "Outlined",
  drafted: "Draft", reviewed: "Reviewed", checked: "Checked",
  approved: "Approved", metadata: "Metadata",
  ready: "Ready", published: "Published",
};

const AGENT_BY_STATUS = {
  idea: "research", researched: "outline", outlined: "draft",
  drafted: "editor", reviewed: "checker", checked: "final-reviewer",
  approved: "metadata", metadata: "publisher",
};

const NEXT_STATUS = {
  idea: "researched", researched: "outlined", outlined: "drafted",
  drafted: "reviewed", reviewed: "checked", checked: "approved",
  approved: "metadata", metadata: "ready", ready: "published",
};

const grid = document.getElementById("post-grid");
const template = document.getElementById("post-card-template");
const newPostForm = document.getElementById("new-post-form");
const composerStatus = document.getElementById("composer-status");
const fileEditor = document.getElementById("file-editor");
const editorTitle = document.getElementById("editor-title");
const editorPath = document.getElementById("editor-path");
const editorContent = document.getElementById("editor-content");
const markdownPreview = document.getElementById("markdown-preview");
const editorStatus = document.getElementById("editor-status");
const paymentPanel = document.getElementById("payment-panel");
const paymentTitle = document.getElementById("payment-title");
const paymentDetails = document.getElementById("payment-details");
const paymentSummary = document.getElementById("payment-summary");
const paymentStatus = document.getElementById("payment-status");
const sendPaymentBtn = document.getElementById("send-payment-btn");
const statusCounts = {};
const businessForm = document.getElementById("business-form");
const knowledgeForm = document.getElementById("knowledge-form");
const trendForm = document.getElementById("trend-form");
const campaignForm = document.getElementById("campaign-form");
const knowledgeBusiness = document.getElementById("knowledge-business");
const campaignBusiness = document.getElementById("campaign-business");
const campaignTrend = document.getElementById("campaign-trend");
const campaignLead = document.getElementById("campaign-lead");
const campaignGrid = document.getElementById("campaign-grid");
const fetchSignalsBtn = document.getElementById("fetch-signals-btn");
const signalSource = document.getElementById("signal-source");
const signalQuery = document.getElementById("signal-query");
const signalList = document.getElementById("signal-list");
const leadSearchForm = document.getElementById("lead-search-form");
const leadGrid = document.getElementById("lead-grid");
const leadBusinessType = document.getElementById("lead-business-type");
const leadSignalPreview = document.getElementById("lead-signal-preview");

let allPosts = [];
let growthItems = { businesses: [], knowledge: [], leads: [], trends: [], campaigns: [], briefs: [], storyboards: [], videoSpecs: [] };
let leadItems = { searches: [], leads: [], outreach: [] };
let leadProviderInfo = { active_provider: "demo-fallback" };
let currentFilter = "all";
let activeEditorPath = "";
let activePayment = null;

const FUJI_CHAIN_ID = "0xa869";
const FUJI_EXPLORER = "https://testnet.snowtrace.io";

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(endpoint, options);
  const text = await res.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      success: false,
      error: `Server returned ${res.status} ${res.statusText}. Restart the dashboard with npm start so the latest API routes are active.`,
    };
  }

  if (!res.ok && !data.error) {
    data.error = `Request failed with ${res.status} ${res.statusText}`;
  }

  return data;
}

function setComposerStatus(message, isError = false) {
  composerStatus.textContent = message;
  composerStatus.className = isError ? "error-text" : "";
}

function setEditorStatus(message, isError = false) {
  editorStatus.textContent = message;
  editorStatus.className = isError ? "error-text" : "";
}

function setStatus(id, message, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "error-text" : "";
}

function setPaymentStatus(message, isError = false) {
  if (!paymentStatus) return;
  paymentStatus.textContent = message;
  paymentStatus.className = isError ? "error-text" : "";
}

function safeText(value) {
  return escapeHtml(value);
}

async function loadPosts() {
  const data = await fetchAPI("/api/posts");
  allPosts = data.posts || [];
  updateCounts();
  renderPosts();
}

async function loadGrowth() {
  growthItems = await fetchAPI("/api/growth");
  renderGrowthOptions();
  renderCampaigns();
}

async function loadLeads() {
  const [items, providers] = await Promise.all([
    fetchAPI("/api/leads"),
    fetchAPI("/api/leads/providers"),
  ]);
  leadItems = items;
  leadProviderInfo = providers;
  renderLeads();
  renderLeadProviderStatus();
}

function updateCounts() {
  const counts = { idea: 0, drafted: 0, reviewed: 0, ready: 0, published: 0 };
  for (const p of allPosts) {
    const s = p.status;
    if (s === "idea" || s === "researched" || s === "outlined") counts.idea++;
    else if (s === "drafted") counts.drafted++;
    else if (s === "reviewed" || s === "checked" || s === "approved" || s === "metadata") counts.reviewed++;
    else if (s === "ready") counts.ready++;
    else if (s === "published") counts.published++;
  }
  for (const [key, val] of Object.entries(counts)) {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = val;
  }
}

function getPostActions(post) {
  const actions = [];
  const status = post.status;
  const isPublished = status === "published";

  if (!isPublished) {
    actions.push({
      label: "Open",
      action: "open",
      href: post.web_path || post.path,
      class: "action-open",
    });
  }

  for (const link of post.output_links || []) {
    const isQuestions = link.label === "Questions";
    actions.push({
      label: isQuestions ? "Answer Questions" : link.label,
      action: isQuestions ? "edit-file" : "open",
      href: link.web_path,
      link,
      class: "action-open",
    });
  }

  if (!isPublished && AGENT_BY_STATUS[status]) {
    const agent = AGENT_BY_STATUS[status];
    actions.push({
      label: `Run ${STATUS_LABELS[status] || status} → ${STATUS_LABELS[NEXT_STATUS[status]] || NEXT_STATUS[status]}`,
      action: "workflow",
      agent,
      class: "action-workflow",
    });
  }

  if (status === "ready") {
    actions.push({
      label: "Publish",
      action: "publish",
      class: "action-publish",
    });
  }

  if (isPublished) {
    actions.push({
      label: "View",
      action: "open",
      href: post.web_path || post.path,
      class: "action-open",
    });
  }

  actions.push({
    label: "Refresh status",
    action: "refresh",
    class: "action-refresh",
  });

  return actions;
}

async function runWorkflow(post, agent) {
  const card = document.querySelector(`[data-slug="${post.slug}"]`);
  const outputArea = card?.querySelector(".workflow-output");
  if (outputArea) {
    outputArea.style.display = "block";
    outputArea.textContent = "Running workflow...";
  }

  const result = await fetchAPI("/api/workflow/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: post.path, step: agent }),
  });

  if (outputArea) {
    const details = [result.output, result.error].filter(Boolean).join("\n").trim();
    outputArea.textContent = result.success
      ? (details || "Workflow completed successfully.")
      : `Error: ${details || "Unknown error"}`;
  }

  await loadPosts();
}

async function publishPost(post) {
  const card = document.querySelector(`[data-slug="${post.slug}"]`);
  const outputArea = card?.querySelector(".workflow-output");

  if (!confirm(`Publish "${post.title}"? This will move it to content/published/.`)) return;

  if (outputArea) {
    outputArea.style.display = "block";
    outputArea.textContent = "Publishing...";
  }

  const result = await fetchAPI("/api/workflow/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: post.path, step: "publish" }),
  });

  if (outputArea) {
    outputArea.textContent = result.success
      ? "Published successfully!"
      : `Error: ${result.error || "Unknown"}`;
    setTimeout(() => { outputArea.style.display = "none"; }, 5000);
  }

  await loadPosts();
}

async function openEditor(link) {
  activeEditorPath = link.web_path;
  editorTitle.textContent = link.label ? `Edit ${link.label}` : "Edit file";
  editorPath.textContent = link.web_path;
  editorContent.value = "";
  renderMarkdownPreview("");
  fileEditor.hidden = false;
  setEditorStatus("Loading...");

  const data = await fetchAPI(`/api/file?path=${encodeURIComponent(link.web_path)}`);
  if (!data.success) {
    setEditorStatus(data.error || "Could not load file.", true);
    return;
  }

  editorContent.value = data.content || "";
  renderMarkdownPreview(editorContent.value);
  setEditorStatus("Edit the markdown on the left. The designed preview updates on the right.");
  editorContent.focus();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(value) {
  const links = [];
  let html = escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, text, href) => {
      const token = `@@LINK_${links.length}@@`;
      links.push(`<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`);
      return token;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  links.forEach((link, index) => {
    html = html.replace(`@@LINK_${index}@@`, link);
  });
  return html;
}

function stripFrontMatter(markdown) {
  return String(markdown || "").replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

function flushList(html, listItems) {
  if (!listItems.length) return;
  html.push("<ul>");
  for (const item of listItems) html.push(`<li>${renderInlineMarkdown(item)}</li>`);
  html.push("</ul>");
  listItems.length = 0;
}

function renderMarkdownPreview(markdown) {
  if (!markdownPreview) return;
  const body = stripFrontMatter(markdown);
  if (!body) {
    markdownPreview.innerHTML = `<p class="preview-empty">Markdown preview will appear here.</p>`;
    return;
  }

  const html = [];
  const listItems = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushList(html, listItems);
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList(html, listItems);
      flushParagraph();
      html.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      listItems.push(ordered[1]);
      continue;
    }

    flushList(html, listItems);
    paragraph.push(line);
  }

  flushList(html, listItems);
  flushParagraph();
  markdownPreview.innerHTML = html.join("");
}

function createPostCard(post) {
  const clone = template.content.cloneNode(true);
  const article = clone.querySelector(".post-card");
  article.dataset.slug = post.slug;
  article.dataset.status = post.status;

  const dateEl = clone.querySelector(".post-date");
  if (post.date) {
    try {
      dateEl.textContent = new Intl.DateTimeFormat("en", {
        month: "short", day: "numeric", year: "numeric",
      }).format(new Date(`${post.date}T00:00:00`));
    } catch {
      dateEl.textContent = post.date;
    }
  }

  const styleEl = clone.querySelector(".post-style");
  if (post.writing_style) {
    styleEl.textContent = post.writing_style;
  }

  const titleLink = clone.querySelector(".post-title-link");
  titleLink.textContent = post.title;
  titleLink.href = post.web_path || post.path;

  const summary = clone.querySelector(".post-summary");
  summary.textContent = post.summary || "No summary yet.";

  const tagRow = clone.querySelector(".tag-row");
  if (post.tags && post.tags.length) {
    tagRow.innerHTML = post.tags.map((t) => `<span class="tag">${t}</span>`).join("");
  }

  const statusEl = clone.querySelector(".status");
  statusEl.textContent = STATUS_LABELS[post.status] || post.status;
  statusEl.className = `status ${post.status}`;

  const actionsContainer = clone.querySelector(".action-buttons");
  const actions = getPostActions(post);

  for (const action of actions) {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.className = `action-btn ${action.class}`;
    btn.title = action.label;

    if (action.action === "open") {
      btn.onclick = () => window.open(action.href, "_blank");
    } else if (action.action === "workflow") {
      btn.onclick = () => runWorkflow(post, action.agent);
    } else if (action.action === "edit-file") {
      btn.onclick = () => openEditor(action.link);
    } else if (action.action === "publish") {
      btn.onclick = () => publishPost(post);
    } else if (action.action === "refresh") {
      btn.onclick = () => loadPosts();
    }

    actionsContainer.appendChild(btn);
  }

  return article;
}

function renderPosts() {
  const fragment = document.createDocumentFragment();
  const filtered = currentFilter === "all"
    ? allPosts
    : allPosts.filter((p) => p.status === currentFilter);

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No posts yet. Click New Post to create your first idea.";
    fragment.appendChild(empty);
  } else {
    for (const post of filtered) {
      fragment.appendChild(createPostCard(post));
    }
  }

  grid.innerHTML = "";
  grid.appendChild(fragment);
}

function optionHtml(items, emptyLabel) {
  if (!items.length) return `<option value="">${emptyLabel}</option>`;
  return items.map((item) => `<option value="${item.slug}">${item.title || item.name || item.slug}</option>`).join("");
}

function renderGrowthOptions() {
  const businessOptions = optionHtml(growthItems.businesses || [], "Create a business first");
  const trendOptions = optionHtml(growthItems.trends || [], "Save a trend first");
  const leadOptions = `<option value="">No specific lead</option>${optionHtml(growthItems.leads || [], "No leads found")}`;
  if (knowledgeBusiness) knowledgeBusiness.innerHTML = businessOptions;
  if (campaignBusiness) campaignBusiness.innerHTML = businessOptions;
  if (campaignTrend) campaignTrend.innerHTML = trendOptions;
  if (campaignLead) campaignLead.innerHTML = leadOptions;
}

function renderCampaigns() {
  if (!campaignGrid) return;
  const campaigns = growthItems.campaigns || [];
  if (!campaigns.length) {
    campaignGrid.innerHTML = `<p class="empty-state">No campaigns yet. Generate a brief from a business and trend.</p>`;
    return;
  }

  campaignGrid.innerHTML = campaigns.map((campaign) => {
    const slug = campaign.slug;
    const briefPath = `/content/briefs/${slug}.md`;
    const storyboardPath = `/content/storyboards/${slug}.md`;
    const videoPath = `/content/video-specs/${slug}.md`;
    const campaignPath = campaign.web_path;
    const promise = campaign.campaign_promise || "Campaign generated from selected business, trend, and available knowledge.";
    const asset = campaign.primary_asset || "Campaign brief and follow-up plan";
    const audience = campaign.audience || campaign.goal || "Target audience";
    const targetLead = campaign.target_lead || "No specific lead attached";
    const canPay = campaign.price && campaign.payment_address && /avalanche|usdc|avax/i.test(campaign.payment_method || "");
    return `
      <article class="post-card campaign-card">
        <div class="post-meta">
          <span>${safeText(campaign.channel || "Channel")}</span>
          <span>${safeText(campaign.goal || "Goal")}</span>
        </div>
        <h3><button class="link-button post-title-link" data-open-md="${campaignPath}" data-open-label="Campaign">${safeText(campaign.title)}</button></h3>
        <p class="post-summary">${safeText(promise)}</p>
        <dl class="campaign-details">
          <div><dt>Lead</dt><dd>${safeText(targetLead)}</dd></div>
          <div><dt>Audience</dt><dd>${safeText(audience)}</dd></div>
          <div><dt>Asset</dt><dd>${safeText(asset)}</dd></div>
          <div><dt>Payment</dt><dd>${campaign.price ? `${safeText(campaign.price)} ${safeText(campaign.currency || "KES")} via ${safeText(campaign.payment_method || "manual")}` : "Not set"}</dd></div>
        </dl>
        <div class="post-actions">
          <span class="status ready">${safeText(campaign.status || "draft")}</span>
          <div class="action-buttons">
            <button class="action-btn action-open" data-open-md="${briefPath}" data-open-label="Brief">Brief</button>
            <button class="action-btn action-open" data-open-md="${storyboardPath}" data-open-label="Storyboard">Storyboard</button>
            <button class="action-btn action-open" data-open-md="${videoPath}" data-open-label="Video Spec">Video Spec</button>
            <button class="action-btn action-open" data-open-md="${campaignPath}" data-open-label="Campaign">Campaign</button>
            ${canPay ? `<button class="action-btn action-pay" data-pay-slug="${slug}">Pay</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");

  campaignGrid.querySelectorAll("[data-open-md]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openEditor({ web_path: btn.dataset.openMd, label: btn.dataset.openLabel });
    });
  });
  campaignGrid.querySelectorAll("[data-pay-slug]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const campaign = campaigns.find((item) => item.slug === btn.dataset.paySlug);
      openPaymentPanel(campaign);
    });
  });
}

function normalizeAddress(value) {
  const address = String(value || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(address) ? address : "";
}

function parseTokenAmount(value, decimals = 6) {
  const [wholeRaw, fractionRaw = ""] = String(value || "0").trim().split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const fraction = fractionRaw.replace(/\D/g, "").slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(fraction || "0");
}

function toHex(value) {
  return `0x${BigInt(value).toString(16)}`;
}

function erc20TransferData(to, amount) {
  const method = "a9059cbb";
  const paddedTo = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${method}${paddedTo}${paddedAmount}`;
}

async function switchToFuji() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FUJI_CHAIN_ID }],
    });
  } catch (err) {
    if (err.code !== 4902) throw err;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: FUJI_CHAIN_ID,
        chainName: "Avalanche Fuji Testnet",
        nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
        rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
        blockExplorerUrls: [FUJI_EXPLORER],
      }],
    });
  }
}

function openPaymentPanel(campaign) {
  if (!campaign || !paymentPanel) return;
  activePayment = campaign;
  const token = normalizeAddress(campaign.payment_token);
  const recipient = normalizeAddress(campaign.payment_address);
  const currency = campaign.currency || "USDC";
  const needsToken = /usdc|erc-20|token/i.test(`${campaign.payment_method || ""} ${currency}`);
  paymentTitle.textContent = `Pay ${campaign.title}`;
  paymentDetails.textContent = "Avalanche Fuji testnet";
  paymentSummary.innerHTML = `
    <dl class="campaign-details">
      <div><dt>Amount</dt><dd>${safeText(campaign.price)} ${safeText(currency)}</dd></div>
      <div><dt>Recipient</dt><dd>${recipient || "Invalid or missing 0x address"}</dd></div>
      <div><dt>Token</dt><dd>${token || (needsToken ? "USDC token contract required" : "Native AVAX")}</dd></div>
      <div><dt>Use</dt><dd>${safeText(campaign.campaign_promise || "Campaign payment or bounty reward")}</dd></div>
    </dl>
  `;
  setPaymentStatus(recipient ? "Ready to connect wallet." : "Add a valid Avalanche C-Chain payment address first.", !recipient);
  paymentPanel.hidden = false;
}

async function sendActivePayment() {
  if (!activePayment) return;
  if (!window.ethereum) {
    setPaymentStatus("No injected wallet found. Install Core or MetaMask.", true);
    return;
  }

  const recipient = normalizeAddress(activePayment.payment_address);
  const token = normalizeAddress(activePayment.payment_token);
  const price = String(activePayment.price || "").trim();
  const currency = String(activePayment.currency || "USDC").trim();
  const needsToken = /usdc|erc-20|token/i.test(`${activePayment.payment_method || ""} ${currency}`);

  if (!recipient) {
    setPaymentStatus("Payment address must be a valid 0x address.", true);
    return;
  }
  if (!price || Number(price) <= 0) {
    setPaymentStatus("Payment amount must be greater than zero.", true);
    return;
  }
  if (needsToken && !token) {
    setPaymentStatus("USDC payments need a Fuji ERC-20 token contract address.", true);
    return;
  }

  try {
    setPaymentStatus("Connecting wallet...");
    const [from] = await window.ethereum.request({ method: "eth_requestAccounts" });
    await switchToFuji();

    setPaymentStatus("Waiting for wallet confirmation...");
    let txHash;
    if (token) {
      txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from,
          to: token,
          data: erc20TransferData(recipient, parseTokenAmount(price, 6)),
        }],
      });
    } else {
      txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from,
          to: recipient,
          value: toHex(parseTokenAmount(price, 18)),
        }],
      });
    }

    setPaymentStatus(`Sent. Tx: ${txHash}`);
    paymentSummary.insertAdjacentHTML("beforeend", `<p class="tx-link"><a href="${FUJI_EXPLORER}/tx/${txHash}" target="_blank" rel="noreferrer">View transaction</a></p>`);
  } catch (err) {
    setPaymentStatus(err.message || "Payment failed.", true);
  }
}

function renderLeadProviderStatus() {
  const el = document.getElementById("lead-provider-status");
  if (!el) return;
  const provider = leadProviderInfo.active_provider || "demo-fallback";
  const details = provider === "demo-fallback"
    ? "Live keys not visible to the server. Add SERPAPI_KEY or APIFY_TOKEN + APIFY_ACTOR_ID, then restart."
    : `Live provider active: ${provider}.`;
  el.textContent = details;
}

async function previewLeadSignals() {
  if (!leadBusinessType || !leadSignalPreview) return;
  const businessType = leadBusinessType.value.trim();
  if (businessType.length < 3) {
    leadSignalPreview.innerHTML = "";
    return;
  }

  const signals = await fetchAPI(`/api/leads/signals?business_type=${encodeURIComponent(businessType)}`);
  leadSignalPreview.innerHTML = `
    <article class="signal-item">
      <strong>Market signals for ${businessType}</strong>
      <span>${(signals.trends || []).slice(0, 5).join(" · ")}</span>
      <p>${(signals.angles || []).slice(0, 3).join(" ")}</p>
    </article>
  `;
}

function renderLeads() {
  if (!leadGrid) return;
  const leads = leadItems.leads || [];
  if (!leads.length) {
    leadGrid.innerHTML = `<p class="empty-state">No leads yet. Search by business type, city, and your offer.</p>`;
    return;
  }

  leadGrid.innerHTML = leads.map((lead) => {
    const outreach = (leadItems.outreach || []).find((item) => item.lead === lead.slug);
    return `
      <article class="post-card">
        <div class="post-meta">
          <span>${lead.city || "City"}</span>
          <span>${lead.business_type || "Business"}</span>
        </div>
        <h3><a class="post-title-link" href="${lead.web_path}" target="_blank">${lead.title}</a></h3>
        <p class="post-summary">Undiscovered score ${lead.undiscovered_score || "-"}/5 · Rating ${lead.rating || "?"} · Reviews ${lead.reviews || "?"}${lead.gps ? ` · GPS ${lead.gps}` : ""}</p>
        <div class="tag-row">
          <span class="tag">${lead.status || "new"}</span>
          <span class="tag">${lead.email ? "email found" : "email needed"}</span>
          <span class="tag">${lead.website ? "website found" : "website needed"}</span>
        </div>
        <div class="post-actions">
          <span class="status ready">${lead.status || "new"}</span>
          <div class="action-buttons">
            <button class="action-btn action-open" data-open-md="${lead.web_path}" data-open-label="Lead">Lead</button>
            <button class="action-btn action-open" data-open-md="${outreach?.web_path || `/content/outreach/${lead.slug}.md`}" data-open-label="Outreach">Outreach</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  leadGrid.querySelectorAll("[data-open-md]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openEditor({ web_path: btn.dataset.openMd, label: btn.dataset.openLabel });
    });
  });
}

function fillTrendForm(signal) {
  if (!trendForm) return;
  trendForm.elements.title.value = signal.title || "";
  trendForm.elements.source.value = signal.source || "manual";
  trendForm.elements.url.value = signal.url || "";
  trendForm.elements.text.value = signal.text || signal.title || "";
  setStatus("trend-status", "Signal copied into trend form. Review it, then save.");
}

function renderSignals(signals = []) {
  if (!signalList) return;
  if (!signals.length) {
    signalList.innerHTML = `<p class="empty-state">No signals found. Try a broader query or paste a trend manually.</p>`;
    return;
  }

  signalList.innerHTML = signals.slice(0, 8).map((signal, index) => `
    <article class="signal-item">
      <strong>${signal.title}</strong>
      <span>${signal.source}${signal.publishedAt ? ` · ${signal.publishedAt.slice(0, 10)}` : ""}</span>
      <p>${(signal.text || "").slice(0, 180)}</p>
      <button type="button" class="action-btn action-open" data-signal-index="${index}">Use Signal</button>
    </article>
  `).join("");

  signalList.querySelectorAll("[data-signal-index]").forEach((btn) => {
    btn.addEventListener("click", () => fillTrendForm(signals[Number(btn.dataset.signalIndex)]));
  });
}

async function fetchSignals() {
  const source = signalSource?.value || "gdelt";
  const query = signalQuery?.value || "Kenya SME founder business";
  const looksLikeUrl = /^https?:\/\//i.test(query.trim());

  if (looksLikeUrl && source !== "rss" && source !== "webpage") {
    setStatus("signal-status", "For website URLs, choose Website page. Use GDELT for search terms like 'Kenya blockchain SME payments'.", true);
    renderSignals([]);
    return;
  }

  const params = new URLSearchParams({ source });
  if (source === "rss") params.set("feed", query);
  else params.set("query", query);

  setStatus("signal-status", "Fetching signals...");
  const result = await fetchAPI(`/api/growth/signals?${params.toString()}`);
  if (!result.success) {
    setStatus("signal-status", result.error || "Could not fetch signals.", true);
    renderSignals([]);
    return;
  }

  setStatus("signal-status", `${result.signals.length} signal(s) found.`);
  renderSignals(result.signals);
}

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderPosts();
  });
});

document.getElementById("refresh-btn").addEventListener("click", loadPosts);

document.getElementById("new-post-btn").addEventListener("click", () => {
  newPostForm.hidden = false;
  newPostForm.querySelector("input[name='title']").focus();
});

document.getElementById("close-composer-btn").addEventListener("click", () => {
  newPostForm.hidden = true;
  setComposerStatus("");
});

document.getElementById("close-editor-btn").addEventListener("click", () => {
  fileEditor.hidden = true;
  activeEditorPath = "";
  setEditorStatus("");
});

document.getElementById("close-payment-btn")?.addEventListener("click", () => {
  paymentPanel.hidden = true;
  activePayment = null;
  setPaymentStatus("");
});

sendPaymentBtn?.addEventListener("click", sendActivePayment);

document.getElementById("save-editor-btn").addEventListener("click", async () => {
  if (!activeEditorPath) return;
  setEditorStatus("Saving...");

  const result = await fetchAPI("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: activeEditorPath,
      content: editorContent.value,
    }),
  });

  if (!result.success) {
    setEditorStatus(result.error || "Could not save file.", true);
    return;
  }

  setEditorStatus("Saved. Run the next workflow step from the card.");
  await loadPosts();
});

if (editorContent) {
  editorContent.addEventListener("input", () => renderMarkdownPreview(editorContent.value));
}

newPostForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setComposerStatus("Saving...");

  const formData = new FormData(newPostForm);
  const payload = Object.fromEntries(formData.entries());

  const result = await fetchAPI("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    setComposerStatus(result.error || "Could not save post.", true);
    return;
  }

  setComposerStatus("Saved to content/ideas/.");
  newPostForm.reset();
  currentFilter = "all";
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector(".filter-btn[data-filter='all']").classList.add("active");
  await loadPosts();
});

async function submitGrowthForm(form, endpoint, statusId, successMessage) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  setStatus(statusId, "Saving...");

  const result = await fetchAPI(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    setStatus(statusId, result.error || "Request failed.", true);
    return;
  }

  setStatus(statusId, successMessage);
  form.reset();
  await loadGrowth();
}

async function submitLeadSearch(event) {
  event.preventDefault();
  const formData = new FormData(leadSearchForm);
  const payload = Object.fromEntries(formData.entries());
  setStatus("lead-status", "Finding leads...");

  const result = await fetchAPI("/api/leads/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    setStatus("lead-status", result.error || "Could not find leads.", true);
    return;
  }

  setStatus("lead-status", `${result.leads.length} lead(s) saved. Provider: ${result.provider}.`);
  leadSearchForm.reset();
  await loadLeads();
}

if (businessForm) {
  businessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGrowthForm(businessForm, "/api/growth/businesses", "business-status", "Business saved.");
  });
}

if (knowledgeForm) {
  knowledgeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGrowthForm(knowledgeForm, "/api/growth/knowledge", "knowledge-status", "Knowledge added.");
  });
}

if (trendForm) {
  trendForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGrowthForm(trendForm, "/api/growth/trends", "trend-status", "Trend saved.");
  });
}

if (campaignForm) {
  campaignForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGrowthForm(campaignForm, "/api/growth/campaigns", "campaign-status", "Campaign generated.");
  });
}

if (fetchSignalsBtn) {
  fetchSignalsBtn.addEventListener("click", fetchSignals);
}

if (leadSearchForm) {
  leadSearchForm.addEventListener("submit", submitLeadSearch);
}

if (leadBusinessType) {
  leadBusinessType.addEventListener("input", () => {
    clearTimeout(leadBusinessType._previewTimer);
    leadBusinessType._previewTimer = setTimeout(previewLeadSignals, 250);
  });
}

loadPosts();
loadGrowth();
loadLeads();

setInterval(loadPosts, 30000);
setInterval(loadGrowth, 30000);
setInterval(loadLeads, 30000);
