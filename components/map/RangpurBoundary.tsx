"use client";

import { useMemo, useState } from "react";
import { Polygon, Polyline, Popup, Tooltip } from "react-leaflet";
import { BOUNDARY_POLYGONS } from "./rangpur-boundary-data";

/**
 * Rangpur Division administrative boundary rendered as filled polygons with
 * crisp stroke outlines — sourced from OpenStreetMap (relation 3921211).
 *
 * Layer approach:
 *  1. Polygon (bottom) — subtle semi-transparent red fill
 *  2. Polyline (top)  — solid red stroke for sharp border line
 *
 * This double-layer technique avoids the "fill covers the stroke" issue
 * and keeps the border line crisp at all zoom levels.
 */
export default function RangpurBoundary() {
  const [hovered, setHovered] = useState(false);

  const polygons = useMemo(() => BOUNDARY_POLYGONS, []);

  const borderColor = hovered ? "#e11d48" : "#dc2626";
  const borderWeight = hovered ? 3 : 2.5;
  const tintColor = "#e11d48";

  /**
   * Build an "inverted highlight" polygon: a giant world rectangle with
   * Rangpur division cut out as a hole. This tints everything OUTSIDE
   * Rangpur while keeping the inside fresh & clean.
   *
   * Ring order for inverted polygon:
   *   outer ring = world-sized rectangle (cw)
   *   holes     = each boundary polygon  (ccw — Leaflet auto-reverses)
   */
  const outerWorldRing: [number, number][] = [
    [-84, -180],
    [-84, 180],
    [84, 180],
    [84, -180],
  ];

  return (
    <>
      {/* Inverted tint layer — dims everything OUTSIDE Rangpur */}
      <Polygon
        positions={[outerWorldRing, ...polygons]}
        pathOptions={{
          color: "transparent",
          fillColor: tintColor,
          fillOpacity: hovered ? 0.20 : 0.15,
          weight: 0,
          interactive: false, // clicks pass through to map
        }}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />

      {polygons.map((ring, idx) => (
        <div key={idx}>
          {/* Stroke layer — clean red border line around Rangpur */}
          <Polyline
            positions={ring}
            pathOptions={{
              color: borderColor,
              weight: borderWeight,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
            eventHandlers={{
              mouseover: () => setHovered(true),
              mouseout: () => setHovered(false),
            }}
          >
            {/* Tooltip on first polygon only */}
            {idx === 0 && (
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-[11px] font-semibold text-slate-700">
                  Rangpur Division
                </div>
                <div className="text-[10px] text-slate-500">
                  3 boundary segments • OSM
                </div>
              </Tooltip>
            )}

            {/* Popup on first polygon only */}
            {idx === 0 && (
              <Popup>
                <div className="text-sm font-bold text-slate-800 mb-1">
                  Rangpur Division
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>Source: OpenStreetMap (relation 3921211)</p>
                  <p>Districts: Panchagarh, Thakurgaon, Dinajpur, Rangpur,</p>
                  <p>Nilphamari, Lalmonirhat, Kurigram, Gaibandha</p>
                </div>
              </Popup>
            )}
          </Polyline>
        </div>
      ))}
    </>
  );
}
