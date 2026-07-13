import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "posts");
const GITHUB_CONTENT_DIR = process.env.GITHUB_CONTENT_DIR ?? "dummy_site/content/posts";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "main";

export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

type PostInput = {
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
};

type Frontmatter = Omit<Post, "id" | "content">;

function ensureContentDir(): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function postPath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.md`);
}

function githubPath(slug: string): string {
  return `${GITHUB_CONTENT_DIR.replace(/\/$/, "")}/${slug}.md`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function escapeFrontmatter(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseFrontmatter(fileContent: string): { data: Partial<Frontmatter>; content: string } {
  if (!fileContent.startsWith("---\n")) {
    return { data: {}, content: fileContent };
  }

  const end = fileContent.indexOf("\n---", 4);
  if (end === -1) {
    return { data: {}, content: fileContent };
  }

  const rawFrontmatter = fileContent.slice(4, end);
  const content = fileContent.slice(end + 5).replace(/^\n/, "");
  const data: Partial<Frontmatter> = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"').replace(/\\\\/g, "\\");

    if (key === "slug") data.slug = value;
    if (key === "title") data.title = value;
    if (key === "status" && (value === "draft" || value === "published")) data.status = value;
    if (key === "created_at") data.created_at = value;
    if (key === "updated_at") data.updated_at = value;
  }

  return { data, content };
}

function serializePost(input: PostInput, createdAt: string, updatedAt: string): string {
  return [
    "---",
    `slug: "${escapeFrontmatter(input.slug)}"`,
    `title: "${escapeFrontmatter(input.title)}"`,
    `status: "${input.status}"`,
    `created_at: "${createdAt}"`,
    `updated_at: "${updatedAt}"`,
    "---",
    "",
    input.content.trimEnd(),
    "",
  ].join("\n");
}

function readPostFile(filePath: string): Post | undefined {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontmatter(raw);
  const slug = data.slug ?? path.basename(filePath, ".md");
  const createdAt = data.created_at ?? nowIso();
  const updatedAt = data.updated_at ?? createdAt;

  if (!data.title) return undefined;

  return {
    id: slug,
    slug,
    title: data.title,
    content,
    status: data.status ?? "draft",
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function listPostFiles(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(CONTENT_DIR, file));
}

function sortPosts(posts: Post[]): Post[] {
  return posts.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function listAllPosts(): Post[] {
  return sortPosts(listPostFiles().map(readPostFile).filter((post): post is Post => Boolean(post)));
}

export function listPublishedPosts(): Post[] {
  return listAllPosts().filter((post) => post.status === "published");
}

export function getPostBySlug(slug: string): Post | undefined {
  const filePath = postPath(slug);
  if (!fs.existsSync(filePath)) return undefined;
  return readPostFile(filePath);
}

export function getPostById(id: string): Post | undefined {
  return getPostBySlug(id);
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) return undefined;

  return { token, owner, repo };
}

async function githubRequest<T>(url: string, init: RequestInit): Promise<T> {
  const config = githubConfig();
  if (!config) {
    throw new Error("GitHub credentials are not configured.");
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function getGithubFileSha(slug: string): Promise<string | undefined> {
  const config = githubConfig();
  if (!config) return undefined;

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${githubPath(slug)}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) return undefined;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { sha?: string };
  return data.sha;
}

function base64Encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

async function commitPostToGithub(
  input: PostInput,
  fileContent: string,
  message: string,
  sha?: string
): Promise<void> {
  const config = githubConfig();
  if (!config) {
    throw new Error("GitHub credentials are not configured.");
  }

  const body: {
    message: string;
    content: string;
    branch: string;
    sha?: string;
    committer?: { name: string; email: string };
  } = {
    message,
    content: base64Encode(fileContent),
    branch: GITHUB_BRANCH,
    sha,
  };

  const committerName = process.env.GITHUB_COMMIT_AUTHOR_NAME;
  const committerEmail = process.env.GITHUB_COMMIT_AUTHOR_EMAIL;
  if (committerName && committerEmail) {
    body.committer = { name: committerName, email: committerEmail };
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${githubPath(input.slug)}`;
  await githubRequest(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function deletePostFromGithub(slug: string, sha: string): Promise<void> {
  const config = githubConfig();
  if (!config) {
    throw new Error("GitHub credentials are not configured.");
  }

  const body: {
    message: string;
    branch: string;
    sha: string;
    committer?: { name: string; email: string };
  } = {
    message: `Delete post: ${slug}`,
    branch: GITHUB_BRANCH,
    sha,
  };

  const committerName = process.env.GITHUB_COMMIT_AUTHOR_NAME;
  const committerEmail = process.env.GITHUB_COMMIT_AUTHOR_EMAIL;
  if (committerName && committerEmail) {
    body.committer = { name: committerName, email: committerEmail };
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${githubPath(slug)}`;
  await githubRequest(url, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

function writeLocalPost(input: PostInput, createdAt: string, updatedAt: string): void {
  ensureContentDir();
  fs.writeFileSync(postPath(input.slug), serializePost(input, createdAt, updatedAt), "utf8");
}

function deleteLocalPost(slug: string): void {
  const filePath = postPath(slug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function canWriteLocally(): boolean {
  return !githubConfig() && process.env.NODE_ENV !== "production";
}

export async function createPost(input: PostInput): Promise<string> {
  const createdAt = nowIso();
  const fileContent = serializePost(input, createdAt, createdAt);

  if (githubConfig()) {
    await commitPostToGithub(input, fileContent, `Create post: ${input.title}`);
  } else if (canWriteLocally()) {
    writeLocalPost(input, createdAt, createdAt);
  } else {
    throw new Error("Configure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to create posts.");
  }

  return input.slug;
}

export async function updatePost(
  id: string,
  input: { title: string; content: string; status: "draft" | "published" }
): Promise<void> {
  const current = getPostById(id);
  if (!current) return;

  const nextInput = { ...input, slug: current.slug };
  const updatedAt = nowIso();
  const fileContent = serializePost(nextInput, current.created_at, updatedAt);

  if (githubConfig()) {
    const sha = await getGithubFileSha(current.slug);
    await commitPostToGithub(nextInput, fileContent, `Update post: ${input.title}`, sha);
  } else if (canWriteLocally()) {
    writeLocalPost(nextInput, current.created_at, updatedAt);
  } else {
    throw new Error("Configure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to update posts.");
  }
}

export async function deletePost(id: string): Promise<void> {
  const current = getPostById(id);
  if (!current) return;

  if (githubConfig()) {
    const sha = await getGithubFileSha(current.slug);
    if (sha) await deletePostFromGithub(current.slug, sha);
  } else if (canWriteLocally()) {
    deleteLocalPost(current.slug);
  } else {
    throw new Error("Configure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to delete posts.");
  }
}
