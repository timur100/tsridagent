import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Building2, 
  Globe, 
  MapPin, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Users,
  Filter,
  X
} from 'lucide-react';
import { Card } from './ui/card';

const TenantHierarchySidebar = ({ 
  onSelectTenant, 
  selectedTenantId,
  onFilterChange 
}) => {
  const { theme } = useTheme();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [hierarchyTree, setHierarchyTree] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchAllTenants();
  }, []);

  const fetchAllTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/?skip=0&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
        buildHierarchy(data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (tenantsList) => {
    // Build a map of tenants by ID
    const tenantMap = {};
    tenantsList.forEach(tenant => {
      tenantMap[tenant.tenant_id] = {
        ...tenant,
        children: []
      };
    });

    // Build tree structure
    const roots = [];
    tenantsList.forEach(tenant => {
      if (tenant.parent_tenant_id && tenantMap[tenant.parent_tenant_id]) {
        tenantMap[tenant.parent_tenant_id].children.push(tenantMap[tenant.tenant_id]);
      } else {
        roots.push(tenantMap[tenant.tenant_id]);
      }
    });

    // Sort by tenant type (organization > continent > country > city > location) and then by name
    const sortNodes = (nodes) => {
      return nodes.sort((a, b) => {
        const typeOrder = { 
          'organization': 0, 
          'continent': 1, 
          'country': 2, 
          'city': 3, 
          'location': 4 
        };
        const aType = typeOrder[a.tenant_type] || 5;
        const bType = typeOrder[b.tenant_type] || 5;
        
        if (aType !== bType) return aType - bType;
        return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      });
    };

    const sortTree = (nodes) => {
      const sorted = sortNodes(nodes);
      sorted.forEach(node => {
        if (node.children.length > 0) {
          node.children = sortTree(node.children);
        }
      });
      return sorted;
    };

    setHierarchyTree(sortTree(roots));
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
      case 'continent':
        return <Globe className="w-4 h-4" />;
      case 'country':
        return <Globe className="w-4 h-4" />;
      case 'city':
        return <MapPin className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getChildCount = (tenant) => {
    let count = tenant.children?.length || 0;
    tenant.children?.forEach(child => {
      count += getChildCount(child);
    });
    return count;
  };

  const getAllChildIds = (tenant) => {
    let ids = [tenant.tenant_id];
    tenant.children?.forEach(child => {
      ids = [...ids, ...getAllChildIds(child)];
    });
    return ids;
  };

  const handleTenantClick = (tenant) => {
    // Get all child tenant IDs
    const childIds = getAllChildIds(tenant);
    
    // Notify parent component
    if (onSelectTenant) {
      onSelectTenant(tenant.tenant_id);
    }
    
    if (onFilterChange) {
      onFilterChange(childIds);
    }
  };

  const handleShowAll = () => {
    if (onSelectTenant) {
      onSelectTenant(null);
    }
    if (onFilterChange) {
      onFilterChange(null);
    }
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.tenant_id);
    const isSelected = selectedTenantId === node.tenant_id;
    const childCount = getChildCount(node);

    return (
      <div key={node.tenant_id} className="mb-1">
        <div
          style={{ paddingLeft: `${level * 16}px` }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected
              ? theme === 'dark'
                ? 'bg-[#c00000] bg-opacity-20 border-l-4 border-[#c00000]'
                : 'bg-red-50 border-l-4 border-[#c00000]'
              : theme === 'dark'
              ? 'hover:bg-gray-700'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => handleTenantClick(node)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.tenant_id);
              }}
              className={`p-0.5 rounded hover:bg-gray-600 transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          <div className={`p-1.5 rounded ${
            node.tenant_type === 'organization' 
              ? 'bg-blue-500 bg-opacity-20' 
              : node.tenant_type === 'continent'
              ? 'bg-purple-500 bg-opacity-20'
              : node.tenant_type === 'country' 
              ? 'bg-green-500 bg-opacity-20'
              : node.tenant_type === 'city'
              ? 'bg-yellow-500 bg-opacity-20'
              : 'bg-gray-500 bg-opacity-20'
          }`}>
            {getTenantIcon(node.tenant_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${
              isSelected
                ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {node.display_name || node.name}
            </div>
            {node.country_code && (
              <div className={`text-xs truncate ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {node.country_code}
              </div>
            )}
          </div>
          
          {childCount > 0 && (
            <div className={`text-xs px-2 py-0.5 rounded ${
              theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}>
              {childCount}
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
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#c00000]" />
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Hierarchie...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 h-full overflow-auto ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Tenant-Hierarchie
          </h3>
          <button
            onClick={fetchAllTenants}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Show All Button */}
        <button
          onClick={handleShowAll}
          className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
            !selectedTenantId
              ? theme === 'dark'
                ? 'bg-[#c00000] bg-opacity-20 text-white border-l-4 border-[#c00000]'
                : 'bg-red-50 text-gray-900 border-l-4 border-[#c00000]'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          Alle Tenants ({tenants.length})
        </button>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-1">
        {hierarchyTree.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className={`h-12 w-12 mx-auto mb-2 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Tenants gefunden
            </p>
          </div>
        ) : (
          hierarchyTree.map(node => renderNode(node))
        )}
      </div>

      {/* Legend */}
      <div className={`mt-4 pt-4 border-t space-y-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Legende:
        </p>
        <div className="flex items-center gap-2 text-xs">
          <div className="p-1 rounded bg-blue-500 bg-opacity-20">
            <Building2 className="w-3 h-3" />
          </div>
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Organisation
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="p-1 rounded bg-green-500 bg-opacity-20">
            <Globe className="w-3 h-3" />
          </div>
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Land
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="p-1 rounded bg-gray-500 bg-opacity-20">
            <MapPin className="w-3 h-3" />
          </div>
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Standort
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TenantHierarchySidebar;
