"use client";

export function DeleteEntryButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <button
        className="cursor-pointer text-[#8c453a] hover:underline"
        onClick={(event) => {
          if (!window.confirm("确定删除这篇图文和对应照片吗？此操作无法撤销。")) {
            event.preventDefault();
          }
        }}
      >
        删除
      </button>
    </form>
  );
}
