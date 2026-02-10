"use client";

import dynamic from "next/dynamic";

// Dynamically import MapView to avoid SSR issues with Yandex Maps
const MapView = dynamic(() => import("@/components/map/map-view").then((mod) => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

// FAB + Sheet only on client to avoid Radix Portal hydration errors
const CreateBeaconBtn = dynamic(
  () => import("@/components/beacon/create-beacon-btn").then((mod) => ({ default: mod.CreateBeaconBtn })),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <MapView />
      <CreateBeaconBtn />
    </>
  );
}
