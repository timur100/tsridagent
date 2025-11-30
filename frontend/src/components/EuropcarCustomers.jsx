import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Users, Mail, Phone, Building, UserCheck, AlertTriangle, Edit } from 'lucide-react';
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

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div>
          <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Alle Kunden</h3>
          <div className={`rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden ${
            theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-100'
          }`}>
            <table className={`min-w-full ${theme === 'dark' ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kunde
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kontakt
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Typ
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gruppe
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'bg-[#2a2a2a] divide-gray-800' : 'bg-white divide-gray-100'}`}>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={`px-6 py-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Users className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className="font-semibold">Keine Kunden gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {customer.vorname} {customer.nachname}
                            </div>
                            {customer.firma && (
                              <div className={`text-xs flex items-center gap-1 mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                <Building className="h-3 w-3" />
                                {customer.firma}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{customer.telefon}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.customer_type === 'business' ? (
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                            <Building className="h-3 w-3 mr-1" />
                            Business
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Privat
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        {customer.kundengruppe}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {customer.ausweis_verifiziert && (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Verifiziert
                            </span>
                          )}
                          {customer.blacklist && (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Blacklist
                            </span>
                          )}
                          {!customer.ausweis_verifiziert && !customer.blacklist && (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              Ungeprüft
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <button 
                          className="text-[#c00000] hover:text-[#a00000] transition-colors flex items-center gap-1"
                          onClick={() => toast.info('Details für ' + customer.vorname + ' ' + customer.nachname)}
                        >
                          <Edit className="h-4 w-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EuropcarCustomers;