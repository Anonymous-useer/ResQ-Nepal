'use client';

import { useState, useCallback } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';

// Helper function to extract district from Nominatim address
export const extractDistrict = (address: any): string | null => {
  const districtKeys = ['county', 'state_district', 'district'];
  for (const key of districtKeys) {
    if (address[key]) {
      let districtName = address[key].replace(/\s*District$/i, '').trim();
      const DISTRICTS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Biratnagar', 'Butwal'];
      const matchedDistrict = DISTRICTS.find(d => d.toLowerCase() === districtName.toLowerCase());
      if (matchedDistrict) {
        return matchedDistrict;
      }
    }
  }
  return null;
};

export interface LocationData {
  locationText: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface LocationInputProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationInput({ value, onChange, placeholder = "Search by location...", className = "" }: LocationInputProps) {
  const [isLocating, setIsLocating] = useState(false);

  const getLocation = useCallback(() => {
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
        
        // Reverse geocode using Nominatim
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
            const district = extractDistrict(data.address);
            onChange({
              locationText: data.display_name || '',
              district: district,
              latitude: loc.lat,
              longitude: loc.lng,
            });
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          onChange({
            locationText: '',
            district: null,
            latitude: loc.lat,
            longitude: loc.lng,
          });
        }

        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location.');
        setIsLocating(false);
      }
    );
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AD]">
            <MapPin className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={placeholder}
            value={value.locationText}
            onChange={(e) => onChange({ ...value, locationText: e.target.value })}
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
    </div>
  );
}
