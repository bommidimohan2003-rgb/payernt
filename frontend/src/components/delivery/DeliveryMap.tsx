import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Navigation } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface DeliveryMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupLabel?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryLabel?: string;
  currentLat?: number | null;
  currentLng?: number | null;
  heading?: number | null;
  history?: Array<{ latitude: number; longitude: number }>;
  status?: string;
  className?: string;
}

// Custom SVG Icons for markers
const createPickupIcon = () =>
  L.divIcon({
    className: "custom-map-icon",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-emerald-600 rotate-45"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });

const createDestinationIcon = () =>
  L.divIcon({
    className: "custom-map-icon",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-indigo-600 rotate-45"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });

const createDriverIcon = (heading: number = 0, isDelivered: boolean = false) =>
  L.divIcon({
    className: "custom-map-driver-icon",
    html: `
      <div class="relative flex items-center justify-center">
        ${
          !isDelivered
            ? `<div class="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping"></div>
               <div class="absolute w-10 h-10 rounded-full bg-emerald-500/30"></div>`
            : ""
        }
        <div class="relative w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl border-2 border-white dark:border-zinc-900" style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg class="w-5 h-5 text-zinc-950" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

export function DeliveryMap({
  pickupLat,
  pickupLng,
  pickupLabel = "Lender Hub",
  deliveryLat,
  deliveryLng,
  deliveryLabel = "Destination",
  currentLat,
  currentLng,
  heading = 0,
  history = [],
  status = "OUT_FOR_DELIVERY",
  className = "h-[420px] w-full",
}: DeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const historyPolylineRef = useRef<L.Polyline | null>(null);
  const { theme } = useTheme();

  // Click-to-load consent state for third-party map embed (Requirement 7)
  const [hasMapConsent, setHasMapConsent] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("payent:map_embed_consent") === "true";
  });

  const isDarkMode =
    theme === "dark" ||
    ((theme as string) === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Initialize Leaflet map
  useEffect(() => {
    if (!hasMapConsent) return;
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultCenter: [number, number] = [
      currentLat ?? pickupLat ?? 12.9716,
      currentLng ?? pickupLng ?? 77.5946,
    ];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
    });

    const tileUrl = isDarkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hasMapConsent, isDarkMode]);

  // Update Markers, Route, and Fitting
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);

    // 1. Pickup Marker
    if (pickupLat != null && pickupLng != null) {
      const pickupLatLng: [number, number] = [pickupLat, pickupLng];
      const marker = L.marker(pickupLatLng, {
        icon: createPickupIcon(),
      }).addTo(map);
      marker.bindPopup(`<strong>Pickup:</strong> ${pickupLabel}`);
      bounds.extend(pickupLatLng);
    }

    // 2. Delivery Destination Marker
    if (deliveryLat != null && deliveryLng != null) {
      const destLatLng: [number, number] = [deliveryLat, deliveryLng];
      const marker = L.marker(destLatLng, {
        icon: createDestinationIcon(),
      }).addTo(map);
      marker.bindPopup(`<strong>Delivery:</strong> ${deliveryLabel}`);
      bounds.extend(destLatLng);
    }

    // 3. Current Courier / Live Location Marker
    if (currentLat != null && currentLng != null) {
      const driverLatLng: [number, number] = [currentLat, currentLng];
      const isDelivered = status === "DELIVERED";

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(driverLatLng);
        driverMarkerRef.current.setIcon(createDriverIcon(heading ?? 0, isDelivered));
      } else {
        const marker = L.marker(driverLatLng, {
          icon: createDriverIcon(heading ?? 0, isDelivered),
          zIndexOffset: 1000,
        }).addTo(map);
        marker.bindPopup(`<strong>Live Courier</strong><br>Status: ${status}`);
        driverMarkerRef.current = marker;
      }
      bounds.extend(driverLatLng);
    }

    // 4. Draw Route Polylines
    if (history.length > 1) {
      const histPoints: [number, number][] = history.map((h) => [
        h.latitude,
        h.longitude,
      ]);
      if (historyPolylineRef.current) {
        historyPolylineRef.current.setLatLngs(histPoints);
      } else {
        historyPolylineRef.current = L.polyline(histPoints, {
          color: "#10b981",
          weight: 4,
          opacity: 0.8,
          smoothFactor: 1,
        }).addTo(map);
      }
    }

    if (currentLat != null && currentLng != null && deliveryLat != null && deliveryLng != null) {
      const remainingPoints: [number, number][] = [
        [currentLat, currentLng],
        [deliveryLat, deliveryLng],
      ];
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(remainingPoints);
      } else {
        routePolylineRef.current = L.polyline(remainingPoints, {
          color: "#6366f1",
          weight: 3,
          dashArray: "6, 8",
          opacity: 0.7,
        }).addTo(map);
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng,
    currentLat,
    currentLng,
    heading,
    history,
    status,
    pickupLabel,
    deliveryLabel,
  ]);

  const handleCenterOnDriver = useCallback(() => {
    if (!mapInstanceRef.current) return;
    if (currentLat != null && currentLng != null) {
      mapInstanceRef.current.flyTo([currentLat, currentLng], 15, {
        duration: 1.2,
      });
    }
  }, [currentLat, currentLng]);

  const handleFitAll = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([]);
    if (pickupLat != null && pickupLng != null)
      bounds.extend([pickupLat, pickupLng]);
    if (deliveryLat != null && deliveryLng != null)
      bounds.extend([deliveryLat, deliveryLng]);
    if (currentLat != null && currentLng != null)
      bounds.extend([currentLat, currentLng]);

    if (bounds.isValid()) {
      mapInstanceRef.current.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.2,
      });
    }
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng, currentLat, currentLng]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${className}`}>
      {/* Click-to-Load Privacy Gate for Third-Party Basemap (Requirement 7) */}
      {!hasMapConsent ? (
        <div className="absolute inset-0 z-[500] bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Navigation className="h-6 w-6" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-foreground">
            Interactive Live Delivery Map
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
            Viewing this live transit route connects your browser to external tile servers from CARTO and OpenStreetMap contributors, subject to their respective privacy policies.
          </p>
          <button
            type="button"
            onClick={() => {
              setHasMapConsent(true);
              if (typeof window !== "undefined") {
                localStorage.setItem("payent:map_embed_consent", "true");
              }
            }}
            className="px-5 py-2.5 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity shadow-md cursor-pointer"
          >
            Load Live Map
          </button>
        </div>
      ) : null}

      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />

      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCenterOnDriver}
          title="Center on Live Courier"
          className="p-2.5 rounded-xl bg-card/90 hover:bg-card border border-border text-foreground shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Navigation className="h-4 w-4 text-emerald-500" />
        </button>
        <button
          type="button"
          onClick={handleFitAll}
          title="View Full Route"
          className="p-2.5 rounded-xl bg-card/90 hover:bg-card border border-border text-foreground shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Maximize2 className="h-4 w-4 text-primary" />
        </button>
      </div>

      <div className="absolute top-4 left-4 z-[400] bg-card/85 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-xs flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block"></span>
          <span className="text-muted-foreground font-medium">Pickup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span className="text-foreground font-medium">Live Courier</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block"></span>
          <span className="text-muted-foreground font-medium">Destination</span>
        </div>
      </div>
    </div>
  );
}
