import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Building2, 
  Globe, 
  MapPin, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Search,
  X,
  Plus
} from 'lucide-react';
import { Card } from './ui/card';
import AddOrganizationModal from './AddOrganizationModal';

const TenantHierarchySidebarV2 = ({ 
  onSelectTenant, 
  selectedTenantId,
  onFilterChange 
}) => {
  const { theme } = useTheme();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [hierarchyTree, setHierarchyTree] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTree, setFilteredTree] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Dynamic width
  const [showAddModal, setShowAddModal] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchAllTenants();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      filterTreeBySearch(hierarchyTree, searchQuery);
    } else {
      setFilteredTree(hierarchyTree);
    }
  }, [searchQuery, hierarchyTree]);

  const fetchAllTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants-hierarchy/list`);
      if (response.ok) {
        const result = await response.json();
        const data = result.tenants || [];
        
        // Filter: Keep Europcar and Puma organizations and their children
        const validOrgs = [
          '1d3653db-86cb-4dd1-9ef5-0236b116def8', // Europcar
          '94317b6b-a478-4df5-9a81-d1fd3c5983c8'  // Puma
        ];
        
        const filteredTenants = data.filter(t => {
          const id = t.tenant_id || '';
          // Keep if it's one of the main organizations OR a child of them
          return validOrgs.includes(id) || 
                 validOrgs.some(orgId => id.startsWith(orgId + '-'));
        });
        
        setTenants(filteredTenants);
        buildHierarchy(filteredTenants);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (tenantsList) => {
    const tenantMap = {};
    tenantsList.forEach(tenant => {
      tenantMap[tenant.tenant_id] = {
        ...tenant,
        children: []
      };
    });

    const roots = [];
    tenantsList.forEach(tenant => {
      if (tenant.parent_tenant_id && tenantMap[tenant.parent_tenant_id]) {
        tenantMap[tenant.parent_tenant_id].children.push(tenantMap[tenant.tenant_id]);
      } else {
        roots.push(tenantMap[tenant.tenant_id]);
      }
    });

    const sortNodes = (nodes) => {
      return nodes.sort((a, b) => {
        const levelOrder = { 
          'organization': 0, 
          'continent': 1, 
          'country': 2, 
          'state': 3,
          'city': 4, 
          'location': 5 
        };
        const aLevel = levelOrder[a.tenant_level] || levelOrder[a.tenant_type] || 10;
        const bLevel = levelOrder[b.tenant_level] || levelOrder[b.tenant_type] || 10;
        
        if (aLevel !== bLevel) return aLevel - bLevel;
        
        // Special sorting for continents: Europa first
        if ((a.tenant_level === 'continent' || a.tenant_type === 'continent') && 
            (b.tenant_level === 'continent' || b.tenant_type === 'continent')) {
          const aName = a.display_name || a.name || '';
          const bName = b.display_name || b.name || '';
          if (aName === 'Europa') return -1;
          if (bName === 'Europa') return 1;
        }
        
        // For organizations: Europcar before Puma (alphabetical)
        if ((a.tenant_level === 'organization' || a.tenant_type === 'organization') && 
            (b.tenant_level === 'organization' || b.tenant_type === 'organization')) {
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        }
        
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

    const sorted = sortTree(roots);
    setHierarchyTree(sorted);
    setFilteredTree(sorted);
  };

  const filterTreeBySearch = (tree, query) => {
    const lowerQuery = query.toLowerCase();
    
    const matchesSearch = (node) => {
      const name = (node.display_name || node.name || '').toLowerCase();
      const code = (node.location_code || '').toLowerCase();
      return name.includes(lowerQuery) || code.includes(lowerQuery);
    };
    
    const filterNode = (node) => {
      const matches = matchesSearch(node);
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter(child => child !== null);
      
      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    };
    
    const filtered = tree
      .map(node => filterNode(node))
      .filter(node => node !== null);
    
    setFilteredTree(filtered);
    
    // Auto-expand all matching paths
    if (filtered.length > 0 && query.trim()) {
      const expandAll = (nodes) => {
        nodes.forEach(node => {
          setExpandedNodes(prev => new Set([...prev, node.tenant_id]));
          if (node.children.length > 0) {
            expandAll(node.children);
          }
        });
      };
      expandAll(filtered);
    }
  };

  const toggleNode = (tenantId, node, parentNodes = []) => {
    const newExpanded = new Set(expandedNodes);
    
    if (newExpanded.has(tenantId)) {
      // Collapsing
      newExpanded.delete(tenantId);
      // Collapse all children
      const collapseChildren = (n) => {
        newExpanded.delete(n.tenant_id);
        n.children?.forEach(child => collapseChildren(child));
      };
      collapseChildren(node);
    } else {
      // Expanding - close siblings at same level
      if (parentNodes.length > 0) {
        const parentNode = parentNodes[parentNodes.length - 1];
        parentNode.children?.forEach(sibling => {
          if (sibling.tenant_id !== tenantId) {
            newExpanded.delete(sibling.tenant_id);
            // Also collapse all descendants of siblings
            const collapseDescendants = (n) => {
              newExpanded.delete(n.tenant_id);
              n.children?.forEach(child => collapseDescendants(child));
            };
            collapseDescendants(sibling);
          }
        });
      }
      newExpanded.add(tenantId);
    }
    
    setExpandedNodes(newExpanded);
  };

  const getTenantIcon = (tenant) => {
    const level = tenant.tenant_level || tenant.tenant_type;
    switch (level) {
      case 'organization':
        return <Building2 className="w-4 h-4" />;
      case 'continent':
        return <Globe className="w-4 h-4" />;
      case 'country':
        return <Globe className="w-4 h-4" />;
      case 'state':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'city':
        return <MapPin className="w-3.5 h-3.5" />;
      case 'location':
        return <MapPin className="w-3 h-3" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getLocationCount = (tenant) => {
    let count = 0;
    if (tenant.tenant_level === 'location') {
      count = 1;
    }
    tenant.children?.forEach(child => {
      count += getLocationCount(child);
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
    const childIds = getAllChildIds(tenant);
    
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

  const renderNode = (node, level = 0, parentNodes = []) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.tenant_id);
    const isSelected = selectedTenantId === node.tenant_id;
    const locationCount = getLocationCount(node);

    return (
      <div key={node.tenant_id} className="mb-0.5">
        <div
          style={{ paddingLeft: `${level * 12}px` }}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all text-sm ${
            isSelected
              ? theme === 'dark'
                ? 'bg-[#c00000] bg-opacity-20 border-l-2 border-[#c00000]'
                : 'bg-red-50 border-l-2 border-[#c00000]'
              : theme === 'dark'
              ? 'hover:bg-gray-700'
              : 'hover:bg-gray-100'
          }`}
          onClick={(e) => {
            // If has children, toggle on click
            if (hasChildren) {
              toggleNode(node.tenant_id, node, parentNodes);
            }
            handleTenantClick(node);
          }}
        >
          {hasChildren && (
            <div
              className={`p-0.5 flex-shrink-0 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          )}
          
          {!hasChildren && <div className="w-4 flex-shrink-0" />}
          
          <div className={`p-1 rounded flex-shrink-0 ${
            (node.tenant_level || node.tenant_type) === 'organization' 
              ? 'bg-blue-500 bg-opacity-20' 
              : (node.tenant_level || node.tenant_type) === 'continent'
              ? 'bg-purple-500 bg-opacity-20'
              : (node.tenant_level || node.tenant_type) === 'country' 
              ? 'bg-green-500 bg-opacity-20'
              : (node.tenant_level || node.tenant_type) === 'state'
              ? 'bg-yellow-500 bg-opacity-20'
              : (node.tenant_level || node.tenant_type) === 'city'
              ? 'bg-orange-500 bg-opacity-20'
              : 'bg-gray-500 bg-opacity-20'
          }`}>
            {getTenantIcon(node)}
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className={`text-xs font-medium truncate ${
              isSelected
                ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {node.display_name || node.name}
              {node.location_code && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({node.location_code})
                </span>
              )}
            </div>
          </div>
          
          {node.tenant_level === 'location' ? null : locationCount > 0 && (
            <div className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
              theme === 'dark' 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {locationCount}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children.map(child => renderNode(child, level + 1, [...parentNodes, node]))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      className={`h-full flex flex-col ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-gray-700' 
          : 'bg-white border-gray-200'
      }`}
      style={{ minWidth: `${sidebarWidth}px`, maxWidth: '500px' }}
    >
      {/* Header with Search */}
      <div className={`p-3 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Hierarchie
          </h3>
          <button
            onClick={fetchAllTenants}
            disabled={loading}
            className={`p-1 rounded hover:bg-gray-700 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </button>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Station oder Code suchen..."
            className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-md border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-1 focus:ring-[#c00000]`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-gray-600 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className={`text-center text-xs py-4 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine Hierarchie verfügbar'}
          </div>
        ) : (
          <div>
            <button
              onClick={handleShowAll}
              className={`w-full mb-2 px-2 py-1.5 text-xs text-left rounded-md transition-colors ${
                !selectedTenantId
                  ? theme === 'dark'
                    ? 'bg-[#c00000] bg-opacity-20 border-l-2 border-[#c00000] text-white'
                    : 'bg-red-50 border-l-2 border-[#c00000] text-gray-900'
                  : theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Alle anzeigen
            </button>
            {filteredTree.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TenantHierarchySidebarV2;
