export const CANONICAL_CATEGORY_LABELS: Record<string, string> = {
  all: "All Tech Gear",
  electronics: "Electronics",
  vehicles: "Vehicles",
  cameras: "Cameras & Photography",
  tools: "Tools & Equipment",
  music: "Musical Instruments",
  gaming: "Gaming",
  laptops: "Laptops / PCs",
  drones: "Drones",
  audio: "Audio",
  sound: "Sound Equipment",
  powerbanks: "Power Stations",
  lighting: "Studio Lighting",
  bikes: "Bikes & Rides",
};

/**
 * Extracts canonical `cat` parameter from URL search object, accepting
 * legacy `?category=` links so shared URLs or bookmarks never drop the filter.
 */
export function normalizeCategoryParam(search: Record<string, unknown>): string | undefined {
  const raw =
    typeof search.cat === "string" && search.cat.trim()
      ? search.cat
      : typeof search.category === "string" && search.category.trim()
      ? search.category
      : undefined;
  return raw ? raw.trim() : undefined;
}

export function getCategoryDisplayLabel(catId: string): string {
  const normalized = String(catId || "").trim().toLowerCase();
  if (!normalized) return "";
  return (
    CANONICAL_CATEGORY_LABELS[normalized] ||
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}

/**
 * Unified category matcher across Home canonical IDs (`electronics`, `vehicles`,
 * `cameras`, `tools`, `music`, `gaming`) and Browse/Filter granular IDs
 * (`laptops`, `drones`, `audio`, `sound`, `powerbanks`, `lighting`, `bikes`).
 * Mirrors backend `/api/products` category filtering semantics.
 */
export function matchesProductCategory(
  productCategory: string | undefined | null,
  targetId: string | undefined | null
): boolean {
  const tId = String(targetId || "").toLowerCase().trim();
  if (!tId || tId === "all") return true;
  if (!productCategory) return false;

  const pCat = String(productCategory).toLowerCase().trim();
  if (pCat === tId) return true;

  if (tId === "electronics" || tId === "electronic") {
    return (
      pCat.includes("electron") ||
      pCat.includes("laptop") ||
      pCat.includes("pc") ||
      pCat.includes("mac") ||
      pCat.includes("computer") ||
      pCat.includes("audio") ||
      pCat.includes("sound") ||
      pCat.includes("headphone") ||
      pCat.includes("speaker") ||
      pCat.includes("mic") ||
      pCat.includes("powerbank") ||
      pCat.includes("power") ||
      pCat.includes("battery") ||
      pCat.includes("display") ||
      pCat.includes("monitor")
    );
  }

  if (tId === "vehicles" || tId === "vehicle") {
    return (
      pCat.includes("vehicle") ||
      pCat.includes("bike") ||
      pCat.includes("motorcycle") ||
      pCat.includes("ride") ||
      pCat.includes("cycle") ||
      pCat.includes("scooter") ||
      pCat.includes("classic 350") ||
      pCat.includes("royal enfield")
    );
  }

  if (tId === "bikes" || tId === "bike") {
    return (
      pCat.includes("bike") ||
      pCat.includes("motorcycle") ||
      pCat.includes("ride") ||
      pCat.includes("cycle") ||
      pCat.includes("scooter")
    );
  }

  if (tId === "tools" || tId === "tool" || tId === "tools & equipment" || tId === "drills" || tId === "drill") {
    return pCat.includes("tool") || pCat.includes("drill") || pCat.includes("equip") || pCat.includes("generator");
  }

  if (tId === "powerbanks" || tId === "powerbank" || tId === "power") {
    return pCat.includes("power") || pCat.includes("battery") || pCat.includes("station");
  }

  if (tId === "cameras" || tId === "camera" || tId === "cameras & photography" || tId === "photography") {
    return (
      pCat.includes("camera") ||
      pCat.includes("cinema") ||
      pCat.includes("lens") ||
      pCat.includes("photo") ||
      pCat.includes("drone") ||
      pCat.includes("lighting") ||
      pCat.includes("studio")
    );
  }

  if (tId === "laptops" || tId === "laptop") {
    return (
      pCat.includes("laptop") ||
      pCat.includes("macbook") ||
      pCat.includes("computer") ||
      pCat.includes("pc") ||
      pCat.includes("mac")
    );
  }

  if (tId === "drones" || tId === "drone") {
    return pCat.includes("drone");
  }

  if (tId === "audio") {
    return pCat.includes("audio") || pCat.includes("mic") || pCat.includes("headphone") || pCat.includes("sound");
  }

  if (tId === "sound") {
    return pCat.includes("sound") || pCat.includes("speaker") || pCat.includes("audio") || pCat.includes("mic");
  }

  if (tId === "lighting" || tId === "light" || tId === "studio") {
    return pCat.includes("light") || pCat.includes("led") || pCat.includes("softbox") || pCat.includes("studio");
  }

  if (tId === "music" || tId === "musical" || tId === "musical instruments") {
    return (
      pCat.includes("music") ||
      pCat.includes("guitar") ||
      pCat.includes("keyboard") ||
      pCat.includes("instrument") ||
      pCat.includes("mic") ||
      pCat.includes("audio") ||
      pCat.includes("sound")
    );
  }

  if (tId === "gaming" || tId === "game") {
    return (
      pCat.includes("game") ||
      pCat.includes("gaming") ||
      pCat.includes("console") ||
      pCat.includes("vr") ||
      pCat.includes("playstation") ||
      pCat.includes("xbox") ||
      pCat.includes("controller")
    );
  }

  return tId.length >= 3 && (pCat.includes(tId) || tId.includes(pCat));
}
