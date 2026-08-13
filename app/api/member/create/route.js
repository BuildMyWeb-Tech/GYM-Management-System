// app/api/member/create/route.js
import prisma from '@/lib/prisma';
import imagekit from '@/configs/imageKit';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const formData = await request.formData();
    const fullName = formData.get('fullName');
    const phone = formData.get('phone');
    const dob = formData.get('dob') || null;
    const gender = formData.get('gender') || null;
    const address = formData.get('address') || null;
    const emergencyContactName = formData.get('emergencyContactName');
    const emergencyContactNumber = formData.get('emergencyContactNumber');
    const deviceUserId = formData.get('deviceUserId') || null;
    const photoFile = formData.get('photo');

    if (!fullName || !phone || !emergencyContactName || !emergencyContactNumber || !photoFile) {
      return NextResponse.json(
        { error: 'Full name, phone, emergency contact, and photo are required' },
        { status: 400 }
      );
    }

    // Upload photo to ImageKit
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: photoFile.name,
      folder: 'members',
    });
    const photo = imagekit.url({
      path: uploadResponse.filePath,
      transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '256' }],
    });

    const member = await prisma.member.create({
      data: {
        branchId,
        fullName,
        phone,
        photo,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        emergencyContactName,
        emergencyContactNumber,
        deviceUserId,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(
      { message: 'Member registered successfully', member },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'That biometric device ID is already assigned to another member in this branch' },
        { status: 400 }
      );
    }
    console.error('POST /api/member/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
