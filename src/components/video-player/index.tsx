import * as dashjs from 'dashjs';
import { useEffect } from 'react';
import { useState } from 'react';
import { uniqueId } from 'lodash';
import { serverHost } from '@/server/training-server';

export function getBilibiliProxy(bilibiliUrl: string): string {
  const s = bilibiliUrl.split('/');
  const bvid = s[s.length - 2];
  return `${serverHost}/proxy/bilibili/video-manifest?bvid=${bvid}`;
}


export function VideoPlayer(props: { url?: string, className?: string, style?: React.CSSProperties }) {
  const playerId = useState(uniqueId('video-'))[0];

  useEffect(() => {
    if (props.url) {
      // This will ensure the dashjs library is loaded and the player is initialized
      let player = dashjs.MediaPlayer().create();
      const element = document.getElementById(playerId) as HTMLVideoElement
      fetch(getBilibiliProxy(props.url))
        .then(res => res.json())
        .then(data => {
          const xmlString = data.data.xml;
          const xmlBlob = new Blob([xmlString], { type: "application/dash+xml" });
          const newMpdUrl = URL.createObjectURL(xmlBlob);
          if (element && props.url) {
            player.initialize(element, newMpdUrl, false);
          }
        })
        .catch(error => {
          console.error("Failed to fetch MPD:", error);
          // 可选：在这里设置错误状态
        });
    }
  }, [props.url]);

  return <video id={playerId} controls style={{ width: '100%', borderRadius: '1em', ...props.style }} className={props.className}></video>
}