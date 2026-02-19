/**
 * TSRID Mobile App - Modul-Konfiguration
 * 
 * Definiert alle verfügbaren Module und deren Einstellungen.
 * Module können pro Benutzer oder global aktiviert/deaktiviert werden.
 */

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  requiredPermissions: string[];
  screens: string[];
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'goods_receipt',
    name: 'Wareneingang',
    description: 'Assets scannen und im System erfassen',
    icon: 'package-variant',
    color: '#22c55e', // green
    enabled: true,
    requiredPermissions: ['assets.create'],
    screens: ['GoodsReceiptScan', 'GoodsReceiptConfirm']
  },
  {
    id: 'label_print',
    name: 'Label-Druck',
    description: 'Labels für Assets drucken',
    icon: 'printer',
    color: '#3b82f6', // blue
    enabled: true,
    requiredPermissions: ['assets.read'],
    screens: ['LabelPrint', 'PrinterSelect']
  },
  {
    id: 'asset_search',
    name: 'Asset-Suche',
    description: 'Assets suchen und Details anzeigen',
    icon: 'magnify',
    color: '#8b5cf6', // purple
    enabled: true,
    requiredPermissions: ['assets.read'],
    screens: ['AssetSearch', 'AssetDetail']
  },
  {
    id: 'inventory',
    name: 'Inventur',
    description: 'Bestandsaufnahme durchführen',
    icon: 'clipboard-list',
    color: '#f59e0b', // amber
    enabled: true,
    requiredPermissions: ['assets.read', 'assets.update'],
    screens: ['Inventory', 'InventoryResult']
  },
  {
    id: 'location_assign',
    name: 'Standort-Zuweisung',
    description: 'Assets Standorten zuweisen',
    icon: 'map-marker',
    color: '#ef4444', // red
    enabled: true,
    requiredPermissions: ['assets.update', 'locations.read'],
    screens: ['LocationAssign', 'LocationSelect']
  },
  {
    id: 'id_scan',
    name: 'ID-Scan',
    description: 'Ausweise und Reisepässe scannen',
    icon: 'card-account-details',
    color: '#06b6d4', // cyan
    enabled: true,
    requiredPermissions: ['id_scans.create'],
    screens: ['IDScan', 'IDScanResult']
  }
];

/**
 * Gibt die aktivierten Module zurück
 */
export const getEnabledModules = (userPermissions: string[] = []): ModuleConfig[] => {
  return MODULES.filter(module => {
    if (!module.enabled) return false;
    
    // Prüfe ob Benutzer alle erforderlichen Berechtigungen hat
    const hasPermissions = module.requiredPermissions.every(
      perm => userPermissions.includes(perm) || userPermissions.includes('admin')
    );
    
    return hasPermissions;
  });
};

/**
 * Modul nach ID finden
 */
export const getModuleById = (id: string): ModuleConfig | undefined => {
  return MODULES.find(m => m.id === id);
};

/**
 * Standard-Berechtigungen für verschiedene Rollen
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['admin'],
  warehouse: [
    'assets.create',
    'assets.read',
    'assets.update',
    'locations.read'
  ],
  technician: [
    'assets.read',
    'assets.update',
    'locations.read',
    'id_scans.create'
  ],
  viewer: [
    'assets.read',
    'locations.read'
  ]
};
