import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Car, Edit, Trash2, AlertTriangle, Fuel, Gauge, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarVehicles = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Use mock data for now
    const mockVehicles = [
      { id: 'v1', marke: 'BMW', modell: '3er', baujahr: 2023, kennzeichen: 'B-EC 2023', status: 'available', kraftstoff: 'Diesel', getriebe: 'Automatik', kilometerstand: 12500, tankstand: 85, farbe: 'Schwarz', sitzplaetze: 5, schaeden: [] },
      { id: 'v2', marke: 'Mercedes', modell: 'C-Klasse', baujahr: 2022, kennzeichen: 'M-EC 5678', status: 'rented', kraftstoff: 'Benzin', getriebe: 'Automatik', kilometerstand: 28000, tankstand: 60, farbe: 'Silber', sitzplaetze: 5, schaeden: [] }
    ];
    setTimeout(() => {
      setVehicles(mockVehicles);
      setLoading(false);
    }, 500);
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <Car className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2 text-white">Fahrzeuge werden geladen...</h3>
      </div>
    </div>
  );
};

export default EuropcarVehicles;
