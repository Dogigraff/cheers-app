"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { useNearbyBeacons, type NearbyBeacon } from "@/hooks/use-nearby-beacons";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { joinParty } from "@/actions/join-party";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

// Get emoji for asset type (safe for SSR/hydration)
function getAssetEmoji(assets: NearbyBeacon["assets"]): string {
  if (assets == null || typeof assets !== "object" || !assets.type) return "🔥";
  const type = String(assets.type).toLowerCase();
  switch (type) {
    case "wine":
      return "🍷";
    case "whiskey":
      return "🥃";
    case "beer":
      return "🍺";
    case "vodka":
      return "🍸";
    default:
      return "🔥";
  }
}

// Calculate distance between two points in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface BeaconDetailsSheetProps {
  beacon: NearbyBeacon | null;
  userLocation: { lat: number; long: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinParty: (beaconId: string) => Promise<void>;
}

function BeaconDetailsSheet({
  beacon,
  userLocation,
  open,
  onOpenChange,
  onJoinParty,
}: BeaconDetailsSheetProps) {
  const [joining, setJoining] = useState(false);
  if (!beacon) return null;

  const distance = userLocation
    ? calculateDistance(
      userLocation.lat,
      userLocation.long,
      beacon.beacon_lat,
      beacon.beacon_lng
    )
    : null;

  const assetType = beacon.assets?.type || "unknown";
  const assetBrand = beacon.assets?.brand || "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={beacon.avatar_url || undefined} />
              <AvatarFallback>
                {beacon.username?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-2xl">{beacon.username || "Anonymous"}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {distance ? `${Math.round(distance)}m away` : "Location available"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {beacon.mood && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mood</p>
              <p className="text-lg">{beacon.mood}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">What&apos;s available</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{getAssetEmoji(beacon.assets)}</span>
              <div>
                <p className="font-semibold capitalize">{assetType}</p>
                {assetBrand && (
                  <p className="text-sm text-muted-foreground">{assetBrand}</p>
                )}
              </div>
            </div>
          </div>

          {beacon.reputation && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Reputation: {beacon.reputation}
              </span>
            </div>
          )}

          <div className="pt-4">
            <Button
              className="w-full h-12 text-lg font-semibold"
              size="lg"
              disabled={joining}
              onClick={async () => {
                setJoining(true);
                await onJoinParty(beacon.id);
                setJoining(false);
              }}
            >
              {joining ? "Joining…" : "Join Party 🎉"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const BEACONS_REFRESH_EVENT = "beacons-refresh";

export function MapView() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const { beacons, loading, error, userLocation, refetch } = useNearbyBeacons(5000);
  const [selectedBeacon, setSelectedBeacon] = useState<NearbyBeacon | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener(BEACONS_REFRESH_EVENT, handler);
    return () => window.removeEventListener(BEACONS_REFRESH_EVENT, handler);
  }, [refetch]);

  // Realtime: subscribe to new beacons and refresh map + toast
  useEffect(() => {
    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "beacons" },
        (payload: unknown) => {
          console.log("[Beacons] Realtime event received:", payload);
          refetch();
          toast("New party detected nearby! 🍷");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleJoinParty = async (beaconId: string) => {
    const result = await joinParty(beaconId);
    if (result.success) {
      setSheetOpen(false);
      router.push(`/chat/${result.matchId}`);
    } else {
      toast.error(result.error);
    }
  };

  // Apply dark theme via JS after map loads
  useEffect(() => {
    if (!mapLoaded) return;

    const applyDarkTheme = () => {
      const mapContainer = document.querySelector('.yandex-map-dark');
      if (!mapContainer) return;

      const canvases = mapContainer.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        if (!canvas.style.filter || !canvas.style.filter.includes('invert')) {
          canvas.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.15)';
        }
      });
    };

    const timeouts = [
      setTimeout(applyDarkTheme, 100),
      setTimeout(applyDarkTheme, 500),
      setTimeout(applyDarkTheme, 1000),
      setTimeout(applyDarkTheme, 2000),
    ];

    const observer = new MutationObserver(() => {
      applyDarkTheme();
    });

    const mapContainer = document.querySelector('.yandex-map-dark');
    if (mapContainer) {
      observer.observe(mapContainer, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [mapLoaded]);

  const mapCenter: [number, number] = useMemo(() => {
    if (userLocation) {
      return [userLocation.lat, userLocation.long];
    }
    return [55.763, 37.593]; // Moscow center fallback (Patriarch Ponds)
  }, [userLocation]);

  const mapZoom = useMemo(() => {
    if (beacons.length > 0) return 14;
    return 15;
  }, [beacons.length]);

  const handlePlacemarkClick = useCallback((beacon: NearbyBeacon) => {
    setSelectedBeacon(beacon);
    setSheetOpen(true);
  }, []);

  // ✅ DECLARATIVE: Filter & memoize valid beacons for rendering
  const validBeacons = useMemo(() => {
    return beacons.filter((b) => {
      if (!b || typeof b.id !== "string") return false;
      const lat = Number(b.beacon_lat);
      const lng = Number(b.beacon_lng);
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
  }, [beacons]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading map</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <header className="absolute top-0 left-0 right-0 z-[1000] flex justify-end p-3 pointer-events-none">
        <div className="pointer-events-auto" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-background/90 backdrop-blur-sm border border-border hover:bg-accent"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="Account menu"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.user_metadata?.avatar_url as string | undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {user?.email?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </Button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={handleLogOut}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>
      <YMaps
        query={{
          lang: "ru_RU",
          ...(process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY &&
            process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY.trim() !== "" && {
            apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
          }),
        }}
      >
        <div className="yandex-map-dark w-full h-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-[2000] bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          <Map
            className="yandex-map-container"
            defaultState={{
              center: mapCenter,
              zoom: mapZoom,
            }}
            width="100%"
            height="100%"
            style={{ width: "100%", height: "100%" }}
            options={{
              suppressMapOpenBlock: true,
            }}
            onLoad={() => {
              setMapLoaded(true);
            }}
            onError={(error: unknown) => {
              console.error("Yandex Map load error:", error);
            }}
          >
            {/* ✅ DECLARATIVE PLACEMARKS — React manages lifecycle automatically */}
            {validBeacons.map((beacon) => (
              <Placemark
                key={beacon.id}
                geometry={[Number(beacon.beacon_lat), Number(beacon.beacon_lng)]}
                properties={{
                  iconContent: getAssetEmoji(beacon.assets),
                  hintContent: beacon.username || "Beacon",
                  balloonContentHeader: beacon.username || "Anonymous",
                  balloonContentBody: beacon.mood || "Chilling",
                }}
                options={{
                  preset: "islands#circleIcon",
                  iconColor: "#00f3ff",
                  hasBalloon: true,
                  hasHint: true,
                }}
                onClick={() => handlePlacemarkClick(beacon)}
              />
            ))}
          </Map>
        </div>
      </YMaps>

      {!loading && !mapLoaded && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">Loading Yandex Maps...</p>
        </div>
      )}

      {!loading && mapLoaded && beacons.length === 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">No beacons nearby. Create one! 🔥</p>
        </div>
      )}

      <BeaconDetailsSheet
        beacon={selectedBeacon}
        userLocation={userLocation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onJoinParty={handleJoinParty}
      />
    </div>
  );
}
