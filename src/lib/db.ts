import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Lazy loading of Turso Database client
let client: any = null;

function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      console.warn('TURSO_DATABASE_URL is not defined. Using in-memory fallback client.');
      // Prevent crash during Next.js build phase
      client = createClient({
        url: 'file::memory:',
      });
    } else {
      client = createClient({
        url,
        authToken: authToken || '',
      });
    }
  }
  return client;
}

// Initialize database schema asynchronously
const initializeSchema = async () => {
  const c = getClient();
  
  // Contacts table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      district TEXT,
      location_text TEXT,
      latitude REAL,
      longitude REAL
    )
  `);
  
  // Add new columns if they don't exist (for existing databases)
  try { await c.execute('ALTER TABLE contacts ADD COLUMN district TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE contacts ADD COLUMN location_text TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE contacts ADD COLUMN latitude REAL'); } catch (e) {}
  try { await c.execute('ALTER TABLE contacts ADD COLUMN longitude REAL'); } catch (e) {}



  // Complaints table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Submitted',
      complaint_id TEXT UNIQUE NOT NULL,
      admin_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      complainant_name TEXT,
      complainant_phone TEXT,
      location_text TEXT,
      district TEXT,
      latitude REAL,
      longitude REAL,
      is_anonymous INTEGER DEFAULT 0,
      image_path TEXT
    )
  `);

  // Add new columns for complaints if they don't exist
  try { await c.execute('ALTER TABLE complaints ADD COLUMN complainant_name TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN complainant_phone TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN location_text TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN district TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN latitude REAL'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN longitude REAL'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN is_anonymous INTEGER DEFAULT 0'); } catch (e) {}
  try { await c.execute('ALTER TABLE complaints ADD COLUMN image_path TEXT'); } catch (e) {}

  // Donors table (Blood only)
  await c.execute(`
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      blood_group TEXT,
      city TEXT,
      district TEXT,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_of_birth TEXT,
      gender TEXT,
      email TEXT,
      address TEXT,
      emergency_contact TEXT,
      location_text TEXT,
      latitude REAL,
      longitude REAL
    )
  `);

  // Add new columns for donors if they don't exist
  try { await c.execute('ALTER TABLE donors ADD COLUMN date_of_birth TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN gender TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN email TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN address TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN emergency_contact TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN location_text TEXT'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN latitude REAL'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN longitude REAL'); } catch (e) {}
  try { await c.execute('ALTER TABLE donors ADD COLUMN district TEXT'); } catch (e) {}

  // Notices table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin Session / credentials table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS admin_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Nearby Services (Hospitals, Blood Banks, Clinics)
  await c.execute(`
    CREATE TABLE IF NOT EXISTS nearby_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      phone TEXT NOT NULL,
      location TEXT,
      district TEXT,
      latitude REAL,
      longitude REAL
    )
  `);

  // Create performance indexes for optimized WHERE queries
  await c.execute('CREATE INDEX IF NOT EXISTS idx_donors_type ON donors (type)');
  await c.execute('CREATE INDEX IF NOT EXISTS idx_donors_status ON donors (status)');
  await c.execute('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status)');
};

