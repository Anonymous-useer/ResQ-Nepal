import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/donors - Retrieve donor listings (filterable by type and status)
export async function GET(request: Request) {
  try {
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
    const donors = await db.prepare(query).all(params);
    return NextResponse.json(donors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/donors - Register a new blood donor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      type, 
      name, 
      contact, 
      blood_group, 
      city, 
      district,
      date_of_birth, 
      gender, 
      email, 
      address, 
      emergency_contact, 
      location_text, 
      latitude, 
      longitude 
    } = body;

    if (!type || !name || !contact || !blood_group) {
      return NextResponse.json({ error: 'Type, name, contact, and blood group are required' }, { status: 400 });
    }

    // Insert into donors table
    const info = await db.prepare(`
      INSERT INTO donors (
        type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, 
        emergency_contact, location_text, latitude, longitude, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(
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
      longitude || null
    );

    const newDonor = await db.prepare('SELECT * FROM donors WHERE id = ?').get(info.lastInsertRowid);
    return NextResponse.json(newDonor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
