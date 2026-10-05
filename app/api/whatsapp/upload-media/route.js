// app/api/whatsapp/upload-media/route.js
// POST – upload a media file (image/video/audio) to ImageKit for WhatsApp broadcast use.
// Returns { url, fileId, name, mimeType } scoped to the caller's branch.

import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import imagekit from '@/configs/imageKit';
import { NextResponse } from 'next/server';

// Max 15 MB per file (ImageKit free plan supports up to 25 MB)
const MAX_BYTES = 15 * 1024 * 1024;

function mimeToWhatsAppType(mimeType) {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mimeType = file.type || 'application/octet-stream';
    const originalName = file.name || 'media';
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > MAX_BYTES)
      return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });

    // Upload to ImageKit under a per-branch folder for isolation
    const result = await imagekit.upload({
      file: buffer,
      fileName: `${Date.now()}-${originalName.replace(/[^a-z0-9._-]/gi, '_')}`,
      folder: `/whatsapp-media/${branchId}`,
      useUniqueFileName: true,
    });

    return NextResponse.json({
      url: result.url,
      fileId: result.fileId,
      name: result.name,
      mimeType,
      mediaType: mimeToWhatsAppType(mimeType),
    });
  } catch (err) {
    console.error('POST /api/whatsapp/upload-media error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
