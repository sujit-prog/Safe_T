"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Suggestion {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    postcode?: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (coords: { lat: number; lng: number }, name: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search location...",
  icon = <MapPin className="w-4 h-4 text-gray-400" />,
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce API calls
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5&lang=en`);
        const data = await res.json();
        setSuggestions(data.features || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (suggestion: Suggestion) => {
    const { name, city, state } = suggestion.properties;
    const parts = [name, city, state].filter(Boolean);
    const displayName = parts.join(", ");
    
    onChange(displayName);
    setIsOpen(false);
    
    if (onSelect) {
      const [lng, lat] = suggestion.geometry.coordinates;
      onSelect({ lat, lng }, displayName);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {icon}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen && e.target.value.length >= 3) setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        placeholder={placeholder}
      />
      {isLoading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, idx) => {
            const p = s.properties;
            const primaryText = p.name || p.street || p.city;
            const secondaryText = [p.city, p.state, p.country].filter(Boolean).filter(x => x !== primaryText).join(", ");
            
            return (
              <li
                key={idx}
                onClick={() => handleSelect(s)}
                className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{primaryText}</p>
                    {secondaryText && (
                      <p className="text-xs text-gray-500 truncate">{secondaryText}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
