import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestLocation = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLocating(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setIsLocating(false);
          setError('Location permission denied');
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mountedRef.current) {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      }
    } catch {
      if (mountedRef.current) {
        setIsLocating(false);
        setError('Unable to retrieve your location');
      }
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isLocating,
    error,
    requestLocation,
    clearLocation,
  };
}