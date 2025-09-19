import React, { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, HeatmapLayer, HexagonLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl";

// Types for deck.gl data
interface DataPoint {
  position: [number, number];
  color?: [number, number, number, number];
  radius?: number;
  value?: number;
}

interface DeckGLChartProps {
  data: DataPoint[];
  type: "scatter" | "heatmap" | "hexagon";
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  mapStyle?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
}

export function DeckGLChart({
  data,
  type,
  title,
  className = "",
  width = 800,
  height = 600,
  mapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  initialViewState = {
    longitude: -122.4,
    latitude: 37.8,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  },
}: DeckGLChartProps) {
  const layers = useMemo(() => {
    switch (type) {
      case "scatter":
        return [
          new ScatterplotLayer({
            id: "scatter-plot",
            data,
            pickable: true,
            opacity: 0.8,
            stroked: true,
            filled: true,
            radiusScale: 6,
            radiusMinPixels: 1,
            radiusMaxPixels: 100,
            lineWidthMinPixels: 1,
            getPosition: (d: DataPoint) => d.position,
            getRadius: (d: DataPoint) => d.radius || 10,
            getFillColor: (d: DataPoint) => d.color || [255, 140, 0, 180],
            getLineColor: (d: DataPoint) => d.color || [255, 140, 0, 255],
          }),
        ];
      case "heatmap":
        return [
          new HeatmapLayer({
            id: "heatmap-layer",
            data,
            getPosition: (d: DataPoint) => d.position,
            getWeight: (d: DataPoint) => d.value || 1,
            radiusPixels: 60,
          }),
        ];
      case "hexagon":
        return [
          new HexagonLayer({
            id: "hexagon-layer",
            data,
            pickable: true,
            extruded: true,
            radius: 200,
            elevationScale: 4,
            getPosition: (d: DataPoint) => d.position,
            getColorValue: (points: DataPoint[]) => {
              return points.reduce((sum, point) => sum + (point.value || 1), 0);
            },
            getElevationValue: (points: DataPoint[]) => {
              return points.reduce((sum, point) => sum + (point.value || 1), 0);
            },
          }),
        ];
      default:
        return [];
    }
  }, [data, type]);

  return (
    <div className={`deckgl-chart ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div className="relative rounded-lg overflow-hidden border">
        <DeckGL
          initialViewState={initialViewState}
          controller={true}
          layers={layers}
          width={width}
          height={height}
        >
          <Map
            mapStyle={mapStyle}
            mapboxAccessToken={
              process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
              "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
            }
          />
        </DeckGL>
      </div>
    </div>
  );
}

// Utility function to generate sample data
export function generateSampleData(
  type: "scatter" | "heatmap" | "hexagon",
  count = 100
): DataPoint[] {
  const data: DataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const lat = 37.7749 + (Math.random() - 0.5) * 0.1;
    const lng = -122.4194 + (Math.random() - 0.5) * 0.1;

    data.push({
      position: [lng, lat],
      radius: Math.random() * 20 + 5,
      value: Math.random() * 100,
      color: [
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        180,
      ] as [number, number, number, number],
    });
  }

  return data;
}

