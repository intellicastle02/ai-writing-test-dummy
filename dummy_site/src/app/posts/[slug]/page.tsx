import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, incrementViewCount } from "@/lib/db";

export const dynamic = "force-dynamic";

function excerpt(markdown: string, length = 140): string {
  const plain = markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}...` : plain;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || post.status !== "published") {
    return {};
  }

  const description = excerpt(post.content);

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/posts/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/posts/${post.slug}`,
      publishedTime: post.created_at,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  incrementViewCount(slug);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">{post.title}</h1>
      <div className="mt-2 text-sm text-zinc-500">
        {new Date(post.created_at).toLocaleDateString("ko-KR")} · 조회수 {post.view_count + 1}
      </div>
      <div className="prose prose-zinc mt-8 max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
