import type { AppSection } from "../layout/AppShell";
import { Card } from "../components/ui/Card";

interface PlaceholderPageProps {
  readonly section: Exclude<AppSection, "today">;
  readonly description: string;
}

export function PlaceholderPage({ section, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8 sm:py-9 xl:px-12">
      <p className="mb-2 text-sm font-medium text-ink-400">Workspace</p>
      <h1 className="text-3xl font-bold capitalize tracking-[-0.045em] sm:text-4xl">{section}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600">{description}</p>
      <Card className="mt-8 grid min-h-80 place-items-center border-dashed p-8 text-center shadow-none">
        <div className="max-w-sm">
          <p className="text-sm font-semibold">Foundation ready</p>
          <p className="mt-2 text-sm leading-6 text-ink-400">
            This workspace is wired into the desktop shell and ready for its product phase.
          </p>
        </div>
      </Card>
    </div>
  );
}
