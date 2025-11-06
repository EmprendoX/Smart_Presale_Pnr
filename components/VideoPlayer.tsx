"use client";

import { useMemo } from "react";

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const embedUrl = useMemo(() => {
    if (!url) return null;

    // YouTube: https://www.youtube.com/watch?v=VIDEO_ID
    const youtubeWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeWatchMatch) {
      return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
    }

    // YouTube: https://www.youtube.com/embed/VIDEO_ID (ya está en formato embed)
    if (url.includes("youtube.com/embed/")) {
      return url;
    }

    // Vimeo: https://vimeo.com/VIDEO_ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Vimeo: https://player.vimeo.com/video/VIDEO_ID (ya está en formato embed)
    if (url.includes("player.vimeo.com/video/")) {
      return url;
    }

    // Si no coincide con ningún formato conocido, retornar null
    return null;
  }, [url]);

  if (!embedUrl) {
    return (
      <div className="rounded-lg border bg-neutral-100 p-4 text-center text-sm text-neutral-600">
        URL de video no válida. Por favor usa una URL de YouTube o Vimeo.
      </div>
    );
  }

  const isYouTube = embedUrl.includes("youtube.com");
  const isVimeo = embedUrl.includes("vimeo.com");

  return (
    <div className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-100">
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video del proyecto"
        />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {isYouTube && "Video de YouTube"}
        {isVimeo && "Video de Vimeo"}
      </p>
    </div>
  );
}

