import { useCallback } from 'react';
import { fetchHuggingFaceAppList } from '@utils/huggingFaceApi';
import { buildMetadataMap, findAppInMetadataMap } from '@utils/appMatching';
import {
  isOfficialAppWithSpacesData,
  extractSpacesMetadata,
  buildEnrichedApp,
  enrichInstalledAppsWithAvailableMetadata,
} from './utils/appMetadata';

/**
 * Hook for enriching apps with metadata from Hugging Face
 * Handles matching, consolidation, and enrichment logic
 */
export function useAppEnrichment() {
  /**
   * Enriches daemon apps with Hugging Face metadata
   * @param {Array} daemonApps - Apps from daemon
   * @param {Set} installedAppNames - Set of installed app names (lowercase)
   * @param {Map} installedAppsMap - Map of installed apps from daemon (for merging custom_app_url)
   * @param {Array} additionalMetadataPool - Additional apps to use for enriching installed apps (e.g., official apps in unofficial mode)
   * @returns {Promise<{enrichedApps: Array, installed: Array, available: Array}>}
   */
  const enrichApps = useCallback(async (daemonApps, installedAppNames, installedAppsMap = new Map(), additionalMetadataPool = []) => {
    // 1. Fetch metadata from Hugging Face dataset
    let hfApps = [];
    try {
      hfApps = await fetchHuggingFaceAppList();
    } catch (hfErr) {
      console.warn('⚠️ Failed to fetch Hugging Face metadata:', hfErr.message);
    }
    
    // 2. Build metadata map for fast lookup
    const hfMetadataMap = buildMetadataMap(hfApps);
    
    // 3. Enrich daemon apps with HF metadata
    const enrichedApps = daemonApps.map(daemonApp => {
      // Check if this is an official app with metadata from /api/spaces
      const isOfficialApp = isOfficialAppWithSpacesData(daemonApp);
      const spaceData = isOfficialApp ? daemonApp.extra : null;
      
      let hfMetadata = null;
      
      // For official apps: use metadata directly from /api/spaces (already in daemonApp.extra)
      if (isOfficialApp) {
        hfMetadata = extractSpacesMetadata(spaceData);
      } else {
        // Only search in hfMetadataMap for non-official apps
        hfMetadata = findAppInMetadataMap(daemonApp, hfMetadataMap, hfApps);
      }
      
      // Determine if app is installed
      const isInstalled = installedAppNames.has(daemonApp.name?.toLowerCase());
      
      // Get installed app data from daemon (contains custom_app_url)
      const installedAppData = installedAppsMap.get(daemonApp.name?.toLowerCase());
      
      // Build enriched app
      let enrichedApp = buildEnrichedApp(daemonApp, hfMetadata, spaceData, isInstalled);
      
      // Merge custom_app_url from installed app data (daemon knows this, not HF)
      if (isInstalled && installedAppData?.extra?.custom_app_url) {
        enrichedApp = {
          ...enrichedApp,
          extra: {
            ...enrichedApp.extra,
            custom_app_url: installedAppData.extra.custom_app_url,
          },
        };
      }
      
      return enrichedApp;
    });
    
    // 4. Separate installed and available apps
    const installed = enrichedApps.filter(app => app.isInstalled);
    const available = enrichedApps.filter(app => !app.isInstalled);
    
    // 5. Enrich installed apps with metadata from available apps + additional pool
    // The additional pool is used in unofficial mode to provide official apps metadata
    const metadataPool = [...available, ...additionalMetadataPool];
    const installedWithEmoji = enrichInstalledAppsWithAvailableMetadata(installed, metadataPool);
    
    return {
      enrichedApps,
      installed: installedWithEmoji,
      available,
    };
  }, []);
  
  return {
    enrichApps,
  };
}

