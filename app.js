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
const editorStatus = document.getElementById("editor-status");
const statusCounts = {};

let allPosts = [];
let currentFilter = "all";
let activeEditorPath = "";

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

async function loadPosts() {
  const data = await fetchAPI("/api/posts");
  allPosts = data.posts || [];
  updateCounts();
  renderPosts();
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
  editorTitle.textContent = `Edit ${link.label}`;
  editorPath.textContent = link.web_path;
  editorContent.value = "";
  fileEditor.hidden = false;
  setEditorStatus("Loading...");

  const data = await fetchAPI(`/api/file?path=${encodeURIComponent(link.web_path)}`);
  if (!data.success) {
    setEditorStatus(data.error || "Could not load file.", true);
    return;
  }

  editorContent.value = data.content || "";
  setEditorStatus("Add your answers, save, then run the next workflow step.");
  editorContent.focus();
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

loadPosts();

setInterval(loadPosts, 30000);
