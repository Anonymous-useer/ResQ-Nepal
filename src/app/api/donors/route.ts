import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/donors - Fetch donor listings (filterable by type and status)
export async function GET(request: Request) {
  try {
    const client = db.getClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'blood', 'organ', 'item'
    const status = searchParams.get('status'); // 'Pending', 'Approved', 'Rejected'
    const bloodGroup = searchParams.get('blood_group');
    const city = searchParams.get('city');

    let query = 'SELECT * FROM donors WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (bloodGroup) {
      query += ' AND blood_group = ?';
      params.push(bloodGroup);
    }
    if (city) {
      query += ' AND (city LIKE ? OR location_text LIKE ?)';
      params.push(`%${city}%`, `%${city}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const result = await client.execute({
      sql: query,
      args: params
    });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/donors - Register a new blood donor
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const name = formData.get('name') as string;
    const contact = formData.get('contact') as string;
    const blood_group = formData.get('blood_group') as string;
    const city = formData.get('city') as string;
    const district = formData.get('district') as string | null;
    const date_of_birth = formData.get('date_of_birth') as string | null;
    const gender = formData.get('gender') as string | null;
    const email = formData.get('email') as string | null;
    const address = formData.get('address') as string | null;
    const emergency_contact = formData.get('emergency_contact') as string | null;
    const location_text = formData.get('location_text') as string | null;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;
    const medical_report = formData.get('medical_report') as File | null;

    let medical_report_path = null;
    if (medical_report && medical_report.size > 0) {
      // Convert file to base64
      const arrayBuffer = await medical_report.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      medical_report_path = `data:${medical_report.type};base64,${base64}`;
    }

    if (!type || !name || !contact || !blood_group) {
      return NextResponse.json({ error: 'Type, name, contact, and blood group are required' }, { status: 400 });
    }

    // Insert into donors table
    const client = db.getClient();
    await client.execute({
      sql: `
        INSERT INTO donors (
          type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, 
          emergency_contact, location_text, latitude, longitude, status, medical_report_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
      `,
      args: [
        type,
        name,
        contact,
        blood_group || null,
        city || null,
        district || null,
        date_of_birth || null,
        gender || null,
        email || null,
        address || null,
        emergency_contact || null,
        location_text || null,
        latitude || null,
        longitude || null,
        medical_report_path
      ]
    });

    // Get last inserted row
    const lastInsertResult = await client.execute('SELECT last_insert_rowid() as id');
    const lastId = lastInsertResult.rows[0].id;
    const newDonorResult = await client.execute({
      sql: 'SELECT * FROM donors WHERE id = ?',
      args: [lastId]
    });
    
    return NextResponse.json(newDonorResult.rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
