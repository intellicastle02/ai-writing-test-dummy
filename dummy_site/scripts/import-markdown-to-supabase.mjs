import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const contentDir = path.resolve(process.argv[2] ?? "content/posts");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before importing.");
}

function parseMarkdown(raw, filename) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const values = {};

  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!field) continue;
      values[field[1]] = field[2].replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"');
    }
  }

  const slug = values.slug ?? path.basename(filename, ".md");
  const status = values.status === "published" ? "published" : "draft";
  const createdAt = values.created_at ?? new Date().toISOString();

  if (!values.title) throw new Error(`${filename}: title is missing`);
  return {
    slug,
    title: values.title,
    content: match ? raw.slice(match[0].length) : raw,
    status,
    created_at: createdAt,
    updated_at: values.updated_at ?? createdAt,
    published_at: status === "published" ? values.updated_at ?? createdAt : null,
    deleted_at: null,
  };
}

const files = (await fs.readdir(contentDir)).filter((file) => file.endsWith(".md"));
const posts = await Promise.all(
  files.map(async (file) => parseMarkdown(await fs.readFile(path.join(contentDir, file), "utf8"), file))
);
const supabase = createClient(url, secret, { auth: { persistSession: false } });
const { error } = await supabase.from("posts").upsert(posts, { onConflict: "slug" });

if (error) throw error;
console.log(`Imported ${posts.length} posts from ${contentDir}.`);
