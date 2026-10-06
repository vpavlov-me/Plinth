import { createContext, useContext } from "react";

/**
 * Where devices take video frames from. The editor draws the live preview
 * elements; the video exporter provides the decoded frame for the time it is
 * rendering, keyed by the video's URL.
 */
export type VideoFrameSource = (url: string) => CanvasImageSource | null;

export const VideoFrameContext = createContext<VideoFrameSource | null>(null);

export const useVideoFrameSource = () => useContext(VideoFrameContext);
