import { revalidatePath } from "next/cache";
import { createPost, getPostBySlug, getUniqueSlug } from "@/lib/db";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request): Promise<Response> {
  const expectedKey = process.env.AUTOMATION_API_KEY;
  if (!expectedKey) {
    return Response.json(
      { error: "AUTOMATION_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (providedKey !== expectedKey) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String((body as Record<string, unknown>).title ?? "").trim();
  const content = String((body as Record<string, unknown>).content ?? "");
  const rawSlug = String((body as Record<string, unknown>).slug ?? "").trim();
  const status = (body as Record<string, unknown>).status === "published" ? "published" : "draft";

  if (!title) {
    return Response.json({ error: "title is required." }, { status: 400 });
  }

  // Explicit slugs are treated as a stable identifier: if it already exists,
  // report the conflict instead of silently renaming, so retried automation
  // requests don't create duplicate posts under a suffixed slug.
  let slug: string;
  if (rawSlug) {
    slug = slugify(rawSlug);
    const existing = await getPostBySlug(slug);
    if (existing) {
      return Response.json(
        { error: "slug already exists.", id: existing.id, slug: existing.slug },
        { status: 409 }
      );
    }
  } else {
    slug = await getUniqueSlug(slugify(title));
  }
  const id = await createPost({ slug, title, content, status, source: "automation" });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${slug}`);

  return Response.json({ id, slug, status }, { status: 201 });
}
