export type Point = { lat: number; lng: number };

// Dua foto dianggap di tempat yang sama kalau jaraknya di bawah ini. Cukup
// longgar untuk menutupi satu pantai, taman, atau kompleks bangunan, tetapi
// masih memisahkan dua tempat berbeda di kota yang sama.
export const SAME_PLACE_RADIUS_METERS = 300;

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function averagePoint(points: Point[]): Point {
  const total = points.reduce(
    (sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

export type PlaceCluster = { id: number; center: Point; points: Point[] };

// Pengelompokan sederhana: foto masuk ke kelompok pertama yang pusatnya masih
// dalam radius, kalau tidak ada maka membuka kelompok baru. Pusatnya digeser
// setiap ada anggota baru supaya tidak melenceng ke titik pertama saja.
//
// Cukup untuk puluhan foto sekali impor. Kalau suatu saat jumlahnya ribuan,
// pendekatan ini perlu diganti karena biayanya kuadratik.
export function clusterPlaces(
  points: (Point | null)[],
  radiusMeters = SAME_PLACE_RADIUS_METERS
): (number | null)[] {
  const clusters: PlaceCluster[] = [];

  return points.map((point) => {
    if (!point) return null;

    const match = clusters.find(
      (cluster) => distanceMeters(cluster.center, point) <= radiusMeters
    );

    if (match) {
      match.points.push(point);
      match.center = averagePoint(match.points);
      return match.id;
    }

    const created: PlaceCluster = {
      id: clusters.length,
      center: point,
      points: [point],
    };
    clusters.push(created);
    return created.id;
  });
}

export type DatedPlace = { date: string; lat: number | null; lng: number | null };

// Satu momen = satu tanggal di satu tempat. Dipisahkan dari komponennya supaya
// aturannya bisa diuji langsung: tanggal sama tetapi tempat berbeda harus
// terpisah, dan tempat sama pada tanggal berbeda juga terpisah.
export function groupKeysByDateAndPlace(items: DatedPlace[]): string[] {
  const places = clusterPlaces(
    items.map((item) =>
      item.lat !== null && item.lng !== null
        ? { lat: item.lat, lng: item.lng }
        : null
    )
  );

  return items.map(
    (item, index) => `${item.date}|${places[index] ?? "tanpa-lokasi"}`
  );
}
