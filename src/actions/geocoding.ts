"use server";

/**
 * Server Action para realizar geocodificación inversa.
 * Se hace desde el servidor para evitar problemas de CORS y 
 * cumplir con la política de User-Agent de Nominatim.
 */

export async function reverseGeocodeAction(lat: number, lng: number) {
  const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_KEY) {
    console.error("Falta GOOGLE_MAPS_API_KEY en las variables de entorno");
    return { success: false, error: "Error de configuración del servidor", coords: `${lat},${lng}` };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}&language=es`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) throw new Error(`Google Maps error: ${response.status}`);
    const data = await response.json();
    
    if (data.status === "ZERO_RESULTS" || !data.results?.[0]) {
      return { success: false, error: "No se encontraron resultados", coords: `${lat},${lng}` };
    }

    // Usamos el primer resultado como base para la calle
    const primaryResult = data.results[0];
    
    // Función para buscar un componente en CUALQUIER resultado de la lista
    const findInAnyResult = (types: string[]) => {
      for (const res of data.results) {
        const comp = res.address_components.find((c: any) => types.some(t => c.types.includes(t)));
        if (comp) return comp.long_name;
      }
      return null;
    };

    const street = findInAnyResult(["route"]);
    const number = findInAnyResult(["street_number"]);
    const sector = findInAnyResult(["neighborhood", "sublocality", "sublocality_level_1", "colonia"]);
    const parish = findInAnyResult(["administrative_area_level_3", "sublocality_level_2"]);
    const city = findInAnyResult(["locality", "administrative_area_level_2"]);

    const parts: string[] = [];

    // 1. Calle y Número
    if (street) {
      const numPart = number ? ` #${number}` : "";
      parts.push(`${street}${numPart}`);
    }

    // 2. Sector / Urbanización (Ahora lo buscamos en toda la respuesta)
    if (sector && !parts.includes(sector)) parts.push(sector);

    // 3. Parroquia
    if (parish && parish !== sector && !parts.includes(parish)) parts.push(parish);

    // 4. Ciudad
    if (city && !parts.includes(city)) parts.push(city);

    // Si la reconstrucción falla, fallback al formatted_address con limpieza
    let finalAddress = "";
    if (parts.length < 2) {
      finalAddress = primaryResult.formatted_address
        .replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,3},? ?/g, "")
        .split(", ")
        .filter((p: string) => !/venezuela|zulia|bolívar|caracas/i.test(p) && !/^\d{4,5}$/.test(p))
        .join(", ");
    } else {
      finalAddress = parts.join(", ");
    }

    return { 
      success: true, 
      address: finalAddress 
    };
  } catch (error) {
    console.error("Google Geocoding error:", error);
    return { success: false, error: "Error de conexión con mapas", coords: `${lat},${lng}` };
  }
}
