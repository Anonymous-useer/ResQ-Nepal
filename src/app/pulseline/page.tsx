'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Search, Star, Phone, Copy, Check, Info, X, MapPin, LocateFixed, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components with no SSR to avoid window errors
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CATEGORIES = [
  'All',
  'Police',
  'Fire Brigade',
  'Medical',
  'Disaster Management',
  'Utility',
  'Women & Child Safety',
  'Mental Health',
];

const SOS_CATEGORIES = ['Police', 'Fire Brigade', 'Medical', 'Disaster Management', 'Women & Child Safety'];

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DISTRICTS = [
  'All',
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Chitwan',
  'Biratnagar',
  'Butwal',
];

// Helper function to extract district from Nominatim address
const extractDistrict = (address: any): string | null => {
  // Possible district keys in Nominatim response
  const districtKeys = ['county', 'state_district', 'district'];
  for (const key of districtKeys) {
    if (address[key]) {
      // Extract district name (remove "District" suffix if present)
      let districtName = address[key].replace(/\s*District$/i, '').trim();
      // Check against our DISTRICTS array (case insensitive)
      const matchedDistrict = DISTRICTS.find(d => d.toLowerCase() === districtName.toLowerCase());
      if (matchedDistrict) {
        return matchedDistrict;
      }
    }
  }
  return null;
};

