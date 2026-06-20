import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/complaints - Fetch all complaints OR query by complaint_id
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const complaintId = searchParams.get('complaint_id');

    if (complaintId) {
      const complaint = await db.prepare('SELECT * FROM complaints WHERE complaint_id = ?').get(complaintId);
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
      }
      return NextResponse.json(complaint);
    }

    const complaints = await db.prepare('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 50').all();
    return NextResponse.json(complaints);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/complaints - File a new complaint
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const subject = formData.get('subject') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const complainant_name = formData.get('complainant_name') as string | null;
    const complainant_phone = formData.get('complainant_phone') as string | null;
    const location_text = formData.get('location_text') as string | null;
    const district = formData.get('district') as string | null;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;
    const is_anonymous = formData.get('is_anonymous') === 'true';
    const image = formData.get('image') as File | null;

    let image_path = null;
    if (image && image.size > 0) {
      // Convert image to base64
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      image_path = `data:${image.type};base64,${base64}`;
    }

    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Subject, category, and description are required' }, { status: 400 });
    }

    // Generate complaint ID: CV-YYYYMMDD-XXXX
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    const complaintId = `CV-${dateStr}-${randomStr}`;

    const info = await db.prepare(`
      INSERT INTO complaints (
        subject, category, description, status, complaint_id, 
        complainant_name, complainant_phone, location_text, district, latitude, longitude, is_anonymous, image_path
      ) VALUES (?, ?, ?, 'Submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subject, category, description, complaintId,
      complainant_name || null, complainant_phone || null, 
      location_text || null, district || null, latitude || null, longitude || null, 
      is_anonymous ? 1 : 0, image_path
    );

    const newComplaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(info.lastInsertRowid);
    return NextResponse.json(newComplaint, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
