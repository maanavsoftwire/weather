import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const UK_CENTER: [number, number] = [-1.5, 52.5];

interface MapPickerProps {
  onPick: (lat: number, lon: number) => void;
}

function MapPicker({ onPick }: MapPickerProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    useEffect(() => {
        if (mapRef.current || !containerRef.current) return;

        const map = new MapLibreMap({
            container: containerRef.current,
            style: OPENFREEMAP_STYLE,
            center: UK_CENTER,
            zoom: 5,
        });
        mapRef.current = map;

        map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

        let marker: Marker | null = null;

        map.on('click', (event: MapMouseEvent) => {
            const { lat, lng } = event.lngLat;

            if (marker) {
                marker.setLngLat(event.lngLat);
            } else {
                marker = new Marker({ color: '#ffd166' }).setLngLat(event.lngLat).addTo(map);
            }

            onPickRef.current(lat, lng);
        });
    }, []);

    return <div ref={containerRef} className="map-picker" />;
}

export default MapPicker;
