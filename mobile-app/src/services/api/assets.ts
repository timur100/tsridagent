/**
 * TSRID Mobile App - Asset Service
 * 
 * API-Funktionen für Assets (Wareneingang, Suche, etc.)
 * Verwendet die gleichen Endpoints wie das Admin Portal!
 */

import apiClient from './client';
import { API_ENDPOINTS } from '../../config/api';

// Types
export interface Asset {
  asset_id: string;
  warehouse_asset_id: string;
  manufacturer_sn: string;
  type: string;
  type_label: string;
  manufacturer?: string;
  model?: string;
  status: 'in_storage' | 'deployed' | 'archived';
  location_id?: string;
  location_name?: string;
  imei?: string;
  mac?: string;
  purchase_date?: string;
  warranty_end?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetListResponse {
  success: boolean;
  total: number;
  items: Asset[];
  page: number;
  per_page: number;
}

export interface IntakeRequest {
  manufacturer_sn: string;
  type: string;
  imei?: string;
  mac?: string;
  notes?: string;
}

export interface IntakeResponse {
  success: boolean;
  message: string;
  asset_id: string;
  warehouse_asset_id: string;
  manufacturer_sn: string;
  type: string;
  type_label: string;
  status: string;
  verified: boolean;
}

export interface BulkEditRequest {
  asset_ids: string[];
  manufacturer?: string;
  model?: string;
  supplier?: string;
  purchase_date?: string;
  warranty_months?: number;
  warranty_end?: string;
  installation_date?: string;
  license_activated?: string;
  license_expires?: string;
  license_type?: string;
  license_key?: string;
  country?: string;
  notes?: string;
  technician?: string;
}

export interface NextIdPreview {
  next_sequence: number;
  warehouse_id: string;
  asset_type: string;
  type_label: string;
}

// Asset Service
const assetService = {
  /**
   * Assets abrufen mit Pagination und Filter
   */
  async getAssets(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    type?: string;
    status?: string;
    location_id?: string;
  }): Promise<AssetListResponse> {
    return apiClient.get(API_ENDPOINTS.assets.list, { params });
  },

  /**
   * Asset-Details abrufen
   */
  async getAssetById(assetId: string): Promise<Asset> {
    return apiClient.get(API_ENDPOINTS.assets.detail(assetId));
  },

  /**
   * Asset per Seriennummer oder Asset-ID suchen
   */
  async searchAsset(query: string): Promise<AssetListResponse> {
    return apiClient.get(API_ENDPOINTS.assets.list, {
      params: { search: query }
    });
  },

  /**
   * Neues Asset erfassen (Wareneingang)
   */
  async intakeAsset(data: IntakeRequest, receivedBy: string): Promise<IntakeResponse> {
    const response = await apiClient.post(
      `${API_ENDPOINTS.assets.intake}?received_by=${encodeURIComponent(receivedBy)}`,
      data,
      undefined,
      true // Queue offline
    );
    
    return response as IntakeResponse;
  },

  /**
   * Nächste ID vorschauen (für Label-Druck vor dem Speichern)
   */
  async previewNextId(assetType: string): Promise<NextIdPreview> {
    return apiClient.get(API_ENDPOINTS.assets.previewNextId, {
      params: { asset_type: assetType }
    });
  },

  /**
   * Mehrere Assets gleichzeitig bearbeiten
   */
  async bulkEdit(data: BulkEditRequest): Promise<{
    success: boolean;
    updated_count: number;
    failed_count: number;
    updated_ids: string[];
  }> {
    return apiClient.post(API_ENDPOINTS.assets.bulkEdit, data) as any;
  },

  /**
   * Unzugewiesene Assets (Lager)
   */
  async getUnassignedAssets(): Promise<Asset[]> {
    const response = await apiClient.get<{items: Asset[]}>(API_ENDPOINTS.assets.unassigned);
    return response.items || [];
  },

  /**
   * Asset einem Standort zuweisen
   */
  async assignToLocation(
    manufacturerSn: string,
    locationId: string,
    technician?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post(
      `${API_ENDPOINTS.assets.assignLocation(manufacturerSn)}?location_id=${encodeURIComponent(locationId)}&technician=${encodeURIComponent(technician || '')}`,
      undefined,
      undefined,
      true // Queue offline
    ) as any;
  },

  /**
   * Asset von Standort entfernen (zurück ins Lager)
   */
  async removeFromLocation(
    manufacturerSn: string,
    technician?: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(
      `${API_ENDPOINTS.assets.removeLocation(manufacturerSn)}?technician=${encodeURIComponent(technician || '')}&reason=${encodeURIComponent(reason || '')}`,
    ) as any;
  },

  /**
   * Asset archivieren (Soft Delete)
   */
  async archiveAsset(
    manufacturerSn: string,
    reason: string,
    user: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(
      `${API_ENDPOINTS.assets.delete(manufacturerSn)}?reason=${encodeURIComponent(reason)}&user=${encodeURIComponent(user)}`
    );
  },

  /**
   * Statistiken abrufen
   */
  async getStats(): Promise<{
    total_assets: number;
    in_storage: number;
    deployed: number;
    by_type: Record<string, number>;
  }> {
    return apiClient.get(API_ENDPOINTS.assets.stats);
  }
};

export default assetService;
