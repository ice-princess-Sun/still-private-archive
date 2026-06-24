"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "正在保存…",
}: {
  children: React.ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 min-w-52 cursor-pointer items-center justify-between gap-8 bg-[#171714] px-6 py-4 text-[#f2f0eb] transition hover:bg-[#343430] disabled:cursor-wait disabled:opacity-60"
    >
      <span className="whitespace-nowrap text-xs font-medium tracking-[0.12em] text-[#f2f0eb]">
        {pending ? pendingText : children}
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-base leading-none text-[#f2f0eb]"
      >
        →
      </span>
    </button>
  );
}
