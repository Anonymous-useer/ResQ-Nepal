'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { 
  Heart, 
  Search, 
  Users, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Send, 
  LocateFixed, 
  User, 
  Mail, 
  Calendar, 
  Building
} from 'lucide-react';
import LocationInput, { LocationData } from '@/components/LocationInput';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = ['Male', 'Female', 'Other'];



export default function AidDropPage() {
  const [activeTab, setActiveTab] = useState<'donor' | 'recipient'>('donor');
  
  // --- Donor Form States ---
  const [donorName, setDonorName] = useState('');
  const [donorContact, setDonorContact] = useState('');
  const [donorBloodGroup, setDonorBloodGroup] = useState('O+');
  const [donorCity, setDonorCity] = useState('');
  const [donorDateOfBirth, setDonorDateOfBirth] = useState('');
  const [donorGender, setDonorGender] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [donorEmergencyContact, setDonorEmergencyContact] = useState('');
  const [donorLocationData, setDonorLocationData] = useState<LocationData>({
    locationText: '',
    district: null,
    latitude: null,
    longitude: null
  });
  const [isSubmittingDonor, setIsSubmittingDonor] = useState(false);
  const [donorSuccess, setDonorSuccess] = useState(false);
  const [donorError, setDonorError] = useState<string | null>(null);

  // --- Recipient Search States ---
  const [searchBloodGroup, setSearchBloodGroup] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  
  // Fetch donors data
  const { data: bloodDonors = [], mutate: mutateDonors } = useSWR(
    '/api/donors?type=blood&status=Approved',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  
  // Fetch nearby services data
  const { data: nearbyServices = [] } = useSWR(
    '/api/services',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Filter blood donors
  const filteredBloodDonors = bloodDonors.filter((d: any) => {
    const matchesGroup = searchBloodGroup === 'All' || d.blood_group === searchBloodGroup;
    const matchesCity = !searchCity || 
      (d.city?.toLowerCase().includes(searchCity.toLowerCase())) || 
      (d.location_text?.toLowerCase().includes(searchCity.toLowerCase()));
    return matchesGroup && matchesCity;
  });

  // --- Donor form submission ---
  const handleDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDonor(true);
    setDonorSuccess(false);
    setDonorError(null);

    try {
      const res = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blood',
          name: donorName,
          contact: donorContact,
          blood_group: donorBloodGroup,
          city: donorCity,
          district: donorLocationData.district,
          date_of_birth: donorDateOfBirth,
          gender: donorGender,
          email: donorEmail,
          address: donorAddress,
          emergency_contact: donorEmergencyContact,
          location_text: donorLocationData.locationText,
          latitude: donorLocationData.latitude,
          longitude: donorLocationData.longitude,
        }),
      });

      if (res.ok) {
        setDonorSuccess(true);
        mutateDonors();
        // Reset form
        setDonorName('');
        setDonorContact('');
        setDonorBloodGroup('O+');
        setDonorCity('');
        setDonorDateOfBirth('');
        setDonorGender('');
        setDonorEmail('');
        setDonorAddress('');
        setDonorEmergencyContact('');
        setDonorLocationData({
          locationText: '',
          district: null,
          latitude: null,
          longitude: null
        });
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register');
      }
    } catch (err: any) {
      setDonorError(err.message);
    } finally {
      setIsSubmittingDonor(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
      <title>Blood Donation Network — ResQ Nepal</title>

      {/* Header */}
      <section className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold text-[#111318] tracking-tight">Blood Donation Network</h1>
        <p className="text-xs text-[#5A6072] leading-relaxed">
          Register as a donor or find blood donors and nearby services in your area.
        </p>
      </section>

      {/* Tab selector */}
      <div className="flex gap-2 bg-white border border-[#E4E7EC] p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('donor')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'donor'
              ? 'bg-[#D72638] text-white'
              : 'text-[#5A6072] hover:text-[#111318]'
          }`}
        >
          Register as Donor
        </button>
        <button
          onClick={() => setActiveTab('recipient')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'recipient'
              ? 'bg-[#D72638] text-white'
              : 'text-[#5A6072] hover:text-[#111318]'
          }`}
        >
          Find Donors / Services
        </button>
      </div>

      {activeTab === 'donor' ? (
        <section className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] max-w-2xl w-full mx-auto">
          {donorSuccess ? (
            <div className="flex flex-col items-center text-center p-6 gap-4">
              <span className="p-3 bg-green-100 text-[#16A34A] rounded-full">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <div>
                <h3 className="font-bold text-base text-green-800">Registered Successfully!</h3>
                <p className="text-[11px] text-green-700 mt-1.5 leading-relaxed">
                  You are eligible to donate at the nearest available location. We will contact you soon.
                </p>
              </div>
              <button
                onClick={() => setDonorSuccess(false)}
                className="text-xs text-[#1B4FD8] hover:underline font-semibold"
              >
                Register another donor
              </button>
            </div>
          ) : (
            <form onSubmit={handleDonorSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <User className="h-3 w-3" /> Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ram Shrestha"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 98xxxxxxxx"
                    value={donorContact}
                    onChange={(e) => setDonorContact(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Blood Group</label>
                  <select
                    value={donorBloodGroup}
                    onChange={(e) => setDonorBloodGroup(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={donorDateOfBirth}
                    onChange={(e) => setDonorDateOfBirth(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Gender</label>
                  <select
                    value={donorGender}
                    onChange={(e) => setDonorGender(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  >
                    <option value="">Select</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ram@example.com"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu"
                    value={donorCity}
                    onChange={(e) => setDonorCity(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. 98xxxxxxxx"
                    value={donorEmergencyContact}
                    onChange={(e) => setDonorEmergencyContact(e.target.value)}
                    required
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Address</label>
                <textarea
                  placeholder="Full address"
                  rows={2}
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                  required
                  className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Location</label>
                <LocationInput
                  value={donorLocationData}
                  onChange={setDonorLocationData}
                  placeholder="e.g. Patan Dhoka"
                />
                {donorLocationData.latitude && donorLocationData.longitude && (
                  <p className="text-[10px] text-[#9AA0AD] mt-1">
                    Lat: {parseFloat(donorLocationData.latitude.toString()).toFixed(4)}, Lon: {parseFloat(donorLocationData.longitude.toString()).toFixed(4)}
                  </p>
                )}
              </div>

              {donorError && <p className="text-xs text-[#DC2626] font-semibold">{donorError}</p>}

              <button
                type="submit"
                disabled={isSubmittingDonor}
                className="w-full h-10 bg-[#D72638] hover:bg-[#D72638]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors mt-1 flex items-center justify-center gap-2 disabled:opacity-75"
              >
                <Heart className="h-4 w-4" />
                {isSubmittingDonor ? 'Registering...' : 'Register as Donor'}
              </button>
            </form>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
          {/* Donor search */}
          <section className="flex flex-col gap-6">
            <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-4">
              <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-4 w-4 text-[#1B4FD8]" /> Find Donors
              </h2>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AD]">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by city..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg pl-10 pr-4 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <select
                  value={searchBloodGroup}
                  onChange={(e) => setSearchBloodGroup(e.target.value)}
                  className="bg-white border border-[#E4E7EC] rounded-lg px-3 py-2 text-xs text-[#111318] focus:outline-none"
                >
                  <option value="All">All Groups</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 max-h-[450px] overflow-y-auto">
              {filteredBloodDonors.length === 0 ? (
                <div className="text-center py-12 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#9AA0AD] italic">
                  No approved donors match your filters.
                </div>
              ) : (
                filteredBloodDonors.map((d: any) => (
                  <div
                    key={d.id}
                    className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-full bg-[#D72638] text-white flex items-center justify-center font-extrabold text-sm font-mono tracking-wider shadow-sm">
                        {d.blood_group}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-[#111318]">{d.name}</span>
                        {d.city && (
                          <span className="text-xs text-[#5A6072] flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#9AA0AD]" /> {d.city}
                          </span>
                        )}
                        {d.location_text && (
                          <span className="text-[10px] text-[#9AA0AD]">{d.location_text}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`tel:${d.contact}`}
                        className="flex items-center gap-1 px-3 py-2 bg-[#1B4FD8] hover:bg-[#1B4FD8]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                      {d.latitude && d.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=15/${d.latitude}/${d.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-[#16A34A] hover:bg-[#16A34A]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Map
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Nearby services */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4 text-[#1B4FD8]" /> Nearby Services
            </h2>
            <div className="flex flex-col gap-3">
              {nearbyServices.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-sm text-[#111318]">{s.name}</h3>
                      <p className="text-[10px] text-[#9AA0AD] uppercase font-mono">{s.type}</p>
                      <p className="text-xs text-[#5A6072] flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-[#9AA0AD]" /> {s.district && s.district}{s.district && s.location && ' - '}{s.location}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-1 px-3 py-2 bg-[#D72638] hover:bg-[#D72638]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                      {s.latitude && s.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=15/${s.latitude}/${s.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-[#16A34A] hover:bg-[#16A34A]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Map
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
