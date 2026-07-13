import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPostById } from "@/lib/db";
import { updatePostAction } from "@/app/admin/actions";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const post = getPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">글 수정</h1>

      <form action={updatePostAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={post.id} />
        <div>
          <label htmlFor="title" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            제목
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={post.title}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <p className="text-sm text-zinc-500">슬러그: {post.slug} (수정 불가)</p>
        <div>
          <label htmlFor="content" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            본문 (마크다운)
          </label>
          <textarea
            id="content"
            name="content"
            rows={16}
            required
            defaultValue={post.content}
            className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            상태
          </label>
          <select
            id="status"
            name="status"
            defaultValue={post.status}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="draft">초안</option>
            <option value="published">게시</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-2 w-fit rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          저장
        </button>
      </form>
    </div>
  );
}
