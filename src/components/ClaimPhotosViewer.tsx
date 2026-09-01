"use client";

import { useState } from "react";
import { getSignedClaimPhotoUrl } from "@/lib/actions/claims";
import Spinner from "./Spinner";
import type { ClaimPhoto } from "@/lib/types";

export default function ClaimPhotosViewer({ photos }: { photos: ClaimPhoto[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (photos.length === 0) return null;

  async function toggle(photo: ClaimPhoto) {
    if (urls[photo.id]) {
      setUrls((prev) => {
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });
      return;
    }
    setLoadingId(photo.id);
    const res = await getSignedClaimPhotoUrl(photo.storage_path);
    setLoadingId(null);
    if (res.url) setUrls((prev) => ({ ...prev, [photo.id]: res.url! }));
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p)}
            disabled={loadingId === p.id}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingId === p.id && <Spinner size={12} />}
            {urls[p.id] ? "Masquer" : "Voir"} photo
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {photos.map(
          (p) =>
            urls[p.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={urls[p.id]}
                alt={p.file_name}
                className="max-h-56 rounded-lg border border-[var(--tts-border)]"
              />
            )
        )}
      </div>
    </div>
  );
}
