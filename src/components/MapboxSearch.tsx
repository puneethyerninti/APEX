"use client";
import React, { useState, useEffect, useRef } from 'react';
import { mapboxToken } from '@/services/geocoding';

interface MapboxSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  className?: string;
  disabled?: boolean;
  resolved?: boolean;
}

export default function MapboxSearch({ placeholder, value, onChange, onSelect, className, disabled, resolved }: MapboxSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedValue = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (value === selectedValue.current || disabled || resolved) { setSuggestions([]); setIsOpen(false); return; }
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }
      
      const token = mapboxToken;
      if (!token) return;

      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&autocomplete=true&limit=5&bbox=83.10,17.50,83.45,17.95`, { signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted && data.features) {
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

    return () => { clearTimeout(delayDebounce); controller.abort(); };
  }, [value, disabled, resolved]);

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
    selectedValue.current = address;
    const [lng, lat] = feature.center;
    
    onChange(address);
    onSelect({ address, lat, lng });
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        aria-label={placeholder}
        title={value || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
            selectedValue.current = null;
            setSuggestions([]);
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
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
            >
              <button type="button" className="block w-full text-left" onClick={() => handleSelect(suggestion)}>
              <div className="font-semibold text-sm text-gray-800 truncate">{suggestion.text}</div>
              <div className="text-xs text-gray-500 truncate">{suggestion.place_name}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
