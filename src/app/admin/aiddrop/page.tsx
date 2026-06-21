'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Heart, Search, Plus, Trash2, X, Check, Ban, Edit, MapPin, Eye, FileText } from 'lucide-react';
import { formatNPT } from '@/lib/utils';
import { validateNepaliPhone, validateRequired } from '@/lib/validation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SERVICE_TYPES = ['Hospital', 'Blood Bank', 'Clinic'];
const DISTRICTS = ['All', 'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Biratnagar', 'Birgunj', 'Dharan', 'Butwal', 'Nepalgunj'];

export default function AdminAidDropPage() {
  const [activeTab, setActiveTab] = useState<'blood' | 'services'>('blood');
  
  // SWR Fetching
  const { data: donors = [], isLoading: donorsLoading, mutate: mutateDonors } = useSWR('/api/donors', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });
  const { data: services = [], isLoading: servicesLoading, mutate: mutateServices } = useSWR('/api/services', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });

  // Search/Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal control
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editService, setEditService] = useState<any | null>(null);
  const [viewDonorDetails, setViewDonorDetails] = useState<any | null>(null);

  // Form states for service
  const [serviceName, setServiceName] = useState('');
  const [serviceType, setServiceType] = useState('Hospital');
  const [servicePhone, setServicePhone] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceDistrict, setServiceDistrict] = useState('');
  const [serviceLatitude, setServiceLatitude] = useState('');
  const [serviceLongitude, setServiceLongitude] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    district?: string;
  }>({});

  // Reset pagination when tab changes
  const handleTabChange = (tab: 'blood' | 'services') => {
    setActiveTab(tab);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Status updates
  const handleUpdateStatus = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/donors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        mutateDonors();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open service modal
  const openAddServiceModal = () => {
    setEditService(null);
    setServiceName('');
    setServiceType('Hospital');
    setServicePhone('');
    setServiceLocation('');
    setServiceDistrict('');
    setServiceLatitude('');
    setServiceLongitude('');
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service: any) => {
    setEditService(service);
    setServiceName(service.name);
    setServiceType(service.type);
    setServicePhone(service.phone);
    setServiceLocation(service.location || '');
    setServiceDistrict(service.district || '');
    setServiceLatitude(service.latitude?.toString() || '');
    setServiceLongitude(service.longitude?.toString() || '');
    setIsServiceModalOpen(true);
  };

  // Service form submit
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormErrors({});

    // --- Validate ---
    const newErrors: typeof formErrors = {};
    if (!validateRequired(serviceName)) {
      newErrors.name = 'Name is required';
    }
    if (!validateNepaliPhone(servicePhone)) {
      newErrors.phone = 'Phone must be 98 or 97 followed by 8 digits';
    }
    if (!validateRequired(serviceDistrict)) {
      newErrors.district = 'District is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setSubmitLoading(false);
      return;
    }

    const payload = {
      name: serviceName,
      type: serviceType,
      phone: servicePhone,
      location: serviceLocation || null,
      district: serviceDistrict || null,
      latitude: serviceLatitude ? parseFloat(serviceLatitude) : null,
      longitude: serviceLongitude ? parseFloat(serviceLongitude) : null,
    };
    const method = editService ? 'PATCH' : 'POST';
    const endpoint = editService ? `/api/services/${editService.id}` : '/api/services';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        mutateServices();
        setIsServiceModalOpen(false);
        setFormErrors({});
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save service');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete service
  const handleDeleteService = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        mutateServices();
      } else {
        alert('Failed to delete service');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter data based on tab
  const getFilteredData = () => {
    if (activeTab === 'blood') {
      return donors.filter((d: any) => {
        if (d.type !== 'blood') return false;
        const searchLower = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(searchLower) ||
          d.contact.includes(searchQuery) ||
          (d.city && d.city.toLowerCase().includes(searchLower)) ||
          (d.blood_group && d.blood_group.toLowerCase().includes(searchLower))
        );
      });
    } else {
      return services.filter((s: any) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(searchLower) ||
          s.phone.includes(searchQuery) ||
          (s.location && s.location.toLowerCase().includes(searchLower)) ||
          (s.district && s.district.toLowerCase().includes(searchLower))
        );
      });
    }
  };

  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-[#DCFCE7] text-[#16A34A] border-green-200';
      case 'Rejected':
        return 'bg-red-50 text-[#D72638] border-red-200';
      case 'Pending':
      default:
        return 'bg-[#FEF3C7] text-[#D97706] border-yellow-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      <title>Manage AidDrop — ResQ Nepal</title>

      <section className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[#111318] flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#D72638]" /> Manage AidDrop Listings
          </h1>
          <p className="text-xs text-[#5A6072]">
            Verify blood donors and manage nearby hospitals/blood banks/clinics.
          </p>
        </div>

        {activeTab === 'services' && (
          <button
            onClick={openAddServiceModal}
            className="flex items-center gap-1 px-3.5 py-2 bg-[#D72638] hover:bg-[#D72638]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Service
          </button>
        )}
      </section>

      {/* Tabs */}
      <div className="flex border-b border-[#E4E7EC] gap-6 select-none overflow-x-auto no-scrollbar">
        {(['blood', 'services'] as const).map((tab) => {
          const labels = {
            blood: 'Blood Donors',
            services: 'Nearby Services',
          };
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-3 text-xs font-semibold relative whitespace-nowrap transition-colors ${
                activeTab === tab ? 'text-[#111318]' : 'text-[#9AA0AD] hover:text-[#5A6072]'
              }`}
            >
              {labels[tab]}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D72638]" />}
            </button>
          );
        })}
      </div>

      {/* Search Filter */}
      <div className="relative w-full select-none">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AD]">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder={`Search ${
            activeTab === 'blood'
              ? 'by donor name, city, group...'
              : 'by service name, phone, location...'
          }`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-white border border-[#E4E7EC] rounded-lg pl-10 pr-4 py-2 text-xs text-[#111318] focus:outline-none focus:border-[#1B4FD8]"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-[#E4E7EC] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-x-auto">
        {donorsLoading || servicesLoading ? (
          <p className="text-center py-12 text-xs text-[#9AA0AD] italic">Loading listings...</p>
        ) : paginatedData.length === 0 ? (
          <p className="text-center py-12 text-xs text-[#9AA0AD] italic">No records found matching filters.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E4E7EC] text-[#9AA0AD] font-mono">
                {activeTab === 'blood' && (
                  <>
                    <th className="p-4">Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">City</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </>
                )}
                {activeTab === 'services' && (
                  <>
                    <th className="p-4">Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {activeTab === 'blood' &&
                paginatedData.map((d: any) => (
                  <tr key={d.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="p-4 font-bold text-[#111318]">{d.name}</td>
                    <td className="p-4 font-mono">{d.contact}</td>
                    <td className="p-4 font-mono font-bold text-[#D72638]">{d.blood_group}</td>
                    <td className="p-4">{d.city || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-mono ${getStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setViewDonorDetails(d)}
                        className="p-1 text-[#5A6072] hover:bg-gray-100 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {d.status !== 'Approved' && (
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'Approved')}
                          className="p-1 text-[#16A34A] hover:bg-green-50 rounded"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {d.status !== 'Rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'Rejected')}
                          className="p-1 text-[#D72638] hover:bg-red-50 rounded"
                          title="Reject"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  </tr>
                ))}
              {activeTab === 'services' &&
                paginatedData.map((s: any) => (
                  <tr key={s.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="p-4 font-bold text-[#111318]">{s.name}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-full text-[10px] font-mono text-[#5A6072]">
                        {s.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{s.phone}</td>
                    <td className="p-4 text-[#5A6072]">
                      {s.district && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {s.district}
                          {s.location && ` - ${s.location}`}
                        </span>
                      )}
                      {!s.district && '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEditServiceModal(s)}
                          className="p-1 text-[#1B4FD8] hover:bg-blue-50 rounded"
                          title="Edit Service"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1 text-[#D72638] hover:bg-red-50 rounded"
                          title="Delete Service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center select-none">
          <span className="text-[10px] font-mono text-[#9AA0AD]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] text-xs font-semibold rounded-md shadow-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs font-mono font-bold flex items-center text-[#111318]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] text-xs font-semibold rounded-md shadow-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-lg max-w-md w-full p-6 relative animate-in scale-in duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-[#E4E7EC] mb-4">
              <h3 className="font-bold text-sm text-[#111318]">
                {editService ? 'Edit Nearby Service' : 'Add Nearby Service'}
              </h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1 rounded-full text-[#5A6072] hover:bg-[#F7F8FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleServiceSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#111318]">Service Name</label>
                <input
                  type="text"
                  placeholder="e.g. Patan Hospital Blood Bank"
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={`bg-white border rounded-md px-3 py-1.5 text-xs focus:outline-none ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC]'}`}
                />
                {formErrors.name && <p className="text-[10px] text-red-600 font-semibold">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  >
                    {SERVICE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 98xxxxxxxx"
                    value={servicePhone}
                    onChange={(e) => {
                      setServicePhone(e.target.value);
                      if (formErrors.phone) {
                        setFormErrors(prev => ({ ...prev, phone: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-1.5 text-xs focus:outline-none ${formErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC]'}`}
                  />
                  {formErrors.phone && <p className="text-[10px] text-red-600 font-semibold">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">District</label>
                  <select
                    value={serviceDistrict}
                    onChange={(e) => {
                      setServiceDistrict(e.target.value);
                      if (formErrors.district) {
                        setFormErrors(prev => ({ ...prev, district: undefined }));
                      }
                    }}
                    className={`bg-white border rounded-md px-3 py-1.5 text-xs focus:outline-none ${formErrors.district ? 'border-red-500 focus:border-red-500' : 'border-[#E4E7EC]'}`}
                  >
                    <option value="">Select District</option>
                    {DISTRICTS.filter((d) => d !== 'All').map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                  {formErrors.district && <p className="text-[10px] text-red-600 font-semibold">{formErrors.district}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Patan, Lalitpur"
                    value={serviceLocation}
                    onChange={(e) => setServiceLocation(e.target.value)}
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 27.6720"
                    value={serviceLatitude}
                    onChange={(e) => setServiceLatitude(e.target.value)}
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#111318]">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 85.3180"
                    value={serviceLongitude}
                    onChange={(e) => setServiceLongitude(e.target.value)}
                    className="bg-white border border-[#E4E7EC] rounded-md px-3 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full h-10 bg-[#D72638] hover:bg-[#D72638]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors mt-2"
              >
                {submitLoading ? 'Saving...' : 'Save Service'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Donor Details Modal */}
      {viewDonorDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-lg max-w-md w-full p-6 relative animate-in scale-in duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-[#E4E7EC] mb-4">
              <h3 className="font-bold text-sm text-[#111318]">Donor Details</h3>
              <button
                onClick={() => setViewDonorDetails(null)}
                className="p-1 rounded-full text-[#5A6072] hover:bg-[#F7F8FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Full Name</span>
                  <span className="font-bold text-[#111318]">{viewDonorDetails.name}</span>
                </div>
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Blood Group</span>
                  <span className="font-bold text-[#D72638]">{viewDonorDetails.blood_group}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Phone</span>
                  <span className="font-mono">{viewDonorDetails.contact}</span>
                </div>
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Email</span>
                  <span>{viewDonorDetails.email || '—'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#9AA0AD] font-mono block mb-1">Address</span>
                <span>{viewDonorDetails.address || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">City/District</span>
                  <span>{viewDonorDetails.city || '—'}</span>
                </div>
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Emergency Contact</span>
                  <span>{viewDonorDetails.emergency_contact || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Registered On</span>
                  <span className="font-mono">{formatNPT(viewDonorDetails.created_at)}</span>
                </div>
                <div>
                  <span className="text-[#9AA0AD] font-mono block mb-1">Status</span>
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-mono ${getStatusBadge(viewDonorDetails.status)}`}>
                    {viewDonorDetails.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#9AA0AD] font-mono block mb-1">Medical Report</span>
                {viewDonorDetails.medical_report_path ? (
                  <div className="flex flex-col gap-2">
                    {viewDonorDetails.medical_report_path.startsWith('data:image') ? (
                      <img
                        src={viewDonorDetails.medical_report_path}
                        alt="Medical Report"
                        className="w-full h-64 object-contain rounded-md border border-[#E4E7EC]"
                      />
                    ) : (
                      <a
                        href={viewDonorDetails.medical_report_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md hover:bg-[#E4E7EC] transition-colors"
                      >
                        <FileText className="h-5 w-5 text-[#1B4FD8]" />
                        <span className="font-bold text-[#111318]">View Medical Report</span>
                      </a>
                    )}
                    <a
                      href={viewDonorDetails.medical_report_path}
                      download="medical-report"
                      className="text-[#1B4FD8] hover:underline text-xs font-semibold"
                    >
                      Download Report
                    </a>
                  </div>
                ) : (
                  <span className="text-[#9AA0AD] italic">No medical report uploaded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
