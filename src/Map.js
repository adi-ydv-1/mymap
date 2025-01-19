import React, { useRef, useEffect, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Draw from 'ol/interaction/Draw';
import { LineString, Polygon } from 'ol/geom';
import 'ol/ol.css';
import { transform } from 'ol/proj';
import { getDistance } from 'ol/sphere';
import './MapComponent.css';

const MapComponent = () => {
const mapRef = useRef(null);
const mapInstanceRef = useRef(null);
const [drawing, setDrawing] = useState(false);
const [drawType, setDrawType] = useState(null);
const [waypoints, setWaypoints] = useState([]);
const [showMissionModal, setShowMissionModal] = useState(false);
const [showPolygonModal, setShowPolygonModal] = useState(false);
const [distances, setDistances] = useState([]);
const [initialModal, setInitialModal] = useState(false);
const [insertPosition, setInsertPosition] = useState(null);
const [insertType, setInsertType] = useState(null); // 'before' or 'after'
const [tempPolygon, setTempPolygon] = useState(null);
const [showDropdown, setShowDropdown] = useState(null);

    // Add dropdown menu component
    const CoordinateDropdown = ({ index }) => (
        <div className="coordinate-dropdown">
            <button onClick={() => setShowDropdown(index)}>⋮</button>
            {showDropdown === index && (
                <div className="dropdown-menu">
                    <button onClick={() => handlePolygonInsert(index, 'before')}>
                        Insert Polygon Before
                    </button>
                    <button onClick={() => handlePolygonInsert(index, 'after')}>
                        Insert Polygon After
                    </button>
                </div>
            )}
        </div>
    );

    // Add utility function to calculate distances
    const calculateDistances = (coords) => {
        return coords.map((coord, index) => {
            if (index === 0) return 0;
            const prev = coords[index - 1];
            const current = coord;
            // Convert to lon/lat for distance calculation
            const from = transform(prev, 'EPSG:3857', 'EPSG:4326');
            const to = transform(current, 'EPSG:3857', 'EPSG:4326');
            return Math.round(getDistance(from, to));
        });
    };

useEffect(() => {
if (!mapRef.current) return;

const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
source: vectorSource
});

const map = new Map({
target: mapRef.current,
layers: [
new TileLayer({
source: new OSM()
}),
vectorLayer
],
view: new View({
center: [0, 0],
zoom: 2
})
});

mapInstanceRef.current = map;

// Cleanup function to remove the map when the component unmounts
return () => {
map.setTarget(null);
map.dispose();
};
}, []);

const handleDrawOnMap = (type) => {
setDrawType(type);
};

const handleStartDrawing = () => {
  if (!drawType) {
      alert('Please select a draw type first (Line or Polygon)');
      return;
  }
  setDrawing(true);
  setInitialModal(true);
};

const handleStopDrawing = () => {
setDrawing(false);
};

    // Handle polygon insertion
    const handlePolygonInsert = (index, type) => {
        setInsertPosition(index);
        setInsertType(type);
        setDrawType('Polygon');
        setDrawing(true);
        setShowDropdown(null);
        setShowMissionModal(false); // Hide mission modal while drawing
    };

useEffect(() => {
    if (!drawing || !mapInstanceRef.current || !drawType) return;

    try {
        const draw = new Draw({
            source: mapInstanceRef.current.getLayers().getArray()[1].getSource(),
            type: drawType
        });
        
        mapInstanceRef.current.addInteraction(draw);

        const handleDrawEnd = (e) => {
            const feature = e.feature;
            const geometry = feature.getGeometry();
            const coordinates = geometry.getCoordinates();

            if (drawType === 'LineString') {
                const transformedCoords = coordinates.map(coord => 
                    transform(coord, 'EPSG:3857', 'EPSG:4326')
                );
                
                setWaypoints(transformedCoords);
                setDistances(calculateDistances(coordinates));
                setShowMissionModal(true);
                console.log('Setting mission modal to true');
            } else if (drawType === 'Polygon') {
                const polygonCoords = coordinates[0] || [];
                const transformedCoords = polygonCoords.map(coord => {
                    if (!coord || coord.length < 2) return null;
                    const transformed = transform(coord, 'EPSG:3857', 'EPSG:4326');
                    return transformed;
                }).filter(coord => coord !== null);

                if (insertPosition !== null) {
                    setTempPolygon({
                        coordinates: transformedCoords,
                        position: insertPosition,
                        type: insertType
                    });
                    setWaypoints([transformedCoords]); // Store as array of arrays
                    setShowPolygonModal(true);
                }
            }
            setDrawing(false);
            setInitialModal(false);
        };

        draw.on('drawend', handleDrawEnd);
        
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                mapInstanceRef.current.removeInteraction(draw);
                setDrawing(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            mapInstanceRef.current.removeInteraction(draw);
            document.removeEventListener('keydown', handleKeyDown);
            draw.un('drawend', handleDrawEnd);
        };

    } catch (error) {
        console.error('Draw interaction error:', error);
        setDrawing(false);
    }
}, [drawing, drawType, insertPosition, insertType]);

