/**
 * Domain-driven Site repository for persistence, transactional operations,
 * and checkpoint snapshots using the pluggable StorageAdapter.
 */

import type { StorageAdapter } from '@thoth/storage';
import type { Site } from '../spatial/primitives';

export interface SiteRecord {
  id: string;
  name: string;
  updatedAt: string;
  siteData: Site;
  version: number;
}

export class SiteRepository {
  private readonly collectionName = 'domain_sites';

  constructor(private readonly adapter: StorageAdapter) {}

  /**
   * Retrieves a Site by ID.
   */
  public async getSite(id: string): Promise<Site | undefined> {
    const record = await this.adapter.get<SiteRecord>(this.collectionName, id);
    return record?.siteData;
  }

  /**
   * Saves or updates a Site entity transactionally.
   */
  public async saveSite(site: Site): Promise<Site> {
    const existing = await this.adapter.get<SiteRecord>(this.collectionName, site.id);
    const version = existing ? existing.version + 1 : 1;

    const record: SiteRecord = Object.freeze({
      id: site.id,
      name: site.name,
      updatedAt: new Date().toISOString(),
      siteData: site,
      version,
    });

    await this.adapter.put(this.collectionName, record);
    return site;
  }

  /**
   * Lists all stored Sites.
   */
  public async listSites(): Promise<Site[]> {
    const records = await this.adapter.list<SiteRecord>(this.collectionName);
    return records.map((r) => r.siteData);
  }

  /**
   * Deletes a Site by ID.
   */
  public async deleteSite(id: string): Promise<boolean> {
    return this.adapter.delete(this.collectionName, id);
  }

  /**
   * Executes an atomic transaction updating a Site.
   */
  public async updateSiteTransactional(
    siteId: string,
    updater: (current: Site) => Site | Promise<Site>
  ): Promise<Site> {
    return this.adapter.transaction(async () => {
      const current = await this.getSite(siteId);
      if (!current) {
        throw new Error(`Site with id "${siteId}" not found in storage.`);
      }
      const updated = await updater(current);
      await this.saveSite(updated);
      return updated;
    });
  }
}
