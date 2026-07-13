"use client";

export function ConfirmActionButton({
  action,
  children,
  confirmText,
  className = "interactive-link cursor-pointer border-0 bg-transparent p-0",
}: {
  action: () => void | Promise<void>;
  children: React.ReactNode;
  confirmText: string;
  className?: string;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={(event) => {
          if (!window.confirm(confirmText)) event.preventDefault();
        }}
      >
        {children}
      </button>
    </form>
  );
}
