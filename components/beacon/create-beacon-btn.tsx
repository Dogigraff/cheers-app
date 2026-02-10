"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { createBeacon } from "@/actions/create-beacon";
import { toast } from "sonner";

const DRINK_TYPES = [
  { emoji: "🍷", type: "wine", label: "Wine" },
  { emoji: "🍺", type: "beer", label: "Beer" },
  { emoji: "🥃", type: "whiskey", label: "Whiskey" },
  { emoji: "🍸", type: "vodka", label: "Vodka" },
] as const;

export function CreateBeaconBtn() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState("");
  const [drinkType, setDrinkType] = useState<string>("beer");
  const [duration, setDuration] = useState([2]); // hours
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleOpen = () => {
    // Get user location when opening the drawer
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
  };

  const handleSubmit = async () => {
    if (!mood.trim()) {
      toast.error("Please enter a mood");
      return;
    }

    if (!userLocation) {
      toast.error("Location not available");
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
      });

      toast.success("Beacon created! 🔥");
      setOpen(false);
      setMood("");
      setDrinkType("beer");
      setDuration([2]);
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
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000]
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
                    className={`p-4 rounded-lg border-2 transition-all ${
                      drinkType === drink.type
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
