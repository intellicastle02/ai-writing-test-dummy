import { requireAdmin } from "@/lib/auth";
import { createPostAction } from "@/app/admin/actions";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">새 글 작성</h1>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          제목을 입력해주세요.
        </p>
      )}

      <form action={createPostAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            제목
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            슬러그(비워두면 자동 생성)
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            placeholder="my-first-post"
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="content" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            본문 (마크다운)
          </label>
          <textarea
            id="content"
            name="content"
            rows={16}
            required
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
            defaultValue="draft"
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
