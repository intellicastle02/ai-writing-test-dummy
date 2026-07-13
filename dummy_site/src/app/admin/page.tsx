import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllPosts } from "@/lib/db";
import { logout, deletePostAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const posts = listAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">관리자 대시보드</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            새 글 작성
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-500">작성된 글이 없습니다.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">제목</th>
              <th className="py-2">상태</th>
              <th className="py-2">조회수</th>
              <th className="py-2">작성일</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-3">
                  <Link href={`/admin/${post.id}/edit`} className="hover:underline">
                    {post.title}
                  </Link>
                </td>
                <td className="py-3">
                  <span
                    className={
                      post.status === "published"
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }
                  >
                    {post.status === "published" ? "게시됨" : "초안"}
                  </span>
                </td>
                <td className="py-3">{post.view_count}</td>
                <td className="py-3 text-zinc-500">
                  {new Date(post.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="py-3 text-right">
                  <form action={deletePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
