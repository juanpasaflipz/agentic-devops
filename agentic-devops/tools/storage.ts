import { Storage } from '@google-cloud/storage';

export type UploadParams = {
  bucket: string;
  object: string;
  data: string; // utf8 content
  contentType?: string;
};

export async function upload(params: UploadParams): Promise<{ ok: boolean; url?: string }> {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    // Dev no-op
    return { ok: true };
  }
  const storage = new Storage({ projectId });
  const bucket = storage.bucket(params.bucket);
  const file = bucket.file(params.object);
  await file.save(Buffer.from(params.data, 'utf8'), {
    contentType: params.contentType ?? 'text/plain',
  });
  return { ok: true, url: `gs://${params.bucket}/${params.object}` };
}