const handleModalClose = () => {
setShowMissionModal(false);
setShowPolygonModal(false);
};

    // Import polygon points
    const handleImportPolygon = () => {
        if (!tempPolygon) return;

        const newWaypoints = [...waypoints];
        const insertIndex = tempPolygon.type === 'after' ? 
            tempPolygon.position + 1 : tempPolygon.position;

        // Insert polygon coordinates and connect with linestring
        newWaypoints.splice(insertIndex, 0, ...tempPolygon.coordinates);
        
        setWaypoints(newWaypoints);
        setDistances(calculateDistances(newWaypoints));
        setTempPolygon(null);
    };

return (
<div>
<div
ref={mapRef}
style={{
width: '100%',
height: '500px',
border: '1px solid black'
}}
/>
<button onClick={() => handleDrawOnMap('LineString')}>Draw Line</button>
<button onClick={() => handleDrawOnMap('Polygon')}>Draw Polygon</button>
<button onClick={handleStartDrawing}>Start Drawing</button>
<button onClick={handleStopDrawing}>Stop Drawing</button>

{initialModal && (
    <div className="modal">
        <div className="modal-content">
            <h2>Drawing Instructions</h2>
            <p>Click on the map to start drawing waypoints.</p>
            <p>Press Enter to complete the drawing.</p>
            <button onClick={() => setInitialModal(false)}>Got it</button>
        </div>
    </div>
)}

{/* Mission Modal */}
{showMissionModal && (
    <div className="modal">
        <div className="modal-content">
            <span className="close" onClick={handleModalClose}>&times;</span>
            <h2>Mission Waypoints</h2>
            <div className="scrollable-container">
                <div className="waypoints-list">
                    {waypoints.map((waypoint, index) => (
                        <div key={index} className="waypoint-item">
                            <div>WP({String(index).padStart(2, '0')})</div>
                            <div className="coordinate-with-dropdown">
                                <span>
                                    Coordinates({waypoint[0].toFixed(8)}, {waypoint[1].toFixed(8)})
                                </span>
                                <div className="coordinate-dropdown">
                                    <button onClick={() => setShowDropdown(index)}>⋮</button>
                                    {showDropdown === index && (
                                        <div className="dropdown-menu">
                                            <button onClick={() => handlePolygonInsert(index, 'before')}>
                                                Insert Polygon Before
                                            </button>
                                            <button onClick={() => handlePolygonInsert(index, 'after')}>
                                                Insert Polygon After
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {index > 0 && <div>Distance: {distances[index]}m</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
)}

{/* Polygon Modal */}
{showPolygonModal && waypoints && waypoints[0] && (
    <div className="modal">
        <div className="modal-content">
            <span className="close" onClick={handleModalClose}>&times;</span>
            <h2>Polygon Coordinates</h2>
            {tempPolygon && (
                <button 
                    onClick={handleImportPolygon}
                    className="import-button"
                >
                    Import Points
                </button>
            )}
            <div className="scrollable-container">
                <div className="waypoints-list">
                    {waypoints[0].map((waypoint, index) => (
                        waypoint && (
                            <div key={index} className="waypoint-item">
                                <div>WP({String(index).padStart(2, '0')})</div>
                                <div>
                                    Coordinates(
                                    {waypoint[0]?.toFixed(8) || '0.00000000'}, 
                                    {waypoint[1]?.toFixed(8) || '0.00000000'})
                                </div>
                                {index > 0 && <div>Distance: {distances[index] || 0}m</div>}
                            </div>
                        )
                    ))}
                </div>
            </div>
        </div>
    </div>
)}
</div>
);
};
export default MapComponent;