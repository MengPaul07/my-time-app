import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
}

interface WeatherWidgetProps {
  children?: React.ReactNode;
}

export function WeatherWidget({ children }: WeatherWidgetProps) {
  const [locationName, setLocationName] = useState<string>('Loading...');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLocationName('');
          return;
        }

        // Add timeout for location (5 seconds)
        const locationPromise = Location.getCurrentPositionAsync({});
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        
        let location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
        
        // Reverse geocoding to get city name
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          setLocationName(`${address.city || address.region || 'Unknown City'}`);
        }

        // Fetch weather from Open-Meteo (Free, No Key)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code`
        );
        const data = await response.json();
        setWeather({
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1
        });
      } catch (e) {
        console.error(e);
        setErrorMsg('Failed to fetch location or weather');
        setLocationName(''); // Hide location on error
        setWeather(null);
      }
    })();
  }, []);

  const getWeatherIcon = (code: number, isDay: boolean) => {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow
    // 95, 96, 99: Thunderstorm
    
    const prefix = isDay ? 'sunny' : 'moon';
    
    if (code === 0) return isDay ? 'sunny' : 'moon';
    if (code >= 1 && code <= 3) return isDay ? 'partly-sunny' : 'cloudy-night';
    if (code >= 45 && code <= 48) return 'cloudy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 95) return 'thunderstorm';
    
    return 'cloud';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="light" style={styles.blurContainer}>
        <View style={styles.content}>
          {/* Left: Info Group (Time, Location, Weather) */}
          <View style={styles.infoGroup}>
            {/* Time & Date */}
            <View style={styles.timeBlock}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
            </View>

            {/* Location */}
            {locationName ? (
              <View style={styles.locationBlock}>
                <Ionicons name="location-sharp" size={14} color={Colors.light.text} style={{ opacity: 0.6 }} />
                <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{locationName}</Text>
              </View>
            ) : null}

            {/* Weather */}
            {weather && (
              <View style={styles.weatherBlock}>
                <Ionicons 
                  name={getWeatherIcon(weather.weatherCode, weather.isDay)} 
                  size={20} 
                  color={Colors.light.tint} 
                />
                <Text style={styles.tempText}>{Math.round(weather.temperature)}°</Text>
              </View>
            )}
          </View>

          {/* Right: Children (Buttons) - Vertical Stack */}
          <View style={styles.iconStack}>
            {children}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 40,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Reduced padding
    paddingHorizontal: 15,
  },
  infoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeBlock: {
    flexDirection: 'column',
    marginRight: 15,
  },
  timeText: {
    fontSize: 20, // Smaller font
    fontWeight: '600',
    color: Colors.light.text,
    fontVariant: ['tabular-nums'],
    lineHeight: 24,
  },
  dateText: {
    fontSize: 10,
    color: Colors.light.text,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 15,
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
    height: '80%',
    flexShrink: 1,
  },
  locationText: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.8,
    fontWeight: '500',
    flexShrink: 1,
  },
  weatherBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
    height: '80%',
  },
  tempText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  iconStack: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
