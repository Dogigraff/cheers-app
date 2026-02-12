"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useYMaps } from "@pbe/react-yandex-maps";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

export interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

interface SuggestItem {
  displayName?: string;
  value?: string;
}

interface LocationAutocompleteProps {
  onSelect: (result: LocationResult) => void;
  mapCenter?: { lat: number; lng: number };
  placeholder?: string;
  defaultValue?: string;
}

const MIN_CHARS = 3;
const SUGGEST_RESULTS = 5;
const DEBOUNCE_MS = 300;
const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

export function LocationAutocomplete({
  onSelect,
  mapCenter,
  placeholder = "Красная площадь, Bar XYZ…",
  defaultValue = "",
}: LocationAutocompleteProps) {
  const ymaps = useYMaps(["geocode"]);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const center = mapCenter ?? MOSCOW_CENTER;
  const boundedBy: [[number, number], [number, number]] = [
    [center.lat - 0.15, center.lng - 0.15],
    [center.lat + 0.15, center.lng + 0.15],
  ];

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!ymaps || query.length < MIN_CHARS) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const suggestFn = (ymaps as { suggest?: (q: string, opts?: { results?: number; boundedBy?: [[number, number], [number, number]] }) => Promise<SuggestItem[]> }).suggest;
        if (typeof suggestFn === "function") {
          const items = await suggestFn(query, {
            results: SUGGEST_RESULTS,
            boundedBy,
          });
          setSuggestions(Array.isArray(items) ? items : []);
          setOpen(true);
          setActiveIndex(-1);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [ymaps, boundedBy]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(v.trim());
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  };

  const geocodeAndSelect = useCallback(
    async (displayName: string, geocodeQuery: string) => {
      if (!ymaps?.geocode) {
        onSelect({ name: displayName, lat: center.lat, lng: center.lng });
        return;
      }
      setLoading(true);
      try {
        const hasCity = /москва|moscow|спб|питер|улица|ул\.|пр\.|проспект/i.test(geocodeQuery);
        const query = !hasCity && geocodeQuery.length < 40 ? `${geocodeQuery}, Москва` : geocodeQuery;
        const result = await ymaps.geocode(query, { results: 1 });
        const first = result?.geoObjects?.get?.(0);
        if (first) {
          const coords = first.geometry.getCoordinates() as [number, number];
          const name = first.getAddressLine?.() ?? first.properties?.get?.("text") ?? displayName;
          onSelect({ name, lat: coords[0], lng: coords[1] });
          setValue(name);
        } else {
          onSelect({ name: displayName, lat: center.lat, lng: center.lng });
        }
      } catch {
        onSelect({ name: displayName, lat: center.lat, lng: center.lng });
      } finally {
        setLoading(false);
      }
      setOpen(false);
      setSuggestions([]);
    },
    [ymaps, onSelect, center]
  );

  const handleSuggestionClick = (item: SuggestItem) => {
    const displayName = item.displayName ?? item.value ?? "";
    const geocodeQuery = item.value ?? displayName;
    void geocodeAndSelect(displayName, geocodeQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (open && suggestions.length > 0) {
        e.preventDefault();
        const item = suggestions[activeIndex >= 0 ? activeIndex : 0];
        if (item) handleSuggestionClick(item);
      } else if (value.trim().length >= MIN_CHARS) {
        e.preventDefault();
        void geocodeAndSelect(value.trim(), value.trim());
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  };

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70 pointer-events-none"
          aria-hidden
        />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Поиск адреса или заведения"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={open && suggestions.length > 0 ? "location-suggestions" : undefined}
          className="pl-10 h-11 rounded-lg border-2 bg-zinc-900/90 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:border-cyan-500/50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-cyan-400/50 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          id="location-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-[2000] rounded-lg overflow-hidden bg-zinc-900 border border-cyan-500/30 shadow-lg shadow-black/50 max-h-56 overflow-y-auto"
        >
          {suggestions.map((item, i) => {
            const text = item.displayName ?? item.value ?? "";
            return (
              <div
                key={`${text}-${i}`}
                role="option"
                aria-selected={i === activeIndex ? "true" : "false"}
                tabIndex={-1}
                className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-colors ${i === activeIndex ? "bg-zinc-800 text-cyan-300" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
                onClick={() => handleSuggestionClick(item)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
