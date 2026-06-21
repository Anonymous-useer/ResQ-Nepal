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
      longitude REAL,
      medical_report_path TEXT
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
  try { await c.execute('ALTER TABLE donors ADD COLUMN medical_report_path TEXT'); } catch (e) {}

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

  // SafeLink Info Links
  await c.execute(`
    CREATE TABLE IF NOT EXISTS info_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL
    )
  `);

  // Create performance indexes for optimized WHERE queries
  await c.execute('CREATE INDEX IF NOT EXISTS idx_donors_type ON donors (type)');
  await c.execute('CREATE INDEX IF NOT EXISTS idx_donors_status ON donors (status)');
  await c.execute('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status)');
};

// Helper to get services data
const getServicesData = () => [
  // Kathmandu District
  { name: 'Bir Hospital', type: 'Hospital', phone: '01-4221119', location: 'Tundikhel', district: 'Kathmandu', latitude: 27.7045, longitude: 85.3180 },
  { name: 'TU Teaching Hospital', type: 'Hospital', phone: '01-4410911', location: 'Maharajgunj', district: 'Kathmandu', latitude: 27.7280, longitude: 85.3330 },
  { name: 'Grande International Hospital', type: 'Hospital', phone: '01-5159266', location: 'Dhapasi', district: 'Kathmandu', latitude: 27.7270, longitude: 85.3310 },
  { name: 'Nepal Mediciti Hospital', type: 'Hospital', phone: '01-5970000', location: 'Buddhanagar', district: 'Kathmandu', latitude: 27.6950, longitude: 85.3200 },
  { name: 'Norvic International Hospital', type: 'Hospital', phone: '01-4258554', location: 'Thapathali', district: 'Kathmandu', latitude: 27.6980, longitude: 85.3170 },
  { name: 'Nepal Police Hospital', type: 'Hospital', phone: '01-4412430', location: 'Maharajgunj', district: 'Kathmandu', latitude: 27.7260, longitude: 85.3310 },
  { name: 'Nepal Red Cross Society Central Blood Bank', type: 'Blood Bank', phone: '01-5006465', location: 'Soltimode', district: 'Kathmandu', latitude: 27.7020, longitude: 85.3150 },
  { name: 'Himal Hospital', type: 'Hospital', phone: '9862737316', location: 'Gyaneshwor', district: 'Kathmandu', latitude: 27.7060, longitude: 85.3220 },
  { name: 'Civil Service Hospital', type: 'Hospital', phone: '01-4107000', location: 'Minbhawan', district: 'Kathmandu', latitude: 27.7000, longitude: 85.3240 },
  { name: 'Om Hospital and Research Centre', type: 'Hospital', phone: '01-4476225', location: 'Chabahil', district: 'Kathmandu', latitude: 27.7180, longitude: 85.3400 },
  { name: 'Nobel Hospital', type: 'Hospital', phone: '01-4110842', location: 'Sinamangal', district: 'Kathmandu', latitude: 27.6920, longitude: 85.3420 },
  { name: 'Shree Satya Sai Centre', type: 'Clinic', phone: '01-4498035', location: 'Naxal', district: 'Kathmandu', latitude: 27.7050, longitude: 85.3260 },

  // Lalitpur District
  { name: 'Patan Hospital', type: 'Hospital', phone: '01-5522295', location: 'Patan', district: 'Lalitpur', latitude: 27.6720, longitude: 85.3180 },
  { name: 'KIST Medical College & Teaching Hospital', type: 'Hospital', phone: '01-5550000', location: 'Gwarko', district: 'Lalitpur', latitude: 27.6650, longitude: 85.3300 },
  { name: 'Nepal Red Cross Society Lalitpur Blood Transfusion Center', type: 'Blood Bank', phone: '01-5427033', location: 'Pulchowk', district: 'Lalitpur', latitude: 27.6690, longitude: 85.3200 },
  { name: 'Nepal Cancer Hospital and Research Center', type: 'Hospital', phone: '9803001333', location: 'Godawari', district: 'Lalitpur', latitude: 27.6120, longitude: 85.3480 },
  { name: 'B & B Hospital', type: 'Hospital', phone: '01-5533206', location: 'Gwarko', district: 'Lalitpur', latitude: 27.6660, longitude: 85.3280 },
  { name: 'Ayur Health Care & Diagnostic Centre', type: 'Clinic', phone: '01-5542233', location: 'Satdobato', district: 'Lalitpur', latitude: 27.6550, longitude: 85.3250 },

  // Bhaktapur District
  { name: 'Bhaktapur Hospital', type: 'Hospital', phone: '01-6610676', location: 'Dudhpati', district: 'Bhaktapur', latitude: 27.6720, longitude: 85.4280 },
  { name: 'Bhaktapur Cancer Hospital', type: 'Hospital', phone: '01-6611532', location: 'Bhaktapur', district: 'Bhaktapur', latitude: 27.6710, longitude: 85.4270 },
  { name: 'Nepal Red Cross Society Bhaktapur', type: 'Blood Bank', phone: '01-6612266', location: 'Dudhpati', district: 'Bhaktapur', latitude: 27.6720, longitude: 85.4270 },
  { name: 'Siddhi Smriti Hospital', type: 'Hospital', phone: '01-6610570', location: 'Bhaktapur', district: 'Bhaktapur', latitude: 27.6700, longitude: 85.4260 },
  { name: 'Changu Health Post', type: 'Clinic', phone: '9849424813', location: 'Changu Narayan', district: 'Bhaktapur', latitude: 27.6450, longitude: 85.4450 },

  // Pokhara (Kaski) District
  { name: 'Pokhara Academy of Health Sciences (Western Regional Hospital)', type: 'Hospital', phone: '061-520201', location: 'Pokhara', district: 'Pokhara', latitude: 28.2090, longitude: 83.9850 },
  { name: 'Manipal Teaching Hospital', type: 'Hospital', phone: '061-520101', location: 'Pokhara', district: 'Pokhara', latitude: 28.2070, longitude: 83.9830 },
  { name: 'Gandaki Medical College', type: 'Hospital', phone: '061-520400', location: 'Pokhara', district: 'Pokhara', latitude: 28.2060, longitude: 83.9820 },
  { name: 'Nepal Red Cross Society Gandaki Province', type: 'Blood Bank', phone: '9846043950', location: 'Rambazar', district: 'Pokhara', latitude: 28.2100, longitude: 83.9900 },
  { name: 'Lake City Hospital and Critical Care Pvt. Ltd', type: 'Hospital', phone: '061-520500', location: 'Pokhara', district: 'Pokhara', latitude: 28.2050, longitude: 83.9810 },
  { name: 'Lamjung District Hospital', type: 'Hospital', phone: '066-520101', location: 'Lamjung', district: 'Pokhara', latitude: 28.3500, longitude: 84.1800 },

  // Chitwan District
  { name: 'Bharatpur Hospital', type: 'Hospital', phone: '056-520600', location: 'Bharatpur', district: 'Chitwan', latitude: 27.6830, longitude: 84.4310 },
  { name: 'Chitwan Medical College Teaching Hospital', type: 'Hospital', phone: '056-520500', location: 'Bharatpur', district: 'Chitwan', latitude: 27.6820, longitude: 84.4300 },
  { name: 'College of Medical Sciences', type: 'Hospital', phone: '9844099921', location: 'Bharatpur', district: 'Chitwan', latitude: 27.6810, longitude: 84.4290 },
  { name: 'B.P. Koirala Memorial Cancer Hospital', type: 'Hospital', phone: '056-520401', location: 'Bharatpur', district: 'Chitwan', latitude: 27.6800, longitude: 84.4280 },
  { name: 'Nepal Red Cross Society Chitwan District Chapter', type: 'Blood Bank', phone: '056-520133', location: 'Bharatpur', district: 'Chitwan', latitude: 27.6840, longitude: 84.4320 },
  { name: 'Baghauda Hospital', type: 'Hospital', phone: '9855084955', location: 'Baghauda', district: 'Chitwan', latitude: 27.6600, longitude: 84.3800 },

  // Biratnagar (Morang) District
  { name: 'Nobel Medical College Teaching Hospital', type: 'Hospital', phone: '021-520301', location: 'Biratnagar', district: 'Biratnagar', latitude: 26.4810, longitude: 87.2730 },
  { name: 'Biratnagar Eye Hospital', type: 'Hospital', phone: '021-520500', location: 'Biratnagar', district: 'Biratnagar', latitude: 26.4800, longitude: 87.2720 },
  { name: 'Morang Cooperative Hospital', type: 'Hospital', phone: '021-520600', location: 'Biratnagar', district: 'Biratnagar', latitude: 26.4790, longitude: 87.2710 },
  { name: 'Nepal Red Cross Society Koshi Province', type: 'Blood Bank', phone: '9842071321', location: 'Red Cross Marga', district: 'Biratnagar', latitude: 26.4820, longitude: 87.2740 },
  { name: 'Life Line Hospital', type: 'Hospital', phone: '021-520700', location: 'Biratnagar', district: 'Biratnagar', latitude: 26.4780, longitude: 87.2700 },
  { name: 'Mechi Hospital', type: 'Hospital', phone: '023-520102', location: 'Damak', district: 'Biratnagar', latitude: 26.6800, longitude: 87.7000 },

  // Butwal (Rupandehi) District
  { name: 'Lumbini Provincial Hospital', type: 'Hospital', phone: '071-520401', location: 'Butwal', district: 'Butwal', latitude: 27.7030, longitude: 83.4400 },
  { name: 'Universal College of Medical Sciences', type: 'Hospital', phone: '071-520500', location: 'Butwal', district: 'Butwal', latitude: 27.7020, longitude: 83.4390 },
  { name: 'Lumbini Medical College', type: 'Hospital', phone: '071-520600', location: 'Butwal', district: 'Butwal', latitude: 27.7010, longitude: 83.4380 },
  { name: 'Siddharthanagar City Hospital', type: 'Hospital', phone: '071-520700', location: 'Siddharthanagar (Bhairahawa)', district: 'Butwal', latitude: 27.4980, longitude: 83.4100 },
  { name: 'Nepal Red Cross Society Lumbini Province', type: 'Blood Bank', phone: '9857061390', location: 'Butwal', district: 'Butwal', latitude: 27.7040, longitude: 83.4410 },
  { name: 'Gautam Buddha Community Heart Hospital', type: 'Hospital', phone: '071-520800', location: 'Butwal', district: 'Butwal', latitude: 27.7000, longitude: 83.4370 }
];

