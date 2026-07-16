import { revalidatePath } from "next/cache";
import { getPostById, updatePost } from "@/lib/db";
import { authorizeAutomationRequest } from "@/lib/automation-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/automation/posts/[id]">
): Promise<Response> {
  const authError = authorizeAutomationRequest(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const current = await getPostById(id);
  if (!current) {
    return Response.json({ error: "Post not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const title = record.title !== undefined ? String(record.title).trim() : current.title;
  const content = record.content !== undefined ? String(record.content) : current.content;
  const status =
    record.status === "published" || record.status === "draft" ? record.status : current.status;

  if (!title) {
    return Response.json({ error: "title cannot be empty." }, { status: 400 });
  }
  if (status !== "draft" && status !== "published") {
    return Response.json({ error: "status must be draft or published." }, { status: 400 });
  }

  await updatePost(id, { title, content, status });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${current.slug}`);

  return Response.json({ id, slug: current.slug, status }, { status: 200 });
}
