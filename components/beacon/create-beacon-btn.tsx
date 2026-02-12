"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, MapPin, Search } from "lucide-react";
import { YMaps, useYMaps } from "@pbe/react-yandex-maps";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { createBeacon } from "@/actions/create-beacon";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DRINK_TYPES = [
  { emoji: "🍷", type: "wine", label: "Wine" },
  { emoji: "🍺", type: "beer", label: "Beer" },
  { emoji: "🥃", type: "whiskey", label: "Whiskey" },
  { emoji: "🍸", type: "vodka", label: "Vodka" },
] as const;

/* ------------------------------------------------------------------ */
/*  Inner component (must be inside <YMaps> to use useYMaps)           */
/* ------------------------------------------------------------------ */
function CreateBeaconBtnInner() {
  const router = useRouter();
  const ymaps = useYMaps(["geocode"]);

  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState("");
  const [drinkType, setDrinkType] = useState<string>("beer");
  const [duration, setDuration] = useState([2]); // hours
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // --- Location mode state ---
  const [locationMode, setLocationMode] = useState<"gps" | "search">("gps");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  /* ---- Open handler (GPS acquisition on open) ---- */
  const handleOpen = () => {
    if (locationMode === "gps") {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setOpen(true);
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Fallback to Moscow center for demo
            setUserLocation({ lat: 55.76, lng: 37.59 });
            setOpen(true);
          }
        );
      } else {
        // Fallback to Moscow center
        setUserLocation({ lat: 55.76, lng: 37.59 });
        setOpen(true);
      }
    } else {
      // Search mode — open immediately, user will search manually
      setOpen(true);
    }
  };

  /* ---- Toggle location mode ---- */
  const handleToggleMode = (mode: "gps" | "search") => {
    setLocationMode(mode);
    if (mode === "gps") {
      setSearchQuery("");
      setLocationName("");
    } else {
      setUserLocation(null);
      setLocationName("");
    }
  };

  /* ---- Yandex geocode handler — uses suggest for places, geocode for addresses ---- */
  const handleGeocode = async () => {
    const query = searchQuery.trim();
    if (!query) {
      toast.error("Введите адрес или название заведения");
      return;
    }

    if (!ymaps) {
      toast.error("Карты загружаются, подождите...");
      return;
    }

    setGeocoding(true);
    try {
      // Improve query: add city for short/vague queries so we get specific places, not just "Москва"
      const hasCity = /москва|moscow|spb|питер|санкт|улица|ул\.|пр\.|пр-т|проспект|красная|тверская/i.test(query);
      const geocodeQuery = !hasCity && query.length < 35 ? `${query}, Москва` : query;

      // 2. Geocode to get coordinates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await ymaps.geocode(geocodeQuery, { results: 5 });
      const geoObjects = result.geoObjects;
      let firstGeoObject = geoObjects.get(0);

      // Skip overly generic results (e.g. whole city, not a specific place)
      const cityOnly = /^москва(\s|,|$)|^moscow(\s|,|$)/i;
      for (let i = 0; i < Math.min(5, geoObjects.getLength()); i++) {
        const obj = geoObjects.get(i);
        const name = obj.getAddressLine?.() ?? obj.properties?.get?.("text") ?? "";
        if (!cityOnly.test(name)) {
          firstGeoObject = obj;
          break;
        }
      }

      if (!firstGeoObject) {
        toast.error("Ничего не найдено. Попробуйте: «Красная площадь 1» или «Тверская 10»");
        setGeocoding(false);
        return;
      }

      const coords: [number, number] = firstGeoObject.geometry.getCoordinates();
      const address: string =
        firstGeoObject.getAddressLine?.() ??
        firstGeoObject.properties?.get?.("text") ??
        query;

      setUserLocation({ lat: coords[0], lng: coords[1] });
      setLocationName(address);
      toast.success(`Найдено: ${address}`);
    } catch (error) {
      console.error("Geocode error:", error);
      toast.error("Не удалось найти. Введите точный адрес, например: Красная площадь 1");
    } finally {
      setGeocoding(false);
    }
  };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (!mood.trim()) {
      toast.error("Please enter a mood");
      return;
    }

    if (!userLocation) {
      toast.error(
        locationMode === "search"
          ? "Please search for a location first"
          : "Location not available"
      );
      return;
    }

    setLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration[0]);

      await createBeacon({
        mood: mood.trim(),
        assets: {
          type: drinkType,
        },
        location: {
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        expiresAt: expiresAt.toISOString(),
        ...(locationName ? { locationName } : {}),
      });

      toast.success("Beacon created! 🔥");
      setOpen(false);
      setMood("");
      setDrinkType("beer");
      setDuration([2]);
      setSearchQuery("");
      setLocationName("");
      router.refresh();
      window.dispatchEvent(new CustomEvent("beacons-refresh"));
    } catch (error) {
      console.error("Error creating beacon:", error);
      toast.error("Failed to create beacon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000]
                   w-16 h-16 rounded-full flex items-center justify-center
                   bg-gradient-to-br from-neon-cyan to-[#0099aa] text-black font-semibold
                   shadow-[0_0_24px_rgba(0,243,255,0.6),0_0_48px_rgba(0,243,255,0.3)]
                   hover:shadow-[0_0_32px_rgba(0,243,255,0.8),0_0_64px_rgba(0,243,255,0.4)]
                   transition-all duration-300 hover:scale-110 active:scale-95
                   border border-white/30"
        aria-label="Create Beacon"
      >
        <Flame className="w-8 h-8" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] border-t-2 border-t-[#00f3ff]/50">
          <SheetHeader>
            <SheetTitle className="text-3xl">Light a Beacon 🔥</SheetTitle>
            <SheetDescription>
              Share what you have and find company nearby
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Location Mode Toggle */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleMode("gps")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${locationMode === "gps"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <MapPin className="w-4 h-4" />
                  Use GPS
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode("search")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${locationMode === "search"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <Search className="w-4 h-4" />
                  Search Place
                </button>
              </div>

              {/* Search mode: address input + Find button */}
              {locationMode === "search" && (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Красная площадь, Bar XYZ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleGeocode();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleGeocode()}
                      disabled={geocoding || !searchQuery.trim() || !ymaps}
                    >
                      {geocoding ? "..." : !ymaps ? "⏳" : "Find"}
                    </Button>
                  </div>
                  {locationName && (
                    <p className="text-xs text-muted-foreground truncate">
                      📍 {locationName}
                    </p>
                  )}
                </div>
              )}

              {/* GPS mode: show status */}
              {locationMode === "gps" && userLocation && (
                <p className="text-xs text-muted-foreground">
                  📍 GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Mood Input */}
            <div className="space-y-2">
              <Label htmlFor="mood">Mood / Description</Label>
              <Input
                id="mood"
                placeholder="e.g., Looking for party, Chilling at home..."
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Drink Type Selection */}
            <div className="space-y-2">
              <Label>What&apos;s available?</Label>
              <div className="grid grid-cols-4 gap-2">
                {DRINK_TYPES.map((drink) => (
                  <button
                    key={drink.type}
                    type="button"
                    onClick={() => setDrinkType(drink.type)}
                    className={`p-4 rounded-lg border-2 transition-all ${drinkType === drink.type
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                      : "border-border hover:border-primary/50"
                      }`}
                  >
                    <div className="text-3xl mb-1">{drink.emoji}</div>
                    <div className="text-xs text-muted-foreground">{drink.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <Label>Duration: {duration[0]} hour{duration[0] !== 1 ? "s" : ""}</Label>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={1}
                max={6}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1h</span>
                <span>6h</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading || !mood.trim()}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? "Creating..." : "Publish Beacon 🔥"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper — provides its own YMaps context                  */
/* ------------------------------------------------------------------ */
export function CreateBeaconBtn() {
  return (
    <YMaps
      query={{
        lang: "ru_RU",
        ...(process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() && {
          apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
          ...(process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY?.trim() && {
            suggest_apikey: process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY,
          }),
        }),
      }}
    >
      <CreateBeaconBtnInner />
    </YMaps>
  );
}
