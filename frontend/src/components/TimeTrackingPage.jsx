import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Play, Pause, Square, Calendar, TrendingUp, Users, Download, Filter, Plus, Edit, Trash2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';

const TimeTrackingPage = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const [activeTab, setActiveTab] = useState('tracking');
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [timeEntries, setTimeEntries] = useState([
    {
      id: 1,
      user: 'Max Mustermann',
      project: 'Europcar Integration',
      task: 'Backend API Development',
      start_time: '2024-12-02T09:00:00',
      end_time: '2024-12-02T12:30:00',
      duration: '3h 30m',
      status: 'completed'
    },
    {
      id: 2,
      user: 'Anna Schmidt',
      project: 'TSRID IDCHECK',
      task: 'UI Design',
      start_time: '2024-12-02T10:15:00',
      end_time: '2024-12-02T14:00:00',
      duration: '3h 45m',
      status: 'completed'
    },
    {
      id: 3,
      user: 'Max Mustermann',
      project: 'Dokumentenscan',
      task: 'Regula API Integration',
      start_time: '2024-12-02T14:30:00',
      end_time: null,
      duration: '2h 15m',
      status: 'active'
    }
  ]);

  const [employees] = useState([
    { id: 1, name: 'Max Mustermann', role: 'Entwickler', color: '#3b82f6' },
    { id: 2, name: 'Anna Schmidt', role: 'Designer', color: '#10b981' },
    { id: 3, name: 'Tom Weber', role: 'Projektmanager', color: '#f59e0b' },
    { id: 4, name: 'Lisa Müller', role: 'Entwicklerin', color: '#8b5cf6' }
  ]);

  const [shifts, setShifts] = useState([
    { id: 1, employee_id: 1, date: '2024-12-02', start: '09:00', end: '17:00', type: 'Büro' },
    { id: 2, employee_id: 2, date: '2024-12-02', start: '10:00', end: '18:00', type: 'Büro' },
    { id: 3, employee_id: 1, date: '2024-12-03', start: '09:00', end: '17:00', type: 'Büro' },
    { id: 4, employee_id: 3, date: '2024-12-03', start: '08:00', end: '16:00', type: 'Büro' },
    { id: 5, employee_id: 4, date: '2024-12-04', start: '14:00', end: '22:00', type: 'Spätschicht' }
  ]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTracking = () => {
    setIsTracking(true);
    setCurrentTime(0);
  };

  const handlePauseTracking = () => {
    setIsTracking(false);
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    // Save time entry
    const newEntry = {
      id: timeEntries.length + 1,
      user: user?.name || 'Current User',
      project: currentProject || 'Allgemein',
      task: 'Manuelle Zeiterfassung',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration: formatTime(currentTime),
      status: 'completed'
    };
    setTimeEntries([newEntry, ...timeEntries]);
    setCurrentTime(0);
    setCurrentProject(null);
  };

  return (
    <div className="w-full">
      <SubTabNavigation
        tabs={[
          { id: 'tracking', label: 'Zeiterfassung', icon: Clock },
          { id: 'entries', label: 'Einträge', icon: Calendar },
          { id: 'schedule', label: 'Dienstplan', icon: CalendarDays },
          { id: 'reports', label: 'Berichte', icon: TrendingUp },
          { id: 'team', label: 'Team', icon: Users }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tracking Tab */}
      {activeTab === 'tracking' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ⏱️ Zeiterfassung
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Erfassen Sie Ihre Arbeitszeiten in Echtzeit
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timer Card */}
            <div className="lg:col-span-2">
              <div className={`p-8 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="text-center mb-8">
                  <div className={`text-6xl font-mono font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {isTracking && (
                      <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        Aktiv
                      </span>
                    )}
                  </div>
                </div>

                {/* Project Selection */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Projekt
                  </label>
                  <select
                    value={currentProject || ''}
                    onChange={(e) => setCurrentProject(e.target.value)}
                    disabled={isTracking}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${isTracking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Projekt auswählen...</option>
                    <option value="Europcar Integration">Europcar Integration</option>
                    <option value="TSRID IDCHECK">TSRID IDCHECK</option>
                    <option value="Dokumentenscan">Dokumentenscan</option>
                    <option value="Schnellmenü">Schnellmenü</option>
                    <option value="Allgemein">Allgemein</option>
                  </select>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-3">
                  {!isTracking ? (
                    <button
                      onClick={handleStartTracking}
                      disabled={!currentProject}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all ${
                        !currentProject
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      <Play className="h-5 w-5" />
                      Start
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePauseTracking}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-all"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                      <button
                        onClick={handleStopTracking}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                      >
                        <Square className="h-5 w-5" />
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="space-y-4">
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Heute
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Gesamt
                    </span>
                    <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      9h 30m
                    </span>
                  </div>
                  <div className="h-px bg-gray-600"></div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Projekte
                    </span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      3
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Einträge
                    </span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      5
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Diese Woche
                </h3>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gesamt
                  </span>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    42h 15m
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Zeiteinträge
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Übersicht aller erfassten Zeiten
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all">
              <Plus className="h-4 w-4" />
              Manueller Eintrag
            </button>
          </div>

          {/* Filters */}
          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Zeitraum
                </label>
                <select className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}>
                  <option>Heute</option>
                  <option>Diese Woche</option>
                  <option>Dieser Monat</option>
                  <option>Benutzerdefiniert</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Projekt
                </label>
                <select className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}>
                  <option>Alle Projekte</option>
                  <option>Europcar Integration</option>
                  <option>TSRID IDCHECK</option>
                  <option>Dokumentenscan</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Benutzer
                </label>
                <select className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}>
                  <option>Alle Benutzer</option>
                  <option>Max Mustermann</option>
                  <option>Anna Schmidt</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                  <Filter className="h-4 w-4" />
                  Filtern
                </button>
              </div>
            </div>
          </div>

          {/* Time Entries Table */}
          <div className={`rounded-lg border border-gray-700 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Benutzer
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Projekt
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Aufgabe
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Start
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Ende
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Dauer
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {timeEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`border-t border-gray-700 transition-colors ${
                        theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.user}
                      </td>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.project}
                      </td>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.task}
                      </td>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.duration}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-600 rounded">
                            <Edit className="h-4 w-4 text-blue-500" />
                          </button>
                          <button className="p-1 hover:bg-gray-600 rounded">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📅 Dienstplan
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Planen und verwalten Sie Mitarbeiter-Schichten
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(currentWeek);
                  newDate.setDate(newDate.getDate() - 7);
                  setCurrentWeek(newDate);
                }}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Heute
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(currentWeek);
                  newDate.setDate(newDate.getDate() + 7);
                  setCurrentWeek(newDate);
                }}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Week Overview */}
          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Woche vom {new Date(currentWeek).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setShowShiftModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all"
              >
                <Plus className="h-4 w-4" />
                Schicht hinzufügen
              </button>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className={`rounded-lg border border-gray-700 overflow-hidden ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold border-t border-gray-700 w-48 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Mitarbeiter
                    </th>
                    {[...Array(7)].map((_, i) => {
                      const date = new Date(currentWeek);
                      date.setDate(date.getDate() - date.getDay() + i + 1);
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={i}
                          className={`px-4 py-3 text-center text-xs font-semibold border-t border-gray-700 ${
                            isToday ? 'bg-blue-900/20' : ''
                          } ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          <div>{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i]}</div>
                          <div className="text-xs font-normal mt-1">
                            {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className={`border-t border-gray-700 ${theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: employee.color }}
                          ></div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {employee.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      {[...Array(7)].map((_, i) => {
                        const date = new Date(currentWeek);
                        date.setDate(date.getDate() - date.getDay() + i + 1);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayShifts = shifts.filter(
                          s => s.employee_id === employee.id && s.date === dateStr
                        );
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <td
                            key={i}
                            className={`px-2 py-2 border-l border-gray-700 ${isToday ? 'bg-blue-900/20' : ''}`}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setSelectedEmployee(employee.id);
                              setShowShiftModal(true);
                            }}
                          >
                            <div className="min-h-[60px] space-y-1 cursor-pointer">
                              {dayShifts.map((shift) => (
                                <div
                                  key={shift.id}
                                  className="p-2 rounded text-xs text-white"
                                  style={{ backgroundColor: employee.color }}
                                >
                                  <div className="font-semibold">{shift.start} - {shift.end}</div>
                                  <div className="text-xs opacity-90">{shift.type}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
            <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Schichttypen
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Büro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Spätschicht</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Frühschicht</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nachtschicht</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Home Office</span>
              </div>
            </div>
          </div>

          {/* Shift Modal */}
          {showShiftModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`w-full max-w-md p-6 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Schicht hinzufügen
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Mitarbeiter
                    </label>
                    <select
                      value={selectedEmployee || ''}
                      onChange={(e) => setSelectedEmployee(parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Mitarbeiter wählen...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Datum
                    </label>
                    <input
                      type="date"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Start
                      </label>
                      <input
                        type="time"
                        defaultValue="09:00"
                        className={`w-full px-3 py-2 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-[#2a2a2a] border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Ende
                      </label>
                      <input
                        type="time"
                        defaultValue="17:00"
                        className={`w-full px-3 py-2 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-[#2a2a2a] border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Schichttyp
                    </label>
                    <select
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option>Büro</option>
                      <option>Frühschicht</option>
                      <option>Spätschicht</option>
                      <option>Nachtschicht</option>
                      <option>Home Office</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowShiftModal(false);
                      setSelectedEmployee(null);
                      setSelectedDate(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-[#2a2a2a]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      // Add shift logic here
                      setShowShiftModal(false);
                      setSelectedEmployee(null);
                      setSelectedDate(null);
                    }}
                    className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Berichte
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Zeiterfassungs-Statistiken und Reports
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gesamtzeit (Monat)
              </p>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                168h
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Durchschnitt (Tag)
              </p>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                8.4h
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-[#1f1f1f] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Arbeitstage
              </p>
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                20
              </p>
            </div>
          </div>

          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Detaillierte Reports - In Entwicklung</p>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div>
          <div className="mb-6">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Team-Übersicht
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Zeiterfassung aller Team-Mitglieder
            </p>
          </div>

          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Team-Übersicht - In Entwicklung</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingPage;
