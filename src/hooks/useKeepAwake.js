import { useEffect, useRef, useState } from 'react';

/**
 * Hook to keep the screen awake during workouts.
 * Uses native Screen Wake Lock API if available.
 * Falls back to a hidden video loop (NoSleep check) for iOS/others.
 */
export const useKeepAwake = (enabled = true) => {
    const wakeLockRef = useRef(null);
    const videoRef = useRef(null);
    const [status, setStatus] = useState('inactive'); // 'active', 'inactive', 'error'

    // 1. Native API Logic
    const requestNativeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('Wake Lock released');
                    setStatus('inactive');
                });
                console.log('Wake Lock active');
                setStatus('active');
            } else {
                throw new Error('Wake Lock API not supported');
            }
        } catch (err) {
            console.warn('Native Wake Lock failed, trying fallback:', err);
            enableVideoFallback();
        }
    };

    const releaseNativeLock = async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    };

    // 2. Video Fallback Logic (iOS/Safari)
    // Minimal 1px mp4 video loop
    const noSleepVideo = 'data:video/mp4;base64,AAAAHGZ0eXBNNEVAAAAAAAEAAAAIbW9vdgAAAABsbXZoAAAAAQAAAAAAAAAAAAAAAAEAAAEAAAEAAAEAAAAAAAHAZmNwaQAAAD1jbXZkYWVyYXRvbQAAAAAmY212ZGFlcmF0b3JHZW5lcmF0ZWQgYnkgRkZtcGVnAAAAKXZpZGUAAABtdmhkAAAAAQAAAAAAAAAAAAAAAAEAAAEAAAEAAAEAAAAAAAB0cmFrAAAAXHRraGQAAAABAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAAAAQAAAMW1kaWEAAAAIG1kaGQAAAAAAAAAAAAAAAAAAEAAAAABAAAAAAAAAAAAAAA5aGRscgAAAHZpZGUAAAAAAAAAAAAAAAB2aWRlb2hhbmRsZXIAAAABZ21pbmYAAAAUdmloZAAAAAEAAAAAAAAAAAAAAABkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAItzdGJsAAAAdHN0ZHNkAAAAAAAAAAEAAABgYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGF2Y0MBAM//EAAm/9F7AwAAAAEAAAAZc3R0cwAAAAAAAAABAAAAAQAAAEAAAAAAAAAAFHN0c3oAAAAAAAAAAQAAABAAAAA0Y3R0cwAAAAAAAAABAAAAAQAAABAAAAAkc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAUc3RjbwAAAAAAAAABAAAAIAAAAYJ1ZHRhAAAAZnBtZXRhAAAAAAAAACFocGRsAAAAAAAAAAAAZXhwbG9yZV9wYW5vcmFtYQA=';

    const enableVideoFallback = () => {
        if (!videoRef.current) {
            const video = document.createElement('video');
            video.setAttribute('playsinline', '');
            video.setAttribute('loop', '');
            video.setAttribute('muted', ''); // Required for autoplay
            video.src = noSleepVideo;
            video.style.opacity = '0';
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.pointerEvents = 'none'; // Click-through

            document.body.appendChild(video);
            videoRef.current = video;
        }

        // Try to play. Note: Might fail without user gesture if not called from event handler.
        // We catch the error politely.
        videoRef.current.play().then(() => {
            console.log('Video KeepAwake active');
            setStatus('active (fallback)');
        }).catch(e => {
            console.warn('Video autoplay failed (needs gesture?):', e);
            setStatus('error-fallback');
        });
    };

    const disableVideoFallback = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.remove();
            videoRef.current = null;
        }
    };

    // 3. Lifecycle Management
    useEffect(() => {
        if (enabled) {
            requestNativeLock();

            // Re-acquire on visibility change (desktop/android behavior)
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    requestNativeLock();
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => {
                releaseNativeLock();
                disableVideoFallback();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        } else {
            releaseNativeLock();
            disableVideoFallback();
            setStatus('inactive');
        }
    }, [enabled]);

    return { status };
};
