import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const contentDir = path.resolve(process.argv[2] ?? "content/posts");
const outputFile = path.resolve(
  process.argv[3] ?? "supabase/migrations/202607160002_import_existing_posts.sql"
);

function sql(value) {
  return value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
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
    content: (match ? raw.slice(match[0].length) : raw).replace(/\r\n?/g, "\n"),
    status,
    createdAt,
    updatedAt: values.updated_at ?? createdAt,
    publishedAt: status === "published" ? values.updated_at ?? createdAt : null,
  };
}

const files = (await fs.readdir(contentDir)).filter((file) => file.endsWith(".md")).sort();
const posts = await Promise.all(
  files.map(async (file) => parseMarkdown(await fs.readFile(path.join(contentDir, file), "utf8"), file))
);
const values = posts.map(
  (post) =>
    `  (${[
      post.slug,
      post.title,
      post.content,
      post.status,
      post.createdAt,
      post.updatedAt,
      post.publishedAt,
    ]
      .map(sql)
      .join(", ")})`
);
const migration = `-- Generated from content/posts/*.md. Safe to re-run: slug is the conflict key.\n\ninsert into public.posts (slug, title, content, status, created_at, updated_at, published_at)\nvalues\n${values.join(",\n")}\non conflict (slug) do update set\n  title = excluded.title,\n  content = excluded.content,\n  status = excluded.status,\n  created_at = excluded.created_at,\n  updated_at = excluded.updated_at,\n  published_at = excluded.published_at,\n  deleted_at = null;\n`;

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, migration, "utf8");
console.log(`Generated ${outputFile} with ${posts.length} posts.`);
