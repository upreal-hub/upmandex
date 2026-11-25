export const isStreamSpritePath = (path: string) => /^\/upmans\/[a-z0-9_-]+\.png$/i.test(path);
const isSubmissionPath = (path: string) => /^\/api\/submission-media\/[a-z0-9]+$/i.test(path);

export function isStreamSubmissionRequest(path: string, search: string) {
  return isSubmissionPath(path) && search === "?stream=1";
}

export function streamUpmanImage(image: string | null) {
  return image && isSubmissionPath(image) ? image + "?stream=1" : image;
}
