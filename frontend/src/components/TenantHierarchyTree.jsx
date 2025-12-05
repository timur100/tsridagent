import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Building2, ChevronRight, ChevronDown, Globe, MapPin } from 'lucide-react';
import { Card } from './ui/card';

const TenantHierarchyTree = ({ rootTenantId, onSelectTenant }) => {
  const { theme } = useTheme();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set([rootTenantId]));

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (rootTenantId) {
      fetchHierarchy();
    }
  }, [rootTenantId]);

  const fetchHierarchy = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/${rootTenantId}/hierarchy`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHierarchy(data.hierarchy);
        }
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (tenantId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedNodes(newExpanded);
  };

  const getTenantIcon = (tenantType) => {
    switch (tenantType) {
      case 'organization':
        return <Building2 className="w-4 h-4" />;
      case 'country':
        return <Globe className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getTenantTypeLabel = (tenantType) => {
    switch (tenantType) {
      case 'organization':
        return 'Organisation';
      case 'country':
        return 'Land';
      case 'location':
        return 'Standort';
      default:
        return tenantType;
    }
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.tenant_id);

    return (
      <div key={node.tenant_id} style={{ marginLeft: `${level * 24}px` }}>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-700'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onSelectTenant && onSelectTenant(node.tenant_id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.tenant_id);
              }}
              className="p-1 hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className={`p-2 rounded ${
            node.tenant_type === 'organization' ? 'bg-blue-500 bg-opacity-20' :
            node.tenant_type === 'country' ? 'bg-green-500 bg-opacity-20' :
            'bg-gray-500 bg-opacity-20'
          }`}>
            {getTenantIcon(node.tenant_type)}
          </div>
          
          <div className="flex-1">
            <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {node.display_name}
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {getTenantTypeLabel(node.tenant_type)}
              {node.country_code && ` • ${node.country_code}`}
              {node.allow_cross_location_search && ' • Standortübergreifende Suche'}
            </div>
          </div>
          
          {hasChildren && (
            <div className={`text-xs px-2 py-1 rounded ${
              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {node.children.length} {node.children.length === 1 ? 'Standort' : 'Standorte'}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000] mx-auto"></div>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Hierarchie...
          </p>
        </div>
      </Card>
    );
  }

  if (!hierarchy) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Keine Hierarchie verfügbar
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
      <div className="mb-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Tenant-Hierarchie
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Organisationsstruktur und Standorte
        </p>
      </div>
      
      {renderNode(hierarchy)}
    </Card>
  );
};

export default TenantHierarchyTree;
