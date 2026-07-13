import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          AI 글쓰기 테스트
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            블로그
          </Link>
          <Link href="/admin" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}
