// app/api/whatsapp/upload-media/route.js
// GET  – returns a short-lived ImageKit auth token so the client can upload
//        directly to ImageKit (avoids Vercel's 4.5 MB serverless body limit).
// POST – (legacy) server-side upload path kept for small files / fallback.

import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import imagekit from '@/configs/imageKit';
import { NextResponse } from 'next/server';

// GET – return auth params for client-side direct upload to ImageKit
export async function GET(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    // getAuthenticationParameters() is synchronous — returns { token, expire, signature }
    const auth = imagekit.getAuthenticationParameters();

    return NextResponse.json({
      ...auth,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      folder: `/whatsapp-media/${branchId}`,
    });
  } catch (err) {
    console.error('GET /api/whatsapp/upload-media error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function mimeToWhatsAppType(mimeType) {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

// POST – server-side upload (kept for small files < 4.5 MB)
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
