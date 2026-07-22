/**
 * Domain-driven Parcel repository for site container persistence and lot layout tracking.
 */

import type { StorageAdapter } from '@thoth/storage';
import type { SiteContainer, ParcelObject } from '../civil/types/siteAndParcels';

export interface SiteContainerRecord {
  id: string;
  container: SiteContainer;
  updatedAt: string;
}

export class ParcelRepository {
  private readonly collectionName = 'domain_parcels';

  constructor(private readonly adapter: StorageAdapter) {}

  /**
   * Saves a SiteContainer and all its constituent parcels.
   */
  public async saveSiteContainer(container: SiteContainer): Promise<SiteContainer> {
    const record: SiteContainerRecord = Object.freeze({
      id: container.id,
      container,
      updatedAt: new Date().toISOString(),
    });

    await this.adapter.put(this.collectionName, record);
    return container;
  }

  /**
   * Retrieves a SiteContainer by ID.
   */
  public async getSiteContainer(id: string): Promise<SiteContainer | undefined> {
    const record = await this.adapter.get<SiteContainerRecord>(this.collectionName, id);
    return record?.container;
  }

  /**
   * Retrieves all parcels within a site container.
   */
  public async getParcels(siteContainerId: string): Promise<ParcelObject[]> {
    const container = await this.getSiteContainer(siteContainerId);
    return container ? container.parcels : [];
  }
}
