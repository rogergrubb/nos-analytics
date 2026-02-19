interface GeoResult {
  country: string;
  region: string;
  city: string;
}

const cache = new Map<string, GeoResult>();

export async function geolocate(ip: string): Promise<GeoResult> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return { country: 'Local', region: '', city: '' };
  
  const cached = cache.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error('geo failed');
    const data = await res.json();
    const result: GeoResult = {
      country: data.country || 'Unknown',
      region: data.regionName || '',
      city: data.city || '',
    };
    cache.set(ip, result);
    // Evict cache if too large
    if (cache.size > 10000) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return result;
  } catch {
    return { country: 'Unknown', region: '', city: '' };
  }
}
