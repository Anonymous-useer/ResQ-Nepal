'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { ShieldAlert, FileText, Search, UserCheck, Send, MapPin, User } from 'lucide-react';
import { formatNPT } from '@/lib/utils';
import LocationInput, { LocationData, extractDistrict } from '@/components/LocationInput';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COMPLAINT_CATEGORIES = ['General', 'Infrastructure', 'Public Service', 'Safety', 'Utility', 'Other'];

export default function VoiceBoxPage() {
  // --- Complaint Box States ---
  const [subject, setSubject] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('General');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complainantName, setComplainantName] = useState('');
  const [complainantPhone, setComplainantPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>({
    locationText: '',
    district: null,
    latitude: null,
    longitude: null,
  });
  const [isLodging, setIsLodging] = useState(false);
  const [lodgeSuccess, setLodgeSuccess] = useState<any | null>(null);
  const [lodgeError, setLodgeError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // --- Status Checker States ---
  const [checkId, setCheckId] = useState('');
  const [checkedComplaint, setCheckedComplaint] = useState<any | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [myComplaints, setMyComplaints] = useState<any[]>([]);

  // Load my complaints from sessionStorage on client
  useEffect(() => {
    const saved = sessionStorage.getItem('resq_my_complaints');
    if (saved) {
      try {
        setMyComplaints(JSON.parse(saved));
      } catch {
        setMyComplaints([]);
      }
    }
  }, []);

  // --- Lodge Complaint Handler ---
  const handleLodgeComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLodging(true);
    setLodgeSuccess(null);
    setLodgeError(null);

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('category', complaintCategory);
      formData.append('description', complaintDesc);
      if (!isAnonymous) {
        formData.append('complainant_name', complainantName);
        formData.append('complainant_phone', complainantPhone);
      }
      if (locationData.locationText) formData.append('location_text', locationData.locationText);
      if (locationData.district) formData.append('district', locationData.district);
      if (locationData.latitude) formData.append('latitude', locationData.latitude.toString());
      if (locationData.longitude) formData.append('longitude', locationData.longitude.toString());
      formData.append('is_anonymous', isAnonymous.toString());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      setLodgeSuccess(data);
      // Save code to session storage and update state
      const newComplaints = [data, ...myComplaints];
      setMyComplaints(newComplaints);
      sessionStorage.setItem('resq_my_complaints', JSON.stringify(newComplaints));

      // Reset
      setSubject('');
      setComplaintDesc('');
      setComplainantName('');
      setComplainantPhone('');
      setIsAnonymous(false);
      setLocationData({
        locationText: '',
        district: null,
        latitude: null,
        longitude: null,
      });
      setSelectedImage(null);
    } catch (err: any) {
      setLodgeError(err.message || 'Error filing complaint.');
    } finally {
      setIsLodging(false);
    }
  };

  // --- Check Status Handler ---
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkId.trim()) return;

    setCheckLoading(true);
    setCheckedComplaint(null);
    setCheckError(null);

    try {
      const res = await fetch(`/api/complaints?complaint_id=${encodeURIComponent(checkId.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Complaint ID not found');
      }

      setCheckedComplaint(data);
    } catch (err: any) {
      setCheckError(err.message || 'Error searching complaint ID.');
    } finally {
      setCheckLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-[#FEF3C7] text-[#D97706] border-yellow-200';
      case 'Under Review':
        return 'bg-[#DBEAFE] text-[#1B4FD8] border-blue-200';
      case 'Resolved':
        return 'bg-[#DCFCE7] text-[#16A34A] border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
      <title>Complaint Portal — ResQ Nepal</title>
      
      {/* Header */}
      <section className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold text-[#111318] tracking-tight">Complaint Portal</h1>
        <p className="text-xs text-[#5A6072] leading-relaxed">
          File official grievances regarding public utilities, infrastructure, or safety, and track their status.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
        
        {/* Complaint Form */}
        <section className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-4 h-fit">
          <div className="pb-3 border-b border-[#E4E7EC] mb-5">
            <h2 className="font-extrabold text-sm text-[#111318] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#D72638]" />
              File Formal Complaint
            </h2>
          </div>

          {lodgeSuccess ? (
            <div className="flex flex-col items-center text-center p-6 bg-green-50 border border-green-200 rounded-xl gap-3">
              <span className="p-2.5 bg-green-100 text-[#16A34A] rounded-full">
                <UserCheck className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-green-800">Complaint Logged Successfully</h3>
                <p className="text-[11px] text-green-700 mt-1.5 leading-relaxed">
                  Save this complaint ID. Use it in the Checker tab to track updates:
                </p>
                <div className="mt-3 px-4 py-2 bg-white border border-green-200 rounded-lg inline-block font-mono text-xs font-bold text-[#111318] tracking-widest shadow-sm">
                  {lodgeSuccess.complaint_id}
                </div>
              </div>
              <button
                onClick={() => setLodgeSuccess(null)}
                className="text-xs text-[#1B4FD8] hover:underline font-semibold"
              >
                File another complaint
              </button>
            </div>
          ) : (
            <form onSubmit={handleLodgeComplaint} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="anonymous"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-gray-300 text-[#D72638] focus:ring-[#D72638]"
                />
                <label htmlFor="anonymous" className="text-xs font-semibold text-[#5A6072]">
                  Submit Anonymously
                </label>
              </div>

              {!isAnonymous && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#111318] flex items-center gap-1">
                      <User className="h-3 w-3" /> Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ram Shrestha"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#111318]">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 98xxxxxxxx"
                      value={complainantPhone}
                      onChange={(e) => setComplainantPhone(e.target.value)}
                      className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Pipeline leak in Ward 4"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Location</label>
                <LocationInput
                  value={locationData}
                  onChange={setLocationData}
                  placeholder="e.g. Patan Dhoka, Lalitpur"
                />
                {locationData.latitude && locationData.longitude && (
                  <p className="text-[10px] text-[#9AA0AD] mt-1">
                    Lat: {parseFloat(locationData.latitude.toString()).toFixed(4)}, Lon: {parseFloat(locationData.longitude.toString()).toFixed(4)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Complaint Description</label>
                <textarea
                  placeholder="Provide details about the utility breakdown, local hazard, or public service delay..."
                  rows={4}
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  required
                  className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111318]">Upload Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  className="bg-white border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8] file:mr-2 file:py-1 file:px-2 file:border-0 file:rounded file:bg-[#1B4FD8] file:text-white file:text-xs file:cursor-pointer"
                />
                {selectedImage && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Selected"
                      className="w-full h-32 object-cover rounded-md border border-[#E4E7EC]"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="mt-1 text-[10px] text-[#DC2626] font-semibold"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              {lodgeError && <p className="text-xs text-[#DC2626] font-semibold">{lodgeError}</p>}

              <button
                type="submit"
                disabled={isLodging}
                className="w-full h-10 bg-[#D72638] hover:bg-[#D72638]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors mt-1 flex items-center justify-center gap-2 disabled:opacity-75"
              >
                <Send className="h-4 w-4" />
                {isLodging ? 'Filing Ticket...' : 'File Grievance'}
              </button>
            </form>
          )}
        </section>

        {/* Status Checker and My Submissions */}
        <section className="flex flex-col gap-6">
          
          {/* Status Checker */}
          <section className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <div className="pb-2 border-b border-[#E4E7EC]">
              <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-4 w-4 text-[#1B4FD8]" /> Track Complaint Status
              </h2>
            </div>
            <form onSubmit={handleCheckStatus} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Complaint ID: CV-YYYYMMDD-XXXX"
                value={checkId}
                onChange={(e) => setCheckId(e.target.value)}
                className="flex-1 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md px-3 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
              />
              <button
                type="submit"
                disabled={checkLoading}
                className="bg-[#1B4FD8] hover:bg-[#1B4FD8]/95 text-white font-bold text-xs px-4 py-2 rounded-md transition-colors disabled:opacity-70"
              >
                Check
              </button>
            </form>

            {checkLoading && <p className="text-xs text-[#9AA0AD] italic text-center py-4">Searching ticket...</p>}
            {checkError && <p className="text-xs text-[#DC2626] font-semibold text-center py-4">{checkError}</p>}

            {/* Complaint Results Card */}
            {checkedComplaint && (
              <div className="border border-[#E4E7EC] rounded-lg p-4 bg-[#F7F8FA] flex flex-col gap-3.5 animate-in fade-in duration-150">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-xs font-extrabold text-[#111318]">
                    {checkedComplaint.complaint_id}
                  </span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${getStatusBadge(checkedComplaint.status)}`}>
                    {checkedComplaint.status}
                  </span>
                </div>

                {checkedComplaint.image_path && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#9AA0AD] text-[9px] uppercase font-mono">Photo</span>
                    <img
                      src={checkedComplaint.image_path}
                      alt="Complaint"
                      className="w-full h-40 object-cover rounded-md border border-[#E4E7EC] mt-1"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-[#9AA0AD] text-[9px] uppercase font-mono">Subject</span>
                  <span className="font-bold text-[#111318]">{checkedComplaint.subject}</span>
                </div>

                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-[#9AA0AD] text-[9px] uppercase font-mono">Category</span>
                  <span className="font-semibold text-[#111318]">{checkedComplaint.category}</span>
                </div>

                {checkedComplaint.location_text && (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[#9AA0AD] text-[9px] uppercase font-mono flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </span>
                    <span className="text-[#111318]">{checkedComplaint.location_text}</span>
                  </div>
                )}

                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-[#9AA0AD] text-[9px] uppercase font-mono">Details</span>
                  <p className="text-[#5A6072] text-[11px] leading-relaxed">
                    {checkedComplaint.description}
                  </p>
                </div>

                {/* Admin Response Block */}
                <div className="border-t border-[#E4E7EC] pt-3 mt-1">
                  <span className="text-[#9AA0AD] text-[9px] uppercase font-mono block mb-1">Official Response</span>
                  {checkedComplaint.admin_response ? (
                    <div className="bg-white border border-[#E4E7EC] rounded-md p-3 text-[11px] text-[#111318] leading-relaxed font-medium italic">
                      {checkedComplaint.admin_response}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#9AA0AD] italic block">
                      Awaiting response from local authorities.
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] text-[#9AA0AD] font-mono border-t border-[#E4E7EC] pt-2">
                  <span>Filed On</span>
                  <span>{formatNPT(checkedComplaint.created_at, 'full')}</span>
                </div>
              </div>
            )}
          </section>

          {/* Session Submissions */}
          <section className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <div className="pb-2 border-b border-[#E4E7EC]">
              <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#D72638]" /> My Recent Submissions
              </h2>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {myComplaints.length === 0 ? (
                <p className="text-xs text-[#9AA0AD] italic text-center py-12">
                  No complaints filed in this browser session.
                </p>
              ) : (
                myComplaints.map((comp: any) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setCheckedComplaint(comp);
                      setCheckId(comp.complaint_id);
                    }}
                    className="flex items-center justify-between p-3 border border-[#E4E7EC] hover:border-[#9AA0AD] rounded-lg cursor-pointer transition-colors bg-[#F7F8FA]/50 hover:bg-[#F7F8FA]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] font-bold text-[#111318]">
                        {comp.complaint_id}
                      </span>
                      <span className="text-[10px] text-[#5A6072] truncate max-w-[150px] md:max-w-[200px]">
                        {comp.subject}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadge(comp.status)}`}>
                      {comp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