function PulseLineContent() {
  const searchParams = useSearchParams();
  const isSOSMode = searchParams.get('mode') === 'sos';

  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [favourites, setFavourites] = useState<number[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 27.7172, lng: 85.3240 });
  const [isLocating, setIsLocating] = useState(false);
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);

  // Fetch contacts with SWR
  const { data: contacts = [], error, isLoading } = useSWR('/api/contacts', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });

  // Initialize favourites from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resq_favourites');
      if (saved) {
        try {
          setFavourites(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load favourites:', e);
        }
      }
    }
  }, []);

  // SOS mode initialization: request geolocation and reverse geocode
  useEffect(() => {
    if (isSOSMode && !userLocation) {
      setIsLocating(true);
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        setIsLocating(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
          
          // Reverse geocode using Nominatim to get location text and district
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'ResQ Nepal (https://resq-nepal.app)',
                },
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data.display_name) {
                setLocationSearch(data.display_name);
              }
              if (data.address) {
                const district = extractDistrict(data.address);
                if (district) {
                  setDetectedDistrict(district);
                  setSelectedDistrict(district);
                }
              }
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }

          setIsLocating(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to retrieve your location.');
          setIsLocating(false);
        }
      );
    }
  }, [isSOSMode, userLocation]);

  const toggleFavourite = (id: number) => {
    let updated: number[];
    if (favourites.includes(id)) {
      updated = favourites.filter((fid) => fid !== id);
    } else {
      updated = [...favourites, id];
    }
    setFavourites(updated);
    localStorage.setItem('resq_favourites', JSON.stringify(updated));
  };

  const copyNumber = (num: string, id: number) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setMapCenter(loc);
        
        // Reverse geocode using Nominatim to get location text
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'ResQ Nepal (https://resq-nepal.app)',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              setLocationSearch(data.display_name);
            }
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location.');
        setIsLocating(false);
      }
    );
  };

  // Filter contacts logic
  let filteredContacts = contacts.filter((c: any) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.number.includes(searchQuery) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocationSearch =
      !locationSearch || 
      (c.location_text && c.location_text.toLowerCase().includes(locationSearch.toLowerCase())) ||
      (c.district && c.district.toLowerCase().includes(locationSearch.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesDistrict = selectedDistrict === 'All' || c.district === selectedDistrict || c.district === 'All';
    const matchesSOSCategory = !isSOSMode || SOS_CATEGORIES.includes(c.category);

    return matchesSearch && matchesLocationSearch && matchesCategory && matchesDistrict && matchesSOSCategory;
  });

  // Sort in SOS mode: National first, then same district, then nearest
  if (isSOSMode && userLocation) {
    filteredContacts = [...filteredContacts].sort((a, b) => {
      // 1. National emergency numbers (district === 'All') come first
      if (a.district === 'All' && b.district !== 'All') return -1;
      if (b.district === 'All' && a.district !== 'All') return 1;
      
      // 2. If we have a detected district, same district comes next
      if (detectedDistrict) {
        if (a.district === detectedDistrict && b.district !== detectedDistrict) return -1;
        if (b.district === detectedDistrict && a.district !== detectedDistrict) return 1;
      }
      
      // 3. Then sort by distance
      if (!a.latitude || !a.longitude) return 1;
      if (!b.latitude || !b.longitude) return -1;
      
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });
  }

  // Separate favourites
  const favouriteContacts = filteredContacts.filter((c: any) => favourites.includes(c.id));
  const otherContacts = filteredContacts.filter((c: any) => !favourites.includes(c.id));

  // Get contacts with location for map
  const contactsWithLocation = filteredContacts.filter((c: any) => c.latitude && c.longitude);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      <title>{isSOSMode ? 'SOS — ResQ Nepal' : 'PulseLine — ResQ Nepal'}</title>

      {/* Header */}
      <section className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold text-[#111318] tracking-tight">
          {isSOSMode ? 'SOS Emergency Contacts' : 'PulseLine'}
        </h1>
        <p className="text-xs text-[#5A6072] leading-relaxed">
          {isSOSMode
            ? 'Quick access to emergency services.'
            : 'Search emergency services, disaster centers, utilities, and safety helplines.'}
        </p>
      </section>

      {/* Sticky Search and Filter Controls */}
      <div className="sticky top-14 bg-[#F7F8FA] pt-2 pb-4 z-20 flex flex-col gap-3">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AD]">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search contacts by name, number, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E4E7EC] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#111318] placeholder-[#9AA0AD] focus:outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            />
          </div>
          <button
            onClick={getLocation}
            disabled={isLocating}
            className="flex items-center justify-center gap-1 px-3 py-2.5 bg-white border border-[#E4E7EC] rounded-lg text-[#5A6072] hover:bg-[#F7F8FA] transition-all"
          >
            {isLocating ? (
              <div className="animate-spin h-4 w-4 border-2 border-[#1B4FD8] border-t-transparent rounded-full" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Location Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AD]">
            <MapPin className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by location (e.g., Kathmandu, Patan)..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full bg-white border border-[#E4E7EC] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#111318] placeholder-[#9AA0AD] focus:outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          />
        </div>

        {/* Category Filter Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors duration-150 ${
                selectedCategory === cat
                  ? 'border-[#D72638] bg-[#D72638] text-white font-semibold'
                  : 'border-[#E4E7EC] bg-white text-[#5A6072] hover:text-[#111318] hover:border-[#9AA0AD]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* District Filter Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {DISTRICTS.map((dist) => (
            <button
              key={dist}
              onClick={() => setSelectedDistrict(dist)}
              className={`text-xs px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors duration-150 ${
                selectedDistrict === dist
                  ? 'border-[#1B4FD8] bg-[#1B4FD8] text-white font-semibold'
                  : 'border-[#E4E7EC] bg-white text-[#5A6072] hover:text-[#111318] hover:border-[#9AA0AD]'
              }`}
            >
              {dist}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      {contactsWithLocation.length > 0 && (
        <section className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="h-64 w-full">
            {typeof window !== 'undefined' && (
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userLocation && (
                  <Marker position={userLocation}>
                    <Popup>You are here!</Popup>
                  </Marker>
                )}
                {contactsWithLocation.map((c: any) => (
                  <Marker
                    key={c.id}
                    position={[c.latitude, c.longitude]}
                    eventHandlers={{ click: () => setSelectedContact(c) }}
                  >
                    <Popup>
                      <div className="flex flex-col gap-1">
                        <h4 className="font-semibold text-sm">{c.name}</h4>
                        <p className="text-xs text-[#5A6072]">{c.description}</p>
                        <a href={`tel:${c.number}`} className="text-xs text-[#1B4FD8] hover:underline">Call {c.number}</a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </section>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="text-center py-12 text-xs text-[#9AA0AD] italic">
          Loading contacts directory...
        </div>
      )}
      {error && (
        <div className="text-center py-12 text-xs text-[#DC2626] font-mono">
          Error loading contacts: {error.message}
        </div>
      )}

      {/* Contacts Lists */}
      {!isLoading && !error && (
        <div className="flex flex-col gap-6">
          
          {/* Favourites Section */}
          {favouriteContacts.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> Favourites
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favouriteContacts.map((c: any) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    isFav={true}
                    copiedId={copiedId}
                    onFavToggle={toggleFavourite}
                    onCopy={copyNumber}
                    onDetailClick={setSelectedContact}
                    userLocation={userLocation}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Directory List */}
          <section className="flex flex-col gap-3">
            {favouriteContacts.length > 0 && (
              <h2 className="text-xs font-mono font-bold text-[#9AA0AD] uppercase tracking-wider">
                Directory
              </h2>
            )}
            {otherContacts.length === 0 && favouriteContacts.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#9AA0AD] italic">
                No matching contacts found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherContacts.map((c: any) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    isFav={false}
                    copiedId={copiedId}
                    onFavToggle={toggleFavourite}
                    onCopy={copyNumber}
                    onDetailClick={setSelectedContact}
                    userLocation={userLocation}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-lg max-w-md w-full overflow-hidden animate-in scale-in duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-[#F7F8FA] border-b border-[#E4E7EC]">
              <span className="text-xs font-mono bg-[#E4E7EC] text-[#5A6072] px-2.5 py-0.5 rounded-full">
                {selectedContact.category}
              </span>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1 rounded-full hover:bg-gray-200 text-[#5A6072] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-extrabold text-[#111318] text-base">{selectedContact.name}</h3>
                {selectedContact.district && (
                  <p className="text-xs text-[#9AA0AD] mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {selectedContact.district}
                    {selectedContact.location_text && ` - ${selectedContact.location_text}`}
                  </p>
                )}
                <p className="text-xs text-[#5A6072] mt-1.5 leading-relaxed">
                  {selectedContact.description || 'No description provided.'}
                </p>
              </div>

              <div className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg p-3 flex items-center justify-between">
                <span className="font-mono text-base font-bold text-[#111318] tracking-wider">
                  {selectedContact.number}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyNumber(selectedContact.number, selectedContact.id)}
                    className="p-2 bg-white hover:bg-gray-200 border border-[#E4E7EC] rounded-md text-[#5A6072] transition-colors"
                    title="Copy number"
                  >
                    {copiedId === selectedContact.id ? (
                      <Check className="h-4 w-4 text-[#16A34A]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={`tel:${selectedContact.number}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#1B4FD8] hover:bg-[#1B4FD8]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Call Now
                  </a>
                </div>
              </div>

              {selectedContact.latitude && selectedContact.longitude && (
                <div className="flex gap-2">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedContact.latitude}&mlon=${selectedContact.longitude}#map=15/${selectedContact.latitude}/${selectedContact.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#16A34A] hover:bg-[#16A34A]/95 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    Open in Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PulseLinePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D72638] border-t-transparent" />
      </div>
    }>
      <PulseLineContent />
    </Suspense>
  );
}

// Sub-component: Contact Card
interface CardProps {
  contact: any;
  isFav: boolean;
  copiedId: number | null;
  onFavToggle: (id: number) => void;
  onCopy: (num: string, id: number) => void;
  onDetailClick: (c: any) => void;
  userLocation: { lat: number; lng: number } | null;
}

function ContactCard({ contact, isFav, copiedId, onFavToggle, onCopy, onDetailClick, userLocation }: CardProps) {
  return (
    <div className="relative group bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
      
      {/* Category Indicator Dot and Favorite Star */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D72638]" />
          <span className="text-[10px] font-mono text-[#9AA0AD] tracking-tight truncate uppercase">
            {contact.category}
          </span>
        </div>
        
        {/* Toggle Star */}
        <button
          onClick={() => onFavToggle(contact.id)}
          className="text-[#9AA0AD] hover:text-yellow-500 transition-colors p-1"
        >
          <Star className={`h-4 w-4 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
      </div>

      {/* Name and description */}
      <div className="mt-3">
        <h3 className="font-bold text-sm text-[#111318] line-clamp-1">{contact.name}</h3>
        {contact.district && (
          <p className="text-[10px] text-[#9AA0AD] flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {contact.district}
            {contact.location_text && ` - ${contact.location_text}`}
          </p>
        )}
        <p className="text-[11px] text-[#5A6072] leading-normal mt-1 line-clamp-2 min-h-[32px]">
          {contact.description || 'No description available.'}
        </p>
      </div>

      {/* Footer phone number area */}
      <div className="mt-4 pt-3.5 border-t border-[#E4E7EC] flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[#111318] tracking-wide">
          {contact.number}
        </span>
        
        <div className="flex gap-2">
          {/* Detailed Info Button */}
          <button
            onClick={() => onDetailClick(contact)}
            className="p-1.5 hover:bg-[#F7F8FA] rounded-md text-[#5A6072] hover:text-[#111318] transition-colors"
            title="Details"
          >
            <Info className="h-4 w-4" />
          </button>
          
          {/* Copy Button */}
          <button
            onClick={() => onCopy(contact.number, contact.id)}
            className="p-1.5 hover:bg-[#F7F8FA] rounded-md text-[#5A6072] transition-colors"
            title="Copy Number"
          >
            {copiedId === contact.id ? (
              <Check className="h-4 w-4 text-[#16A34A]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>

          {/* Quick Call Button */}
          <a
            href={`tel:${contact.number}`}
            className="p-1.5 bg-[#D72638]/10 hover:bg-[#D72638] rounded-md text-[#D72638] hover:text-white transition-colors duration-150"
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </a>

          {/* Open in Maps Button */}
          {contact.latitude && contact.longitude && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${contact.latitude}&mlon=${contact.longitude}#map=15/${contact.latitude}/${contact.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-[#16A34A]/10 hover:bg-[#16A34A] rounded-md text-[#16A34A] hover:text-white transition-colors duration-150"
              title="Open in Maps"
            >
              <Navigation className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
