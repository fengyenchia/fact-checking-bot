import Link from "next/link";
import { IconBrandThreads, IconChevronRight, IconDots, IconHeart, IconMenu2, IconMessageCircle, IconRepeat, IconSearch, IconSend2 } from "@tabler/icons-react";
import { CaseCarousel, type CaseCardData } from "@/components/case-card";
import { featuredPost, posts, type ThreadPost } from "@/data/posts";
import { Avatar } from "./avatar";

const metricIcons = [IconHeart, IconMessageCircle, IconRepeat, IconSend2];

function PostRow({ post, cases }: { post: ThreadPost; cases: CaseCardData[] }) {
  return (
    <article className="grid grid-cols-[2.625rem_minmax(0,1fr)] gap-2.5 border-b border-neutral-200 px-3.5 py-4 sm:gap-3 sm:px-6">
      {post.href ? (
        <Link href={post.href} aria-label={`開啟與 ${post.author} 的聊天室`} className="grid size-11 place-items-center rounded-full"><Avatar className="size-9" /></Link>
      ) : <div className="grid size-11 place-items-center"><Avatar className="size-9" /></div>}
      <div className="min-w-0">
        <div className="flex min-h-6 flex-wrap items-center gap-x-1.5 text-[14px] leading-tight">
          <span className="font-semibold">{post.author}</span>
          {post.topic && <><IconChevronRight aria-hidden className="size-3.5 text-neutral-500" /><span className="font-medium">{post.topic}</span></>}
          <span className="text-xs text-neutral-500">{post.time}</span>
          <IconDots aria-hidden className="ml-auto size-5 shrink-0 text-neutral-500" />
        </div>
        <p className="mt-1 text-[15px] leading-relaxed">{post.text}</p>
        <div aria-hidden className="mt-3 flex items-center gap-4 text-[13px] text-neutral-700 sm:gap-6">
          {metricIcons.map((Icon, i) => <span key={i} className="flex items-center gap-1"><Icon className="size-[21px]" stroke={1.7} />{post.counts[i] || ""}</span>)}
        </div>
        {cases.length > 0 && (
          <div className="mt-4"><CaseCarousel cases={cases} headingAlign="left" /></div>
        )}
      </div>
    </article>
  );
}

export function ThreadsFeed({ cases }: { cases: CaseCardData[] }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="grid h-14 grid-cols-3 items-center px-4">
          <IconMenu2 aria-hidden className="size-6 text-neutral-400" />
          <h1 className="justify-self-center"><IconBrandThreads className="size-9" aria-hidden /><span className="sr-only">Threads</span></h1>
          <IconSearch aria-hidden className="size-6 justify-self-end text-neutral-400" />
        </div>
        <div className="grid h-11 grid-cols-2 text-center text-[15px] font-semibold">
          <span className="grid place-items-center border-b border-black">為你推薦</span>
          <span className="grid place-items-center border-b border-neutral-200 text-neutral-500">追蹤中</span>
        </div>
      </header>
      <main>{posts.map((post) => <PostRow key={post.author} post={post} cases={post === featuredPost ? cases : []} />)}</main>
    </>
  );
}
