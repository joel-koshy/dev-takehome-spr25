"use client"
import { GoogleMap, HeatmapLayer, useLoadScript } from "@react-google-maps/api";
import { useEffect, useState } from "react";

type HeatmapPoint = {
    lat: number;
    lng: number;
};

export default function Kewl() {
    const [points, setPoints] = useState<HeatmapPoint[]>([]);
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["visualization"],
    });

    useEffect(() => {
        fetch("/api/heatmap")
            .then((res) => res.json())
            .then((data) => setPoints(data));
    }, []);
    if (!isLoaded) return <div> Loading...</div>
    return (
        <GoogleMap
            zoom={13}
            center={{ lat: 33.75, lng: -84.38 }} // ATL Lat and Long
            mapContainerStyle={{ height: "100vh", width: "100%" }}
        >
            <HeatmapLayer
                data={points.map((p) => new google.maps.LatLng(p.lat, p.lng))}
            />
        </GoogleMap>
    );
}
