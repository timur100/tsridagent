import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Upload, Brain, Shield, DollarSign, CheckCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarAI = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState('damage');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const features = [
    {
      id: 'damage',
      title: 'Schadenserkennung',
      icon: Camera,
      description: 'KI analysiert Fahrzeugfotos und erkennt Schäden automatisch',
      model: 'Gemini Vision',
      color: 'blue'
    },
    {
      id: 'license',
      title: 'Führerschein-Validierung',
      icon: CheckCircle,
      description: 'Automatische Prüfung von Führerscheindaten auf Gültigkeit',
      model: 'OpenAI GPT-5',
      color: 'green'
    },
    {
      id: 'fraud',
      title: 'Betrugsprävention',
      icon: Shield,
      description: 'Erkennt verdächtige Buchungsmuster und Betrugsindikatoren',
      model: 'OpenAI GPT-5',
      color: 'red'
    },
    {
      id: 'pricing',
      title: 'Preisoptimierung',
      icon: DollarSign,
      description: 'Dynamische Preisberechnung basierend auf Nachfrage und Historie',
      model: 'OpenAI GPT-5',
      color: 'purple'
    }
  ];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        
        // Call damage detection API
        const response = await apiCall('/api/europcar/ai/damage-detection', {
          method: 'POST',
          body: JSON.stringify({
            image_base64: base64,
            vehicle_id: 'demo-vehicle-id'
          })
        });

        if (response.success) {
          setResult(response.data.analysis);
          toast.success('Schadenanalyse erfolgreich!');
        } else {
          toast.error(response.message || 'Fehler bei Analyse');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Upload');
    } finally {
      setLoading(false);
    }
  };

  const selectedFeatureData = features.find(f => f.id === selectedFeature);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🤖 KI-Premium-Features
        </h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Powered by OpenAI GPT-5 & Gemini Vision
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isSelected = selectedFeature === feature.id;
          return (
            <Card
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className={`p-6 cursor-pointer transition-all ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
              } ${
                isSelected ? 'border-2 border-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
            >
              <div className={`p-3 rounded-full w-fit mb-3 ${
                feature.color === 'blue' ? 'bg-blue-100' :
                feature.color === 'green' ? 'bg-green-100' :
                feature.color === 'red' ? 'bg-red-100' : 'bg-purple-100'
              }`}>
                <Icon className={`h-6 w-6 ${
                  feature.color === 'blue' ? 'text-blue-600' :
                  feature.color === 'green' ? 'text-green-600' :
                  feature.color === 'red' ? 'text-red-600' : 'text-purple-600'
                }`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {feature.description}
              </p>
              <span className={`text-xs px-2 py-1 rounded-full bg-${feature.color}-100 text-${feature.color}-700`}>
                {feature.model}
              </span>
            </Card>
          );
        })}
      </div>

      {/* Demo Area */}
      <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Brain className={`h-6 w-6 text-${selectedFeatureData.color}-600`} />
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {selectedFeatureData.title}
          </h3>
        </div>

        {selectedFeature === 'damage' && (
          <div className="space-y-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Laden Sie ein Foto des Fahrzeugs hoch, und die KI analysiert automatisch vorhandene Schäden.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="damage-upload"
              />
              <label htmlFor="damage-upload" className="cursor-pointer">
                <Upload className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Bild hochladen
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  PNG, JPG bis zu 10MB
                </p>
              </label>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">KI analysiert Bild...</p>
              </div>
            )}

            {result && (
              <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h4 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Analyse-Ergebnis:
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Schadenstyp</p>
                    <p className="font-semibold">{result.damage_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Schweregrad</p>
                    <p className="font-semibold">{result.severity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="font-semibold">{result.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Geschätzte Kosten</p>
                    <p className="font-semibold">
                      {result.estimated_cost_min} - {result.estimated_cost_max} €
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Beschreibung</p>
                    <p className="text-sm">{result.description}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {selectedFeature !== 'damage' && (
          <div className="text-center py-12">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Diese Funktion ist verfügbar über die API.
              <br />
              Demo-UI wird in Kürze implementiert.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EuropcarAI;
