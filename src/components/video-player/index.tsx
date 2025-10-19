import * as dashjs from 'dashjs';
import { useEffect } from 'react';
import { useState } from 'react';
import { uniqueId } from 'lodash';
import { serverHost } from '@/server/training-server';

export function getBilibiliProxy(bilibiliUrl: string): string   {
const s = bilibiliUrl.split('/');
    const bvid = s[s.length - 2];
    return `${serverHost}/proxy/bilibili/video-manifest?bvid=${bvid}`;
}


export function VideoPlayer(props: { url?: string, className?: string, style?: React.CSSProperties }) {
    const playerId = useState(uniqueId('video-'))[0];
    
    useEffect(() => {
        // This will ensure the dashjs library is loaded and the player is initialized
        let player = dashjs.MediaPlayer().create();
        const element = document.getElementById(playerId) as HTMLVideoElement
        if(element && props.url){
            player.initialize(element, getBilibiliProxy(props.url), true);
        }
    }, []);
    return <video id={playerId} controls style={{width: '100%', ...props.style}} className={props.className}></video>
}