// Helper to get donors data
const getDonorsData = () => [
  // Kathmandu District
  { type: 'blood', name: 'Ram Shrestha', contact: '9801234567', blood_group: 'O+', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1990-01-01', gender: 'Male', email: 'ram@example.com', address: 'New Road, Kathmandu', emergency_contact: '9807654321', location_text: 'New Road, Kathmandu', latitude: 27.7080, longitude: 85.3180, status: 'Approved' },
  { type: 'blood', name: 'Sita Kumari', contact: '9802345678', blood_group: 'A+', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1992-03-15', gender: 'Female', email: 'sita.kumari@example.com', address: 'Putalisadak, Kathmandu', emergency_contact: '9808765432', location_text: 'Putalisadak, Kathmandu', latitude: 27.7150, longitude: 85.3200, status: 'Approved' },
  { type: 'blood', name: 'Hari Bahadur', contact: '9803456789', blood_group: 'B+', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1988-07-20', gender: 'Male', email: 'hari.bahadur@example.com', address: 'Thamel, Kathmandu', emergency_contact: '9809876543', location_text: 'Thamel, Kathmandu', latitude: 27.7180, longitude: 85.3120, status: 'Approved' },
  { type: 'blood', name: 'Gita Rani', contact: '9804567890', blood_group: 'AB+', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1995-11-10', gender: 'Female', email: 'gita.rani@example.com', address: 'Boudha, Kathmandu', emergency_contact: '9801234567', location_text: 'Boudha, Kathmandu', latitude: 27.7220, longitude: 85.3600, status: 'Approved' },
  { type: 'blood', name: 'Bikash Rai', contact: '9805678901', blood_group: 'O-', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1987-05-25', gender: 'Male', email: 'bikash.rai@example.com', address: 'Maharajgunj, Kathmandu', emergency_contact: '9802345678', location_text: 'Maharajgunj, Kathmandu', latitude: 27.7280, longitude: 85.3330, status: 'Approved' },
  { type: 'blood', name: 'Sunita Magar', contact: '9806789012', blood_group: 'B-', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1993-09-12', gender: 'Female', email: 'sunita.magar@example.com', address: 'Koteshwor, Kathmandu', emergency_contact: '9803456789', location_text: 'Koteshwor, Kathmandu', latitude: 27.6800, longitude: 85.3400, status: 'Approved' },
  { type: 'blood', name: 'Rajesh Hamal', contact: '9807890123', blood_group: 'A-', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1985-04-05', gender: 'Male', email: 'rajesh.hamal@example.com', address: 'Baneshwor, Kathmandu', emergency_contact: '9804567890', location_text: 'Baneshwor, Kathmandu', latitude: 27.7000, longitude: 85.3240, status: 'Approved' },
  { type: 'blood', name: 'Anjali Subedi', contact: '9808901234', blood_group: 'AB-', city: 'Kathmandu', district: 'Kathmandu', date_of_birth: '1997-07-18', gender: 'Female', email: 'anjali.subedi@example.com', address: 'Dhapasi, Kathmandu', emergency_contact: '9805678901', location_text: 'Dhapasi, Kathmandu', latitude: 27.7270, longitude: 85.3310, status: 'Approved' },

  // Lalitpur District
  { type: 'blood', name: 'Kumar Basnet', contact: '9811234567', blood_group: 'O+', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1991-09-30', gender: 'Male', email: 'kumar.basnet@example.com', address: 'Pulchowk, Lalitpur', emergency_contact: '9817654321', location_text: 'Pulchowk, Lalitpur', latitude: 27.6650, longitude: 85.3190, status: 'Approved' },
  { type: 'blood', name: 'Saraswati Tamang', contact: '9812345678', blood_group: 'A+', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1994-02-28', gender: 'Female', email: 'saraswati.tamang@example.com', address: 'Patan, Lalitpur', emergency_contact: '9818765432', location_text: 'Patan, Lalitpur', latitude: 27.6720, longitude: 85.3180, status: 'Approved' },
  { type: 'blood', name: 'Dipak Newar', contact: '9813456789', blood_group: 'B+', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1989-12-14', gender: 'Male', email: 'dipak.newar@example.com', address: 'Lagankhel, Lalitpur', emergency_contact: '9819876543', location_text: 'Lagankhel, Lalitpur', latitude: 27.6680, longitude: 85.3120, status: 'Approved' },
  { type: 'blood', name: 'Rina Sherpa', contact: '9814567890', blood_group: 'AB+', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1996-06-08', gender: 'Female', email: 'rina.sherpa@example.com', address: 'Satdobato, Lalitpur', emergency_contact: '9811234567', location_text: 'Satdobato, Lalitpur', latitude: 27.6550, longitude: 85.3250, status: 'Approved' },
  { type: 'blood', name: 'Suresh Gurung', contact: '9815678901', blood_group: 'O-', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1986-10-22', gender: 'Male', email: 'suresh.gurung@example.com', address: 'Gwarko, Lalitpur', emergency_contact: '9812345678', location_text: 'Gwarko, Lalitpur', latitude: 27.6660, longitude: 85.3280, status: 'Approved' },
  { type: 'blood', name: 'Mina Magar', contact: '9816789012', blood_group: 'B-', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1992-04-30', gender: 'Female', email: 'mina.magar@example.com', address: 'Godawari, Lalitpur', emergency_contact: '9813456789', location_text: 'Godawari, Lalitpur', latitude: 27.6120, longitude: 85.3480, status: 'Approved' },
  { type: 'blood', name: 'Prakash Subedi', contact: '9817890123', blood_group: 'A-', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1984-08-15', gender: 'Male', email: 'prakash.subedi@example.com', address: 'Chobhar, Lalitpur', emergency_contact: '9814567890', location_text: 'Chobhar, Lalitpur', latitude: 27.6480, longitude: 85.2950, status: 'Approved' },
  { type: 'blood', name: 'Parbati Shrestha', contact: '9818901234', blood_group: 'AB-', city: 'Lalitpur', district: 'Lalitpur', date_of_birth: '1998-12-05', gender: 'Female', email: 'parbati.shrestha@example.com', address: 'Jawalakhel, Lalitpur', emergency_contact: '9815678901', location_text: 'Jawalakhel, Lalitpur', latitude: 27.6750, longitude: 85.3100, status: 'Approved' },

  // Bhaktapur District
  { type: 'blood', name: 'Hari Thapa', contact: '9821234567', blood_group: 'O+', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1988-12-20', gender: 'Male', email: 'hari.thapa@example.com', address: 'Bhaktapur Durbar Square', emergency_contact: '9827654321', location_text: 'Bhaktapur Durbar Square', latitude: 27.6710, longitude: 85.4270, status: 'Approved' },
  { type: 'blood', name: 'Laxmi Nepali', contact: '9822345678', blood_group: 'A+', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1993-05-18', gender: 'Female', email: 'laxmi.nepali@example.com', address: 'Dudhpati, Bhaktapur', emergency_contact: '9828765432', location_text: 'Dudhpati, Bhaktapur', latitude: 27.6720, longitude: 85.4280, status: 'Approved' },
  { type: 'blood', name: 'Shiva Raj', contact: '9823456789', blood_group: 'B+', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1987-09-25', gender: 'Male', email: 'shiva.raj@example.com', address: 'Changunarayan, Bhaktapur', emergency_contact: '9829876543', location_text: 'Changunarayan, Bhaktapur', latitude: 27.6450, longitude: 85.4450, status: 'Approved' },
  { type: 'blood', name: 'Devi Thami', contact: '9824567890', blood_group: 'AB+', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1995-03-10', gender: 'Female', email: 'devi.thami@example.com', address: 'Nagarkot, Bhaktapur', emergency_contact: '9821234567', location_text: 'Nagarkot, Bhaktapur', latitude: 27.7000, longitude: 85.5200, status: 'Approved' },
  { type: 'blood', name: 'Ramesh Bista', contact: '9825678901', blood_group: 'O-', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1985-11-30', gender: 'Male', email: 'ramesh.bista@example.com', address: 'Suryabinayak, Bhaktapur', emergency_contact: '9822345678', location_text: 'Suryabinayak, Bhaktapur', latitude: 27.6600, longitude: 85.4500, status: 'Approved' },
  { type: 'blood', name: 'Radha KC', contact: '9826789012', blood_group: 'B-', city: 'Bhaktapur', district: 'Bhaktapur', date_of_birth: '1994-07-22', gender: 'Female', email: 'radha.kc@example.com', address: 'Madhyapur Thimi, Bhaktapur', emergency_contact: '9823456789', location_text: 'Madhyapur Thimi, Bhaktapur', latitude: 27.6850, longitude: 85.3800, status: 'Approved' },

  // Pokhara District
  { type: 'blood', name: 'Gita Gurung', contact: '9831234567', blood_group: 'O+', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1995-03-10', gender: 'Female', email: 'gita.gurung@example.com', address: 'Lakeside, Pokhara', emergency_contact: '9837654321', location_text: 'Lakeside, Pokhara', latitude: 28.2090, longitude: 83.9850, status: 'Approved' },
  { type: 'blood', name: 'Kiran Sherchan', contact: '9832345678', blood_group: 'A+', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1990-12-05', gender: 'Male', email: 'kiran.sherchan@example.com', address: 'Mahendrapul, Pokhara', emergency_contact: '9838765432', location_text: 'Mahendrapul, Pokhara', latitude: 28.2070, longitude: 83.9830, status: 'Approved' },
  { type: 'blood', name: 'Purnima Rai', contact: '9833456789', blood_group: 'B+', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1993-08-15', gender: 'Female', email: 'purnima.rai@example.com', address: 'Sarangkot, Pokhara', emergency_contact: '9839876543', location_text: 'Sarangkot, Pokhara', latitude: 28.2500, longitude: 84.0000, status: 'Approved' },
  { type: 'blood', name: 'Bikash Thapa', contact: '9834567890', blood_group: 'AB+', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1988-04-20', gender: 'Male', email: 'bikash.thapa@example.com', address: 'Rambazar, Pokhara', emergency_contact: '9831234567', location_text: 'Rambazar, Pokhara', latitude: 28.2100, longitude: 83.9900, status: 'Approved' },
  { type: 'blood', name: 'Sunita Shrestha', contact: '9835678901', blood_group: 'O-', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1996-10-28', gender: 'Female', email: 'sunita.shrestha@example.com', address: 'Chipledhunga, Pokhara', emergency_contact: '9832345678', location_text: 'Chipledhunga, Pokhara', latitude: 28.2060, longitude: 83.9820, status: 'Approved' },
  { type: 'blood', name: 'Dipak Regmi', contact: '9836789012', blood_group: 'B-', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1986-06-12', gender: 'Male', email: 'dipak.regmi@example.com', address: 'Bagar, Pokhara', emergency_contact: '9833456789', location_text: 'Bagar, Pokhara', latitude: 28.2050, longitude: 83.9810, status: 'Approved' },
  { type: 'blood', name: 'Saraswati BK', contact: '9837890123', blood_group: 'A-', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1997-02-18', gender: 'Female', email: 'saraswati.bk@example.com', address: 'Tersapatti, Pokhara', emergency_contact: '9834567890', location_text: 'Tersapatti, Pokhara', latitude: 28.2080, longitude: 83.9840, status: 'Approved' },
  { type: 'blood', name: 'Rajesh Adhikari', contact: '9838901234', blood_group: 'AB-', city: 'Pokhara', district: 'Pokhara', date_of_birth: '1984-09-25', gender: 'Male', email: 'rajesh.adhikari@example.com', address: 'Nayabazar, Pokhara', emergency_contact: '9835678901', location_text: 'Nayabazar, Pokhara', latitude: 28.2040, longitude: 83.9800, status: 'Approved' },

  // Chitwan District
  { type: 'blood', name: 'Bikash Rai', contact: '9841234567', blood_group: 'O+', city: 'Bharatpur', district: 'Chitwan', date_of_birth: '1987-08-25', gender: 'Male', email: 'bikash.rai.chitwan@example.com', address: 'Bharatpur, Chitwan', emergency_contact: '9847654321', location_text: 'Bharatpur, Chitwan', latitude: 27.6820, longitude: 84.4300, status: 'Approved' },
  { type: 'blood', name: 'Mina Chaudhary', contact: '9842345678', blood_group: 'A+', city: 'Bharatpur', district: 'Chitwan', date_of_birth: '1994-01-15', gender: 'Female', email: 'mina.chaudhary@example.com', address: 'Sauraha, Chitwan', emergency_contact: '9848765432', location_text: 'Sauraha, Chitwan', latitude: 27.5750, longitude: 84.4900, status: 'Approved' },
  { type: 'blood', name: 'Shyam Lamichhane', contact: '9843456789', blood_group: 'B+', city: 'Bharatpur', district: 'Chitwan', date_of_birth: '1989-05-20', gender: 'Male', email: 'shyam.lamichhane@example.com', address: 'Ratnanagar, Chitwan', emergency_contact: '9849876543', location_text: 'Ratnanagar, Chitwan', latitude: 27.6600, longitude: 84.3800, status: 'Approved' },
  { type: 'blood', name: 'Sita Ghimire', contact: '9844567890', blood_group: 'AB+', city: 'Bharatpur', district: 'Chitwan', date_of_birth: '1996-09-10', gender: 'Female', email: 'sita.ghimire@example.com', address: 'Patihani, Chitwan', emergency_contact: '9841234567', location_text: 'Patihani, Chitwan', latitude: 27.6800, longitude: 84.4400, status: 'Approved' },
  { type: 'blood', name: 'Raj Kumar', contact: '9845678901', blood_group: 'O-', city: 'Bharatpur', district: 'Chitwan', date_of_birth: '1985-03-28', gender: 'Male', email: 'raj.kumar@example.com', address: 'Madi, Chitwan', emergency_contact: '9842345678', location_text: 'Madi, Chitwan', latitude: 27.5500, longitude: 84.3500, status: 'Approved' },

  // Biratnagar District
  { type: 'blood', name: 'Sunita Magar', contact: '9851234567', blood_group: 'A+', city: 'Biratnagar', district: 'Biratnagar', date_of_birth: '1993-11-12', gender: 'Female', email: 'sunita.magar.biratnagar@example.com', address: 'Biratnagar', emergency_contact: '9857654321', location_text: 'Biratnagar', latitude: 26.4810, longitude: 87.2730, status: 'Approved' },
  { type: 'blood', name: 'Dipendra Yadav', contact: '9852345678', blood_group: 'B+', city: 'Biratnagar', district: 'Biratnagar', date_of_birth: '1990-07-05', gender: 'Male', email: 'dipendra.yadav@example.com', address: 'Damak, Biratnagar', emergency_contact: '9858765432', location_text: 'Damak, Biratnagar', latitude: 26.6800, longitude: 87.7000, status: 'Approved' },
  { type: 'blood', name: 'Rupa Limbu', contact: '9853456789', blood_group: 'AB+', city: 'Biratnagar', district: 'Biratnagar', date_of_birth: '1995-12-18', gender: 'Female', email: 'rupa.limbu@example.com', address: 'Dharan, Biratnagar', emergency_contact: '9859876543', location_text: 'Dharan, Biratnagar', latitude: 26.8100, longitude: 87.2800, status: 'Approved' },
  { type: 'blood', name: 'Manoj Shah', contact: '9854567890', blood_group: 'O-', city: 'Biratnagar', district: 'Biratnagar', date_of_birth: '1986-04-22', gender: 'Male', email: 'manoj.shah@example.com', address: 'Itahari, Biratnagar', emergency_contact: '9851234567', location_text: 'Itahari, Biratnagar', latitude: 26.7800, longitude: 87.2700, status: 'Approved' },
  { type: 'blood', name: 'Anita Bishwakarma', contact: '9855678901', blood_group: 'B-', city: 'Biratnagar', district: 'Biratnagar', date_of_birth: '1997-08-30', gender: 'Female', email: 'anita.bishwakarma@example.com', address: 'Biratnagar', emergency_contact: '9852345678', location_text: 'Biratnagar', latitude: 26.4790, longitude: 87.2710, status: 'Approved' },

  // Butwal District
  { type: 'blood', name: 'Rajesh Hamal', contact: '9861234567', blood_group: 'O+', city: 'Butwal', district: 'Butwal', date_of_birth: '1985-04-05', gender: 'Male', email: 'rajesh.hamal.butwal@example.com', address: 'Butwal', emergency_contact: '9867654321', location_text: 'Butwal', latitude: 27.7030, longitude: 83.4400, status: 'Approved' },
  { type: 'blood', name: 'Sarita Pun', contact: '9862345678', blood_group: 'A+', city: 'Butwal', district: 'Butwal', date_of_birth: '1992-10-15', gender: 'Female', email: 'sarita.pun@example.com', address: 'Siddharthanagar, Butwal', emergency_contact: '9868765432', location_text: 'Siddharthanagar, Butwal', latitude: 27.4980, longitude: 83.4100, status: 'Approved' },
  { type: 'blood', name: 'Prakash Gurung', contact: '9863456789', blood_group: 'B+', city: 'Butwal', district: 'Butwal', date_of_birth: '1988-02-25', gender: 'Male', email: 'prakash.gurung@example.com', address: 'Lumbini, Butwal', emergency_contact: '9869876543', location_text: 'Lumbini, Butwal', latitude: 27.4950, longitude: 83.2720, status: 'Approved' },
  { type: 'blood', name: 'Ritu Sharma', contact: '9864567890', blood_group: 'AB+', city: 'Butwal', district: 'Butwal', date_of_birth: '1994-06-15', gender: 'Female', email: 'ritu.sharma@example.com', address: 'Butwal Bazaar', emergency_contact: '9861234567', location_text: 'Butwal Bazaar', latitude: 27.7050, longitude: 83.4450, status: 'Approved' },
  { type: 'blood', name: 'Anil Giri', contact: '9865678901', blood_group: 'O-', city: 'Butwal', district: 'Butwal', date_of_birth: '1989-03-01', gender: 'Male', email: 'anil.giri@example.com', address: 'Tilottama, Butwal', emergency_contact: '9862345678', location_text: 'Tilottama, Butwal', latitude: 27.6700, longitude: 83.4200, status: 'Approved' }
];

// Helper to get info links data
const getInfoLinksData = () => [
  { name: 'Nepal Department of Hydrology and Meteorology', url: 'http://www.dhm.gov.np/', description: 'Official weather forecasts, rainfall data, flood warnings, and river level monitoring for Nepal.', category: 'Weather' },
  { name: 'Nepal Police - Emergency Services', url: 'https://www.nepalpolice.gov.np/', description: 'Official Nepal Police website with emergency contact numbers and safety information.', category: 'Emergency' },
  { name: 'Nepal Red Cross Society', url: 'https://www.nrcs.org/', description: 'Disaster relief, blood donation services, and emergency medical response information.', category: 'Disaster Relief' },
  { name: 'National Disaster Risk Reduction and Management Authority', url: 'http://www.ndrrma.gov.np/', description: 'Government agency for disaster risk reduction, preparedness, and response in Nepal.', category: 'Disaster Relief' },
  { name: 'Nepal Earthquake Safety Information', url: 'https://www.nepal.gov.np/', description: 'Official government guidelines and safety information for earthquake preparedness.', category: 'Earthquake' },
  { name: 'Women\'s Rehabilitation Centre (WOREC)', url: 'https://www.worec.org.np/', description: 'Support and resources for women and children facing violence and abuse in Nepal.', category: 'Women & Child Safety' },
  { name: 'Cyber Security Nepal', url: 'https://www.cyber.gov.np/', description: 'Online safety tips, reporting cybercrimes, and digital security resources.', category: 'Cyber Safety' },
  { name: 'Fire Safety Nepal', url: 'https://www.nepalpolice.gov.np/fire-service/', description: 'Fire safety guidelines and emergency fire service contact information.', category: 'Fire Safety' }
];

// Reseed function
export const reseedDatabase = async () => {
  const c = getClient();
  let contactsCount = 0;
  let donorsCount = 0;
  let servicesCount = 0;
  let infoLinksCount = 0;

  try {
    // Truncate tables for reseed
    await c.execute('DELETE FROM contacts');
    await c.execute('DELETE FROM donors');
    await c.execute('DELETE FROM nearby_services');
    await c.execute('DELETE FROM info_links');

    // Reset auto increments
    await c.execute("DELETE FROM sqlite_sequence WHERE name IN ('contacts', 'donors', 'nearby_services', 'info_links')");

    // Seed admin
    const adminCountRes = await c.execute("SELECT COUNT(*) as count FROM admin_session WHERE username = 'Titans' COLLATE NOCASE");
    const adminCount = Number(adminCountRes.rows[0].count);
    if (adminCount === 0) {
      await c.execute('DELETE FROM admin_session');
      await c.execute({
        sql: 'INSERT INTO admin_session (username, password) VALUES (?, ?)',
        args: ['Titans', 'ASM']
      });
    }

    // Seed contacts
    const contactsJsonPath = path.join(process.cwd(), 'public', 'data', 'contacts.json');
    if (fs.existsSync(contactsJsonPath)) {
      const contactsData = JSON.parse(fs.readFileSync(contactsJsonPath, 'utf-8'));
      if (contactsData.length > 0) {
        const contactStmts = contactsData.map((co: any) => ({
          sql: 'INSERT INTO contacts (name, number, category, description, district, location_text, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            co.name, co.number, co.category, co.description || null,
            co.district || null, co.location_text || null, co.latitude || null, co.longitude || null
          ]
        }));
        await c.batch(contactStmts, 'write');
        contactsCount = contactsData.length;
      }
    }

    // Seed nearby services
    const servicesData = getServicesData();
    if (servicesData.length > 0) {
      const servicesStmts = servicesData.map((service) => ({
        sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          service.name, service.type, service.phone, service.location,
          service.district, service.latitude, service.longitude
        ]
      }));
      await c.batch(servicesStmts, 'write');
      servicesCount = servicesData.length;
    }

    // Seed donors
    const donorsData = getDonorsData();
    if (donorsData.length > 0) {
      const donorsStmts = donorsData.map((donor) => ({
        sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          donor.type, donor.name, donor.contact, donor.blood_group,
          donor.city, donor.district, donor.date_of_birth, donor.gender,
          donor.email, donor.address, donor.emergency_contact, donor.location_text,
          donor.latitude, donor.longitude, donor.status
        ]
      }));
      await c.batch(donorsStmts, 'write');
      donorsCount = donorsData.length;
    }

    // Seed info links
    const infoLinksData = getInfoLinksData();
    if (infoLinksData.length > 0) {
      const linksStmts = infoLinksData.map((link) => ({
        sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
        args: [link.name, link.url, link.description, link.category]
      }));
      await c.batch(linksStmts, 'write');
      infoLinksCount = infoLinksData.length;
    }

    return {
      success: true,
      contactsInserted: contactsCount,
      donorsInserted: donorsCount,
      servicesInserted: servicesCount,
      infoLinksInserted: infoLinksCount
    };
  } catch (error) {
    console.error('Error reseeding database:', error);
    throw error;
  }
};

// Original seed function (for backward compatibility)
const seedDatabase = async () => {
  const c = getClient();
  
  // 1. Seed Admin
  const adminCountRes = await c.execute("SELECT COUNT(*) as count FROM admin_session WHERE username = 'Titans' COLLATE NOCASE");
  const adminCount = Number(adminCountRes.rows[0].count);
  if (adminCount === 0) {
    await c.execute('DELETE FROM admin_session');
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
          sql: 'INSERT INTO contacts (name, number, category, description, district, location_text, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
    const servicesData = getServicesData();
    const stmts = servicesData.map(service => ({
      sql: 'INSERT INTO nearby_services (name, type, phone, location, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        service.name, service.type, service.phone, service.location,
        service.district, service.latitude, service.longitude
      ]
    }));
    await c.batch(stmts, 'write');
  }

  // 4. Seed Donors
  const donorsCountRes = await c.execute('SELECT COUNT(*) as count FROM donors');
  const donorsCount = Number(donorsCountRes.rows[0].count);
  if (donorsCount === 0) {
    const donorsData = getDonorsData();
    const stmts = donorsData.map(donor => ({
      sql: 'INSERT INTO donors (type, name, contact, blood_group, city, district, date_of_birth, gender, email, address, emergency_contact, location_text, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        donor.type, donor.name, donor.contact, donor.blood_group,
        donor.city, donor.district, donor.date_of_birth, donor.gender,
        donor.email, donor.address, donor.emergency_contact, donor.location_text,
        donor.latitude, donor.longitude, donor.status
      ]
    }));
    await c.batch(stmts, 'write');
  }

  // 5. Seed Info Links
  const infoLinksCountRes = await c.execute('SELECT COUNT(*) as count FROM info_links');
  const infoLinksCount = Number(infoLinksCountRes.rows[0].count);
  if (infoLinksCount === 0) {
    const linksData = getInfoLinksData();
    const stmts = linksData.map(link => ({
      sql: 'INSERT INTO info_links (name, url, description, category) VALUES (?, ?, ?, ?)',
      args: [link.name, link.url, link.description, link.category]
    }));
    await c.batch(stmts, 'write');
  }
};

export const initDb = async () => {
  await initializeSchema();
  await seedDatabase();
};

export default { getClient };
