"use client";
import React, { useState, useEffect, useRef } from 'react';

interface MapboxSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  className?: string;
  disabled?: boolean;
}

export default function MapboxSearch({ placeholder, value, onChange, onSelect, className, disabled }: MapboxSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }
      
      const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");
      if (!token) return;

      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&autocomplete=true&limit=5`);
        const data = await response.json();
        if (data.features) {
          setSuggestions(data.features);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Mapbox geocoding error:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      // Don't fetch if dropdown is closed intentionally (like after selection)
      if(isOpen !== false || value.length >= 3) {
         fetchSuggestions();
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (feature: any) => {
    setIsOpen(false);
    setSuggestions([]);
    
    const address = feature.place_name;
    const [lng, lat] = feature.center;
    
    onChange(address);
    onSelect({ address, lat, lng });
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
        }}
        disabled={disabled}
        className={className || "w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple"}
      />
      
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white mt-1 rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li 
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
            >
              <div className="font-semibold text-sm text-gray-800 truncate">{suggestion.text}</div>
              <div className="text-xs text-gray-500 truncate">{suggestion.place_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
