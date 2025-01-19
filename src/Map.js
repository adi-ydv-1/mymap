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
import './MapComponent.css';

const MapComponent = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [drawType, setDrawType] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showPolygonModal, setShowPolygonModal] = useState(false);

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
    setDrawing(true);
  };

  const handleStopDrawing = () => {
    setDrawing(false);
  };

  useEffect(() => {
    if (drawing && mapInstanceRef.current) {
      const draw = new Draw({
        source: mapInstanceRef.current.getLayers().getArray()[1].getSource(),
        type: drawType
      });
      mapInstanceRef.current.addInteraction(draw);

      draw.on('drawend', (e) => {
        const feature = e.feature;
        const geometry = feature.getGeometry();
        const coordinates = geometry.getCoordinates();

        setWaypoints(coordinates);

        if (drawType === 'LineString') {
          setShowMissionModal(true);
        } else if (drawType === 'Polygon') {
          setShowPolygonModal(true);
        }
      });

      // Stop drawing when Enter key is pressed
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleStopDrawing();
        }
      });

      // Cleanup function to remove the draw interaction when drawing is stopped
      return () => {
        mapInstanceRef.current.removeInteraction(draw);
      };
    }
  }, [drawing, drawType]);

  const handleModalClose = () => {
    setShowMissionModal(false);
    setShowPolygonModal(false);
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

      {showMissionModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={handleModalClose}>
              &times;
            </span>
            <h2>Mission Modal</h2>
            <p>Waypoints:</p>
            <ul>
              {waypoints.map((waypoint, index) => (
                <li key={index}>{waypoint.join(', ')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showPolygonModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={handleModalClose}>
              &times;
            </span>
            <h2>Polygon Modal</h2>
            <p>Waypoints:</p>
            <ul>
              {waypoints.map((waypoint, index) => (
                <li key={index}>{waypoint.join(', ')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;