import type { Metadata } from "next";

import { validatePublicListeningToken } from "@/lib/listening/service";
import type { PublicListeningAvailability } from "@/lib/listening/types";

import { PublicListeningRoom } from "./PublicListeningRoom";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

function ListeningUnavailable() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 md:p-8">
      <section className="glass-panel w-full max-w-md p-6 text-center md:p-10">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          VEO // PRIVATE LISTENING
        </p>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
          This listening link is unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Ask the sender for a new link.
        </p>
      </section>
    </main>
  );
}

export default async function PublicListeningPage({
  params,
}: {
  params: { token: string };
}) {
  let availability: PublicListeningAvailability | null = null;

  try {
    availability = await validatePublicListeningToken(params.token);
  } catch {
    availability = null;
  }

  if (!availability) {
    return <ListeningUnavailable />;
  }

  return (
    <PublicListeningRoom token={params.token} availability={availability} />
  );
}
