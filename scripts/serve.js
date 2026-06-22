#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listPosts, getPost, createPost } from "../api/posts.js";
import { runWorkflowStep } from "../api/workflow.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_ROOT = join(ROOT, "content");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function resolveContentPath(webPath = "") {
  const cleanPath = String(webPath).replace(/^\/+/, "");
  const filePath = resolve(ROOT, cleanPath);
  const rel = relative(CONTENT_ROOT, filePath);

  if (!rel || rel.startsWith("..") || filePath.includes("\0")) {
    throw new Error("Only files inside content/ can be edited");
  }

  if (!filePath.endsWith(".md")) {
    throw new Error("Only Markdown files can be edited");
  }

  return filePath;
}

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    const method = req.method;

    if (pathname === "/api/posts" && method === "GET") {
      const posts = await listPosts();
      return jsonResponse(res, { posts });
    }

    if (pathname === "/api/posts" && method === "POST") {
      const body = await readBody(req);
      const result = await createPost(body);
      return jsonResponse(res, result, result.success ? 201 : 400);
    }

    if (pathname.startsWith("/api/posts/") && method === "GET") {
      const slug = pathname.replace("/api/posts/", "");
      const post = await getPost(slug);
      if (!post) return jsonResponse(res, { error: "Not found" }, 404);
      return jsonResponse(res, { post });
    }

    if (pathname === "/api/workflow/run" && method === "POST") {
      const body = await readBody(req);
      const { path: postPath, step } = body;
      if (!postPath) return jsonResponse(res, { error: "Missing post path" }, 400);
      try {
        const result = await runWorkflowStep(postPath, step);
        return jsonResponse(res, result, 200);
      } catch (err) {
        return jsonResponse(res, {
          success: false,
          error: err.message || "Workflow failed",
        }, 200);
      }
    }

    if (pathname === "/api/file" && method === "GET") {
      try {
        const filePath = resolveContentPath(url.searchParams.get("path") || "");
        const content = await readFile(filePath, "utf-8");
        return jsonResponse(res, { success: true, content });
      } catch (err) {
        return jsonResponse(res, { success: false, error: err.message }, 400);
      }
    }

    if (pathname === "/api/file" && method === "POST") {
      try {
        const body = await readBody(req);
        const filePath = resolveContentPath(body.path || "");
        await writeFile(filePath, String(body.content || ""), "utf-8");
        return jsonResponse(res, { success: true });
      } catch (err) {
        return jsonResponse(res, { success: false, error: err.message }, 400);
      }
    }

    if (pathname === "/api/status" && method === "GET") {
      const posts = await listPosts();
      const counts = {};
      for (const p of posts) {
        counts[p.status] = (counts[p.status] || 0) + 1;
      }
      return jsonResponse(res, { counts, total: posts.length });
    }

    let filePath;
    if (pathname === "/") {
      filePath = join(ROOT, "index.html");
    } else {
      filePath = join(ROOT, pathname);
    }

    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) throw new Error("Not a file");

      const ext = extname(filePath);
      const mime = MIME[ext] || "application/octet-stream";
      const content = await readFile(filePath);

      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html><head><title>404</title></head>
        <body style="font-family:system-ui;padding:2rem;">
          <h1>404</h1>
          <p>File not found: ${pathname}</p>
          <a href="/">Back to home</a>
        </body></html>
      `);
    }
  });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const PORT = process.env.PORT || 3030;
  const server = createApp();
  server.listen(PORT, () => {
    console.log(`Blogs by Dan running at http://localhost:${PORT}`);
  });
}
