import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "blog.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

const db = global.__db ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  global.__db = db;
}

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type Post = {
  id: number;
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
  view_count: number;
  created_at: string;
  updated_at: string;
};

export function listPublishedPosts(): Post[] {
  return db
    .prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC")
    .all() as Post[];
}

export function listAllPosts(): Post[] {
  return db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all() as Post[];
}

export function getPostBySlug(slug: string): Post | undefined {
  return db.prepare("SELECT * FROM posts WHERE slug = ?").get(slug) as Post | undefined;
}

export function getPostById(id: number): Post | undefined {
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post | undefined;
}

export function incrementViewCount(slug: string): void {
  db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE slug = ?").run(slug);
}

export function createPost(input: {
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
}): number {
  const result = db
    .prepare(
      "INSERT INTO posts (slug, title, content, status) VALUES (@slug, @title, @content, @status)"
    )
    .run(input);
  return result.lastInsertRowid as number;
}

export function updatePost(
  id: number,
  input: { title: string; content: string; status: "draft" | "published" }
): void {
  db.prepare(
    "UPDATE posts SET title = @title, content = @content, status = @status, updated_at = datetime('now') WHERE id = @id"
  ).run({ ...input, id });
}

export function deletePost(id: number): void {
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
}

export default db;
