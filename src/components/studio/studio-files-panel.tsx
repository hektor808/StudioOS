import { DownloadButton } from "@/components/studio/download-button";
import type { FileType } from "@/lib/uploads/types";
import type { StudioFile } from "@/lib/studio/types";

export type StudioFilesPanelProps = {
  files: StudioFile[];
};

const FILE_GROUPS: readonly { type: FileType; label: string }[] = [
  { type: "stem", label: "Stems" },
  { type: "mix", label: "Mixes" },
  { type: "master", label: "Masters" },
  { type: "flp", label: "Projects" },
  { type: "zip", label: "Archives" },
  { type: "artwork", label: "Artwork" },
  { type: "other", label: "Other files" },
];

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "Size unavailable";
  }

  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length);
  const size = value / 1024 ** exponent;

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent - 1]}`;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function StudioFilesPanel({ files }: StudioFilesPanelProps) {
  if (files.length === 0) {
    return (
      <section className="glass-panel p-5 sm:p-6" aria-labelledby="files-heading">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Production files
        </p>
        <h2 id="files-heading" className="mt-2 font-heading text-xl font-semibold">
          Production inventory
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          No production files are registered for this track.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel grid gap-6 p-5 sm:p-6" aria-labelledby="files-heading">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Production files
        </p>
        <h2 id="files-heading" className="mt-2 font-heading text-xl font-semibold">
          Production inventory
        </h2>
      </div>

      {FILE_GROUPS.map((group) => {
        const groupFiles = files.filter((file) => file.fileType === group.type);
        if (groupFiles.length === 0) return null;

        return (
          <section key={group.type} aria-labelledby={`file-group-${group.type}`}>
            <h3
              id={`file-group-${group.type}`}
              className="text-sm font-semibold text-foreground"
            >
              {group.label}
            </h3>
            <div className="mt-3 grid gap-3">
              {groupFiles.map((file) => (
                <article
                  key={file.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-background/35 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{file.originalFilename}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(file.sizeBytes)}
                      {file.mimeType ? ` · ${file.mimeType}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Uploaded by {file.uploadedBy.fullName} · {formatCreatedAt(file.createdAt)}
                    </p>
                    <span className="mt-3 inline-flex rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      Production file
                    </span>
                  </div>
                  <DownloadButton
                    recordType="file"
                    recordId={file.id}
                    filename={file.originalFilename}
                  />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
