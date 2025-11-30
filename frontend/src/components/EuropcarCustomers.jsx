import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Users, Mail, Phone, Building, UserCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// MOCK DEMO DATA
const MOCK_CUSTOMERS = [
  {
    id: 'c1',
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'max.mustermann@email.de',
    telefon: '+49 170 1234567',
    customer_type: 'private',
    kundengruppe: 'Standard',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: true,
    blacklist: false
  },
  {
    id: 'c2',
    vorname: 'Anna',
    nachname: 'Schmidt',
    email: 'anna.schmidt@email.de',
    telefon: '+49 171 2345678',
    customer_type: 'private',
    kundengruppe: 'Premium',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: true,
    blacklist: false
  },
  {
    id: 'c3',
    vorname: 'Thomas',
    nachname: 'Müller',
    email: 'thomas.mueller@firma.de',
    telefon: '+49 172 3456789',
    firma: 'Tech Solutions GmbH',
    customer_type: 'business',
    kundengruppe: 'Corporate',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: true,
    blacklist: false
  },
  {
    id: 'c4',
    vorname: 'Julia',
    nachname: 'Weber',
    email: 'julia.weber@email.de',
    telefon: '+49 173 4567890',
    customer_type: 'private',
    kundengruppe: 'Standard',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: false,
    blacklist: false
  },
  {
    id: 'c5',
    vorname: 'Peter',
    nachname: 'Schneider',
    email: 'p.schneider@consulting.de',
    telefon: '+49 174 5678901',
    firma: 'Schneider Consulting',
    customer_type: 'business',
    kundengruppe: 'Corporate',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: true,
    blacklist: false
  },
  {
    id: 'c6',
    vorname: 'Lisa',
    nachname: 'Becker',
    email: 'lisa.becker@email.de',
    telefon: '+49 175 6789012',
    customer_type: 'private',
    kundengruppe: 'Standard',
    ausweis_verifiziert: false,
    fuehrerschein_verifiziert: false,
    blacklist: false
  },
  {
    id: 'c7',
    vorname: 'Michael',
    nachname: 'Fischer',
    email: 'michael.fischer@email.de',
    telefon: '+49 176 7890123',
    customer_type: 'private',
    kundengruppe: 'Standard',
    ausweis_verifiziert: true,
    fuehrerschein_verifiziert: true,
    blacklist: true
  }
];

const EuropcarCustomers = () => {
  const { theme } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    // Simuliere Laden der Daten
    setTimeout(() => {
      setCustomers(MOCK_CUSTOMERS);
      setLoading(false);
    }, 500);
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.vorname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nachname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.firma?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.customer_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: customers.length,
    private: customers.filter(c => c.customer_type === 'private').length,
    business: customers.filter(c => c.customer_type === 'business').length,
    verified: customers.filter(c => c.ausweis_verifiziert).length,
    blacklisted: customers.filter(c => c.blacklist).length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="text-center">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-blue-500/30`}>
          <div className="text-center">
            <p className="text-sm text-blue-600">Privat</p>
            <p className="text-2xl font-bold text-blue-600">{stats.private}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-purple-500/30`}>
          <div className="text-center">
            <p className="text-sm text-purple-600">Business</p>
            <p className="text-2xl font-bold text-purple-600">{stats.business}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-green-500/30`}>
          <div className="text-center">
            <p className="text-sm text-green-600">Verifiziert</p>
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-red-500/30`}>
          <div className="text-center">
            <p className="text-sm text-red-600">Blacklist</p>
            <p className="text-2xl font-bold text-red-600">{stats.blacklisted}</p>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, E-Mail oder Firma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          >
            <option value="all">Alle Typen</option>
            <option value="private">Privatkunden</option>
            <option value="business">Geschäftskunden</option>
          </select>
          <Button 
            className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
            onClick={() => toast.info('CRUD-Funktionalität wird implementiert')}
          >
            <Plus className="h-4 w-4" />
            Kunde hinzufügen
          </Button>
        </div>
      </Card>

      {/* Customers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Users className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Kunden gefunden
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ändern Sie Ihre Suchkriterien
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} ${
              customer.blacklist ? 'border-2 border-red-500' : ''
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {customer.vorname} {customer.nachname}
                    </h3>
                    {customer.customer_type === 'business' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        <Building className="h-3 w-3 inline mr-1" />
                        Business
                      </span>
                    )}
                    {customer.ausweis_verifiziert && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <UserCheck className="h-3 w-3 inline mr-1" />
                        Verifiziert
                      </span>
                    )}
                    {customer.blacklist && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        Blacklist
                      </span>
                    )}
                  </div>
                  {customer.firma && (
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {customer.firma}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        {customer.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        {customer.telefon}
                      </span>
                    </div>
                    <div>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Kundengruppe: {customer.kundengruppe}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EuropcarCustomers;