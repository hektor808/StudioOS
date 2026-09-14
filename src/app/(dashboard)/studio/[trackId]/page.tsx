import { notFound } from "next/navigation";

import { ListeningLinkManager } from "@/components/studio/ListeningLinkManager";
import { StudioDetailClient } from "@/components/studio/studio-detail-client";
import { listListeningLinks, listReadyListeningVersions } from "@/lib/listening/service";
import { SupabasePublicEnvironmentError } from "@/lib/supabase/env";
import {
  getStudioComments,
  getStudioTrackDetail,
  getStudioTrackFiles,
  getStudioTrackVersions,
} from "@/lib/studio/queries";

import {
  createListeningLinkAction,
  revokeListeningLinkAction,
} from "@/app/(dashboard)/studio/[trackId]/listening-actions";

type StudioTrackPageProps = {
  params: { trackId: string };
};

export default async function StudioTrackPage({
  params,
}: StudioTrackPageProps) {
  try {
    const track = await getStudioTrackDetail(params.trackId);
    if (!track) notFound();

    const [versions, files, readyListeningVersions, listeningLinks] =
      await Promise.all([
        getStudioTrackVersions(track.id),
        getStudioTrackFiles(track.id),
        listReadyListeningVersions(track.id),
        listListeningLinks(track.id),
      ]);
    const comments = await getStudioComments(versions.map((version) => version.id));

    return (
      <div className="grid gap-5">
        <StudioDetailClient
          track={track}
          versions={versions}
          comments={comments}
          files={files}
        />
        <ListeningLinkManager
          trackId={track.id}
          versions={readyListeningVersions}
          initialLinks={listeningLinks}
          createListeningLinkAction={createListeningLinkAction}
          revokeListeningLinkAction={revokeListeningLinkAction}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof SupabasePublicEnvironmentError) {
      return (
        <section
          className="glass-panel grid gap-3 p-6 sm:p-8"
          aria-labelledby="studio-configuration-heading"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Studio
          </p>
          <h1
            id="studio-configuration-heading"
            className="font-heading text-2xl font-semibold"
          >
            Studio configuration is required
          </h1>
          <p className="text-sm text-muted-foreground">
            Supabase environment is not configured.
          </p>
        </section>
      );
    }

    throw error;
  }
}
