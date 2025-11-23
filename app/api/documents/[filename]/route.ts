import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // Only allow specific security documents
    const allowedFiles = [
      'PLAID_SECURITY_SUMMARY.md',
      'INFORMATION_SECURITY_POLICY.md'
    ];

    if (!allowedFiles.includes(filename)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file from project root
    const filePath = join(process.cwd(), filename);
    const fileContent = await readFile(filePath, 'utf-8');

    // Return as downloadable file
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}
