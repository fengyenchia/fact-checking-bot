import { Suspense } from "react";
import { connection } from "next/server";
import { ThreadsFeed } from "@/components/threads/feed";
import { ThreadsShell } from "@/components/threads/shell";
import { previewCases } from "@/data/preview-cases";
import { getHomepageCards } from "@/lib/server/retrieval";

async function HomepageFeed() {
  let cases = previewCases;
  if (process.env.DATABASE_URL) {
    await connection();
    try {
      cases = await getHomepageCards();
    } catch (error) {
      console.error("Unable to load homepage cases", error instanceof Error ? error.name : "UnknownError");
      cases = [];
    }
  }
  return <ThreadsFeed cases={cases} />;
}

export default function Home() {
  return (
    <ThreadsShell active="home">
      <Suspense fallback={<ThreadsFeed cases={[]} />}>
        <HomepageFeed />
      </Suspense>
    </ThreadsShell>
  );
}
