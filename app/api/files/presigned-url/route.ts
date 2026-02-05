import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generatePresignedUrl } from '@/lib/minio';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Extract the filename from the URL
    // URL format: https://s3-api.domain.com/bucket-name/filename.ext
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove any query params

    if (!fileName) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }

    // Generate a fresh presigned URL (valid for 5 minutes)
    const presignedUrl = await generatePresignedUrl(fileName);

    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
