import Link from "next/link";

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
      {message}
    </p>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NavBar() {
  return (
    <nav className="flex gap-4 text-sm border-b border-neutral-200 dark:border-neutral-800 pb-3">
      <Link href="/radar" className="hover:underline">
        Radar
      </Link>
      <Link href="/insights" className="hover:underline">
        근거
      </Link>
      <Link href="/" className="hover:underline">
        대시보드
      </Link>
      <Link href="/ideas" className="hover:underline">
        아이디어
      </Link>
      <Link href="/planning" className="hover:underline">
        기획
      </Link>
    </nav>
  );
}
