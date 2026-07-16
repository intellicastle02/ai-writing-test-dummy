"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  verifyCredentials,
  setAdminSession,
  clearAdminSession,
  requireAdmin,
} from "@/lib/auth";
import {
  createPost as dbCreatePost,
  updatePost as dbUpdatePost,
  deletePost as dbDeletePost,
  getPostBySlug,
} from "@/lib/db";
import { slugify } from "@/lib/slugify";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logout() {
  await clearAdminSession();
  redirect("/admin/login");
}

async function uniqueSlug(candidate: string): Promise<string> {
  if (!(await getPostBySlug(candidate))) return candidate;
  return `${candidate}-${Date.now().toString(36)}`;
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";

  if (!title) {
    redirect("/admin/new?error=title");
  }

  const slug = await uniqueSlug(slugify(rawSlug || title));
  await dbCreatePost({ slug, title, content, status });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${slug}`);
  redirect("/admin");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";

  if (!id || !title) {
    return;
  }

  await dbUpdatePost(id, { title, content, status });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/posts/[slug]", "page");
  redirect("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await dbDeletePost(id);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/posts/[slug]", "page");
  }

  redirect("/admin");
}
