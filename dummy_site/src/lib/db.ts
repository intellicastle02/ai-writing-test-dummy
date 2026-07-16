import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PostStatus = "draft" | "published" | "deleted";

export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: PostStatus;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

export type PostInput = {
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
  source?: string;
};

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(`Missing ${name}. Configure it in Vercel and .env.local.`);
  }
  return value;
}

function projectUrl(): string {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function publicClient(): SupabaseClient {
  return createClient(
    projectUrl(),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function adminClient(): SupabaseClient {
  return createClient(
    projectUrl(),
    requiredEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function fail(operation: string, error: { message: string }): never {
  throw new Error(`Supabase ${operation} failed: ${error.message}`);
}

export async function listAllPosts(): Promise<Post[]> {
  const { data, error } = await adminClient()
    .from("posts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) fail("list posts", error);
  return (data ?? []) as Post[];
}

export async function listPublishedPosts(): Promise<Post[]> {
  const { data, error } = await publicClient()
    .from("posts")
    .select("*")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) fail("list published posts", error);
  return (data ?? []) as Post[];
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | undefined> {
  const { data, error } = await publicClient()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) fail("read published post", error);
  return (data as Post | null) ?? undefined;
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const { data, error } = await adminClient()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) fail("read post", error);
  return (data as Post | null) ?? undefined;
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const { data, error } = await adminClient()
    .from("posts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) fail("read post", error);
  return (data as Post | null) ?? undefined;
}

export async function createPost(input: PostInput): Promise<string> {
  const { data, error } = await adminClient()
    .from("posts")
    .insert({
      ...input,
      source: input.source ?? "admin",
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) fail("create post", error);
  return data.id as string;
}

export async function getUniqueSlug(candidate: string): Promise<string> {
  if (!(await getPostBySlug(candidate))) return candidate;
  return `${candidate}-${Date.now().toString(36)}`;
}

export async function updatePost(
  id: string,
  input: { title: string; content: string; status: "draft" | "published" }
): Promise<void> {
  const current = await getPostById(id);
  if (!current) return;

  const publishedAt =
    input.status === "published" ? current.published_at ?? new Date().toISOString() : null;
  const { error } = await adminClient()
    .from("posts")
    .update({ ...input, published_at: publishedAt })
    .eq("id", id);

  if (error) fail("update post", error);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await adminClient()
    .from("posts")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) fail("delete post", error);
}