const seedDatabase = async () => {
  const c = getClient();

  // 1. Seed Admin
  const adminCountRes = await c.execute("SELECT COUNT(*) as count FROM admin_session WHERE username = 'Titans' COLLATE NOCASE");
  const adminCount = Number(adminCountRes.rows[0].count);
  if (adminCount === 0) {
    await c.execute("DELETE FROM admin_session");
    await c.execute({
      sql: 'INSERT INTO admin_session (username, password) VALUES (?, ?)',
      args: ['Titans', 'ASM']
    });
  }

  // 2. Seed Contacts
  const contactCountRes = await c.execute('SELECT COUNT(*) as count FROM contacts');
  const contactCount = Number(contactCountRes.rows[0].count);
  if (contactCount === 0) {
    const contactsJsonPath = path.join(process.cwd(), 'public', 'data', 'contacts.json');
    if (fs.existsSync(contactsJsonPath)) {
      try {
        const contactsData = JSON.parse(fs.readFileSync(contactsJsonPath, 'utf-8'));
        const stmts = contactsData.map((co: any) => ({
          sql: `INSERT INTO contacts (name, number, category, description, district, location_text, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            co.name, co.number, co.category, co.description || null,
            co.district || null, co.location_text || null, co.latitude || null, co.longitude || null
          ]
        }));
        await c.batch(stmts, 'write');
      } catch (err) {
        console.error('Error seeding contacts:', err);
      }
    }
  }

  // 3. Seed Nearby Services
  const servicesCountRes = await c.execute('SELECT COUNT(*) as count FROM nearby_services');
  const servicesCount = Number(servicesCountRes.rows[0].count);
  if (servicesCount === 0) {
    await c.batch([
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Patan Hospital Blood Bank', 'Blood Bank', '01-5522295', 'Patan', 'Lalitpur', 27.6720, 85.3180]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Nepal Red Cross Society', 'Blood Bank', '01-4272718', 'Kathmandu', 'Kathmandu', 27.7080, 85.3150]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Bir Hospital Emergency', 'Hospital', '01-4221119', 'Tundikhel', 'Kathmandu', 27.7045, 85.3180]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Bhaktapur Hospital', 'Hospital', '01-6612295', 'Bhaktapur', 'Bhaktapur', 27.6710, 85.4270]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Grande International Hospital', 'Hospital', '01-5159266', 'Dhapasi', 'Kathmandu', 27.7270, 85.3310]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Nepal Mediciti Hospital', 'Hospital', '01-5970000', 'Buddhanagar', 'Kathmandu', 27.6950, 85.3200]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Pokhara Grande Hospital', 'Hospital', '061-520201', 'Pokhara', 'Pokhara', 28.2090, 83.9850]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Manipal Teaching Hospital', 'Hospital', '061-520101', 'Pokhara', 'Pokhara', 28.2070, 83.9830]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['B.P. Koirala Memorial Cancer Hospital', 'Hospital', '056-520401', 'Bharatpur', 'Chitwan', 27.6820, 84.4300]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Nobel Medical College', 'Hospital', '021-520301', 'Biratnagar', 'Biratnagar', 26.4810, 87.2730]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Lumbini Medical College', 'Hospital', '071-520401', 'Butwal', 'Butwal', 27.7030, 83.4400]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Nepal Red Cross Chitwan', 'Blood Bank', '056-520501', 'Bharatpur', 'Chitwan', 27.6830, 84.4310]
      },
      {
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['Nepal Red Cross Biratnagar', 'Blood Bank', '021-520601', 'Biratnagar', 'Biratnagar', 26.4800, 87.2720]
      }
    ], 'write');
  }

  // 4. Seed Donors
  const donorsCountRes = await c.execute('SELECT COUNT(*) as count FROM donors');
  const donorsCount = Number(donorsCountRes.rows[0].count);
  if (donorsCount === 0) {
    await c.batch([
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Ram Shrestha', '9801234567', 'O+', 'Kathmandu', 'Kathmandu', '1990-01-01', 'Male', 'ram@example.com', 'New Road, Kathmandu', '9807654321', 'New Road, Kathmandu', 27.7080, 85.3180, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Sita Sharma', '9811234567', 'A+', 'Lalitpur', 'Lalitpur', '1992-05-15', 'Female', 'sita@example.com', 'Patan, Lalitpur', '9817654321', 'Patan, Lalitpur', 27.6720, 85.3180, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Hari Thapa', '9821234567', 'B+', 'Bhaktapur', 'Bhaktapur', '1988-12-20', 'Male', 'hari@example.com', 'Bhaktapur', '9827654321', 'Bhaktapur', 27.6710, 85.4270, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Gita Gurung', '9831234567', 'AB+', 'Pokhara', 'Pokhara', '1995-03-10', 'Female', 'gita@example.com', 'Lakeside, Pokhara', '9837654321', 'Lakeside, Pokhara', 28.2090, 83.9850, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Bikash Rai', '9841234567', 'O-', 'Bharatpur', 'Chitwan', '1987-08-25', 'Male', 'bikash@example.com', 'Bharatpur, Chitwan', '9847654321', 'Bharatpur, Chitwan', 27.6820, 84.4300, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Sunita Magar', '9851234567', 'B-', 'Biratnagar', 'Biratnagar', '1993-11-12', 'Female', 'sunita@example.com', 'Biratnagar', '9857654321', 'Biratnagar', 26.4810, 87.2730, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Rajesh Hamal', '9861234567', 'A-', 'Butwal', 'Butwal', '1985-04-05', 'Male', 'rajesh@example.com', 'Butwal', '9867654321', 'Butwal', 27.7030, 83.4400, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Anjali Subedi', '9871234567', 'AB-', 'Kathmandu', 'Kathmandu', '1997-07-18', 'Female', 'anjali@example.com', 'Dhapasi, Kathmandu', '9877654321', 'Dhapasi, Kathmandu', 27.7270, 85.3310, 'Approved']
      },
      {
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['blood', 'Kumar Basnet', '9881234567', 'O+', 'Lalitpur', 'Lalitpur', '1991-09-30', 'Male', 'kumar@example.com', 'Pulchowk, Lalitpur', '9887654321', 'Pulchowk, Lalitpur', 27.6650, 85.3190, 'Approved']
      }
    ], 'write');
  }

  // 5. Seed SafeLink Info Links
  const linksCountRes = await c.execute('SELECT COUNT(*) as count FROM info_links');
  const linksCount = Number(linksCountRes.rows[0].count);
  if (linksCount === 0) {
    await c.batch([
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Nepal Earthquake Safety Guidelines', 'https://www.drrportal.gov.np/guidelines/earthquake', 'Official earthquake preparedness and safety guidelines from Nepal government.', 'Earthquake Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['What to Do During an Earthquake', 'https://www.ready.gov/earthquakes', 'International guidelines on earthquake safety.', 'Earthquake Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Nepal Flood Early Warning System', 'https://www.drrportal.gov.np/flood', 'Flood monitoring and early warning information for Nepal.', 'Flood Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Flood Preparedness Tips', 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/floods.html', 'Red Cross guidelines on flood safety.', 'Flood Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Fire Safety at Home', 'https://www.nfpa.org/Public-Education/By-topic/Way-to-respond/Fire-safety-in-the-home', 'Tips on preventing and responding to home fires.', 'Fire Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Nepal Fire Services', 'https://home.gov.np/fire-service', 'Official Nepal fire service information.', 'Fire Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Landslide Preparedness', 'https://www.drrportal.gov.np/guidelines/landslide', 'Guidelines for landslide prevention and safety.', 'Landslide Preparedness']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Landslide Risk Reduction', 'https://www.unicef.org/nepal/what-we-do/emergencies/landslides', 'UNICEF resources on landslide safety.', 'Landslide Preparedness']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Women\'s Safety in Emergencies', 'https://www.unwomen.org/en/what-we-do/ending-violence-against-women', 'Resources for women\'s safety during disasters.', 'Women\'s Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Gender-Based Violence Helpline', 'https://www.nepalwomen.org.np/helpline', 'Helpline information for GBV survivors in Nepal.', 'Women\'s Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Child Safety in Disasters', 'https://www.unicef.org/nepal/what-we-do/child-protection', 'UNICEF guidelines on keeping children safe during emergencies.', 'Child Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Child Helpline Nepal', 'https://www.childnepal.org/helpline', '24/7 helpline for children in need.', 'Child Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Cyber Safety Tips', 'https://www.ncsc.gov.np/', 'Nepal Cyber Security Center guidelines for online safety.', 'Cyber Safety']
      },
      {
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: ['Stay Safe Online', 'https://staysafeonline.org/', 'International cyber safety resources.', 'Cyber Safety']
      }
    ], 'write');
  }

  // 6. Seed Pinned Notices
  const noticesCountRes = await c.execute('SELECT COUNT(*) as count FROM notices');
  const noticesCount = Number(noticesCountRes.rows[0].count);
  if (noticesCount === 0) {
    await c.execute(`
      INSERT INTO notices (title, content, is_pinned)
      VALUES 
      ('Monsoon Precaution Advisory', 'DHM has issued warnings for landslides in hilly areas. Stay away from steep slopes and monitor local news.', 1),
      ('Emergency Blood Drive at Patan Hospital', 'ResQ Nepal is coordinating with Nepal Red Cross to organize an emergency blood drive at Patan Hospital on Saturday. All groups welcome.', 1)
    `);
  }
};

let initPromise: Promise<void> | null = null;

export const initDb = async () => {
  if (!process.env.TURSO_DATABASE_URL) {
    return; // Don't run schema init during build time if URL is missing
  }
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await initializeSchema();
        await seedDatabase();
      } catch (err) {
        console.error('Database initialization/seeding failed:', err);
      }
    })();
  }
  await initPromise;
};

// Start initial seeding task in background if URL is available
if (process.env.TURSO_DATABASE_URL) {
  initDb();
}

class PreparedAsyncStatement {
  sql: string;
  constructor(sql: string) {
    this.sql = sql;
  }

  private getArgs(args: any[]) {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      return args[0];
    }
    return args;
  }

  async all(...args: any[]) {
    await initDb();
    const res = await getClient().execute({ sql: this.sql, args: this.getArgs(args) });
    return res.rows;
  }

  async get(...args: any[]) {
    await initDb();
    const res = await getClient().execute({ sql: this.sql, args: this.getArgs(args) });
    return res.rows[0];
  }

  async run(...args: any[]) {
    await initDb();
    const res = await getClient().execute({ sql: this.sql, args: this.getArgs(args) });
    let lastInsertRowid: any = res.lastInsertRowid;
    if (typeof lastInsertRowid === 'bigint') {
      lastInsertRowid = Number(lastInsertRowid);
    }
    return {
      lastInsertRowid,
      changes: res.rowsAffected
    };
  }
}

const dbWrapper = {
  prepare(sql: string) {
    return new PreparedAsyncStatement(sql);
  },
  async execute(opts: any) {
    await initDb();
    return getClient().execute(opts);
  },
  async batch(stmts: any[], mode?: any) {
    await initDb();
    return getClient().batch(stmts, mode);
  },
  transaction(fn: any) {
    throw new Error('Synchronous transaction callbacks are not supported with Turso db. Use db.batch() instead.');
  }
};

export default dbWrapper;