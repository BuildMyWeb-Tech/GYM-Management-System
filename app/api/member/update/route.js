// app/api/member/update/route.js
import prisma from '@/lib/prisma';
import imagekit from '@/configs/imageKit';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const formData = await request.formData();
    const id = formData.get('id');
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

    const existing = await prisma.member.findFirst({ where: { id, branchId } });
    if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const updateData = {};
    const strFields = [
      'fullName',
      'phone',
      'gender',
      'address',
      'emergencyContactName',
      'emergencyContactNumber',
      'deviceUserId',
    ];
    for (const field of strFields) {
      const val = formData.get(field);
      if (val !== null) updateData[field] = val || null;
    }

    const dob = formData.get('dob');
    if (dob !== null) updateData.dob = dob ? new Date(dob) : null;

    const photoFile = formData.get('photo');
    if (photoFile && typeof photoFile !== 'string') {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const uploadResponse = await imagekit.upload({
        file: buffer,
        fileName: photoFile.name,
        folder: 'members',
      });
      updateData.photo = imagekit.url({
        path: uploadResponse.filePath,
        transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '256' }],
      });
    }

    const member = await prisma.member.update({ where: { id }, data: updateData });

    return NextResponse.json({ message: 'Member updated successfully', member });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'That biometric device ID is already assigned to another member in this branch' },
        { status: 400 }
      );
    }
    console.error('PUT /api/member/update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
