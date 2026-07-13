import Link from "next/link";
import { listPublishedPosts } from "@/lib/db";

export default function Home() {
  const posts = listPublishedPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">최근 글</h1>

      {posts.length === 0 ? (
        <p className="text-zinc-500">
          아직 게시된 글이 없습니다. 관리자 페이지에서 새 글을 작성해보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
              <Link href={`/posts/${post.slug}`} className="text-xl font-medium hover:underline">
                {post.title}
              </Link>
              <div className="mt-1 text-sm text-zinc-500">
                {new Date(post.created_at).toLocaleDateString("ko-KR")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
