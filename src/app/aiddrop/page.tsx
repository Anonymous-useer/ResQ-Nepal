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
  User, 
  Mail, 
  Calendar, 
  Building,
  FileText,
  X
} from 'lucide-react';
import LocationInput, { LocationData } from '@/components/LocationInput';
import { validateNepaliPhone, validateEmail, validateRequired, validateMedicalReportFile } from '@/lib/validation';

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
  const [medicalReport, setMedicalReport] = useState<File | null>(null);
  const [medicalReportPreview, setMedicalReportPreview] = useState<string | null>(null);
  const [isSubmittingDonor, setIsSubmittingDonor] = useState(false);
  const [donorSuccess, setDonorSuccess] = useState(false);
  const [donorError, setDonorError] = useState<string | null>(null);
  const [donorFormErrors, setDonorFormErrors] = useState<{
    name?: string;
    contact?: string;
    email?: string;
    city?: string;
    address?: string;
    emergencyContact?: string;
    dateOfBirth?: string;
    gender?: string;
    medicalReport?: string;
  }>({});

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
    setDonorFormErrors({});

    // --- Validate ---
    const newErrors: typeof donorFormErrors = {};
    if (!validateRequired(donorName)) {
      newErrors.name = 'Name is required';
    }
    if (!validateNepaliPhone(donorContact)) {
      newErrors.contact = 'Phone must be 98 or 97 followed by 8 digits';
    }
    if (!validateRequired(donorEmail)) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(donorEmail)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!validateRequired(donorCity)) {
      newErrors.city = 'City is required';
    }
    if (!validateRequired(donorAddress)) {
      newErrors.address = 'Address is required';
    }
    if (!validateNepaliPhone(donorEmergencyContact)) {
      newErrors.emergencyContact = 'Emergency contact must be 98 or 97 followed by 8 digits';
    }
    if (!validateRequired(donorDateOfBirth)) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!validateRequired(donorGender)) {
      newErrors.gender = 'Gender is required';
    }
    if (!medicalReport) {
      newErrors.medicalReport = 'Medical report is required';
    } else {
      const fileValidation = validateMedicalReportFile(medicalReport);
      if (!fileValidation.valid) {
        newErrors.medicalReport = fileValidation.message;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setDonorFormErrors(newErrors);
      setIsSubmittingDonor(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('type', 'blood');
      formData.append('name', donorName);
      formData.append('contact', donorContact);
      formData.append('blood_group', donorBloodGroup);
      formData.append('city', donorCity);
      formData.append('district', donorLocationData.district || '');
      formData.append('date_of_birth', donorDateOfBirth);
      formData.append('gender', donorGender);
      formData.append('email', donorEmail);
      formData.append('address', donorAddress);
      formData.append('emergency_contact', donorEmergencyContact);
      formData.append('location_text', donorLocationData.locationText || '');
      if (donorLocationData.latitude) formData.append('latitude', donorLocationData.latitude.toString());
      if (donorLocationData.longitude) formData.append('longitude', donorLocationData.longitude.toString());
      if (medicalReport) {
        formData.append('medical_report', medicalReport);
      }

      const res = await fetch('/api/donors', {
        method: 'POST',
        body: formData
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
        setMedicalReport(null);
        setMedicalReportPreview(null);
        setDonorFormErrors({});
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

  const handleMedicalReportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMedicalReport(file);
    if (file) {
      if (file.type.startsWith('image/')) {
        // Image preview
        setMedicalReportPreview(URL.createObjectURL(file));
      } else {
        // For non-image files, just show filename
        setMedicalReportPreview(null);
      }
    } else {
      setMedicalReportPreview(null);
    }
    // Clear error when user selects a file
    if (donorFormErrors.medicalReport) {
      setDonorFormErrors(prev => ({ ...prev, medicalReport: undefined }));
    }
  };

  const removeMedicalReport = () => {
    setMedicalReport(null);
    setMedicalReportPreview(null);
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
                    onChange={(e) => {
                      setDonorName(e.target.value);
                      if (donorFormErrors.name) {
                        setDonorFormErrors(prev => ({ ...prev, name: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.name ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.name && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 98xxxxxxxx"
                    value={donorContact}
                    onChange={(e) => {
                      setDonorContact(e.target.value);
                      if (donorFormErrors.contact) {
                        setDonorFormErrors(prev => ({ ...prev, contact: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.contact ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.contact && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.contact}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Blood Group</label>
                  <select
                    value={donorBloodGroup}
                    onChange={(e) => setDonorBloodGroup(e.target.value)}
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
                    onChange={(e) => {
                      setDonorDateOfBirth(e.target.value);
                      if (donorFormErrors.dateOfBirth) {
                        setDonorFormErrors(prev => ({ ...prev, dateOfBirth: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.dateOfBirth ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.dateOfBirth && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.dateOfBirth}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Gender</label>
                  <select
                    value={donorGender}
                    onChange={(e) => {
                      setDonorGender(e.target.value);
                      if (donorFormErrors.gender) {
                        setDonorFormErrors(prev => ({ ...prev, gender: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.gender ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  >
                    <option value="">Select</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {donorFormErrors.gender && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.gender}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ram@example.com"
                    value={donorEmail}
                    onChange={(e) => {
                      setDonorEmail(e.target.value);
                      if (donorFormErrors.email) {
                        setDonorFormErrors(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.email ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.email && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu"
                    value={donorCity}
                    onChange={(e) => {
                      setDonorCity(e.target.value);
                      if (donorFormErrors.city) {
                        setDonorFormErrors(prev => ({ ...prev, city: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.city ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.city && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.city}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111318]">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. 98xxxxxxxx"
                    value={donorEmergencyContact}
                    onChange={(e) => {
                      setDonorEmergencyContact(e.target.value);
                      if (donorFormErrors.emergencyContact) {
                        setDonorFormErrors(prev => ({ ...prev, emergencyContact: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none ${donorFormErrors.emergencyContact ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                  />
                  {donorFormErrors.emergencyContact && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.emergencyContact}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Address</label>
                <textarea
                  placeholder="Full address"
                  rows={2}
                  value={donorAddress}
                  onChange={(e) => {
                    setDonorAddress(e.target.value);
                    if (donorFormErrors.address) {
                      setDonorFormErrors(prev => ({ ...prev, address: undefined }));
                    }
                  }}
                  className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none resize-none ${donorFormErrors.address ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                />
                {donorFormErrors.address && <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.address}</p>}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Past Medical Report *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleMedicalReportChange}
                  className={`bg-white border rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none file:mr-2 file:py-1 file:px-2 file:border-0 file:rounded file:bg-[#1B4FD8] file:text-white file:text-xs file:cursor-pointer ${donorFormErrors.medicalReport ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC] focus:border-[#1B4FD8]'}`}
                />
                <p className="text-[10px] text-[#9AA0AD]">
                  Upload a recent medical report or eligibility document (PDF, JPEG, PNG, WEBP — max 10 MB).
                </p>
                {medicalReport && (
                  <div className="mt-2 p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md flex items-center gap-3">
                    {medicalReport.type.startsWith('image/') && medicalReportPreview ? (
                      <img
                        src={medicalReportPreview}
                        alt="Medical report preview"
                        className="h-16 w-20 object-cover rounded-md border border-[#E4E7EC]"
                      />
                    ) : (
                      <FileText className="h-10 w-10 text-[#5A6072]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111318] truncate">{medicalReport.name}</p>
                      <p className="text-[10px] text-[#9AA0AD]">
                        {(medicalReport.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeMedicalReport}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {donorFormErrors.medicalReport && (
                  <p className="text-[10px] text-red-600 font-semibold">{donorFormErrors.medicalReport}</p>
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
