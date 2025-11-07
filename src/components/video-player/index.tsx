import * as dashjs from 'dashjs';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { uniqueId } from 'lodash';
import { serverHost } from '@/server/training-server';

export function getBilibiliProxy(bilibiliUrl: string): string {
  if (!bilibiliUrl) return `${serverHost}/proxy/bilibili/video-manifest?bvid=`;
  try {
    // Prefer using the URL API to correctly extract the pathname segments
    const urlObj = new URL(bilibiliUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const bvid = parts.length > 0 ? parts[parts.length - 1] : '';
    return `${serverHost}/proxy/bilibili/video-manifest?bvid=${encodeURIComponent(bvid)}`;
  } catch (e) {
    // Fallback for relative URLs or non-standard inputs
    const parts = bilibiliUrl.split('/').filter(Boolean);
    const bvid = parts.length > 0 ? parts[parts.length - 1] : '';
    return `${serverHost}/proxy/bilibili/video-manifest?bvid=${encodeURIComponent(bvid)}`;
  }
}

export type VideoProgress = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
};

export type VideoPlayerHandle = {
  getProgress: () => VideoProgress;
};

type VideoPlayerProps = {
  url?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const VideoPlayer = forwardRef<VideoPlayerHandle | null, VideoPlayerProps>(function VideoPlayer(props, ref) {
  const playerIdRef = useRef<string>(uniqueId('video-'));
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any | null>(null);
  const mpdUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const videoEl = document.getElementById(playerIdRef.current) as HTMLVideoElement | null;
    videoElRef.current = videoEl;

    // cleanup helper
    const cleanup = () => {
      try {
        if (playerRef.current) {
          try { playerRef.current.reset(); } catch (_) {}
          playerRef.current = null;
        }
        if (mpdUrlRef.current) {
          URL.revokeObjectURL(mpdUrlRef.current);
          mpdUrlRef.current = null;
        }
      } catch (e) {
        console.warn('VideoPlayer cleanup error', e);
      }
    };

    if (!props.url || !videoEl) {
      cleanup();
      return;
    }

    let aborted = false;
    // create dash player
    const player = dashjs.MediaPlayer().create();
    playerRef.current = player;

    fetch(getBilibiliProxy(props.url))
      .then(res => res.json())
      .then(data => {
        if (aborted) return;
        const xmlString = data?.data?.xml ?? '';
        const xmlBlob = new Blob([xmlString], { type: "application/dash+xml" });
        const newMpdUrl = URL.createObjectURL(xmlBlob);
        mpdUrlRef.current = newMpdUrl;
        if (videoEl) {
          player.initialize(videoEl, newMpdUrl, false);
        }
      })
      .catch(error => {
        console.error("Failed to fetch MPD:", error);
      });

    return () => {
      aborted = true;
      cleanup();
    };
  }, [props.url]);

  useImperativeHandle(ref, () => ({
    getProgress: () => {
      const el = videoElRef.current;
      if (!el) {
        return { currentTime: 0, duration: 0, paused: true, ended: false };
      }
      return {
        currentTime: Number(el.currentTime || 0),
        duration: Number(el.duration || 0),
        paused: el.paused,
        ended: el.ended,
      };
    }
  }), []);

  return <video id={playerIdRef.current} controls style={{ width: '100%', borderRadius: '1em', ...props.style }} className={props.className}></video>;
});