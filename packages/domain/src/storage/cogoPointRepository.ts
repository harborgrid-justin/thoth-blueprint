/**
 * Domain-driven COGO Point repository for spatial point cloud indexing,
 * bulk range queries, and point group persistence.
 */

import type { StorageAdapter } from '@thoth/storage';
import type { CogoPoint } from '../survey/points';

export interface CogoPointRecord {
  id: string;
  pointNumber: number;
  siteId: string;
  data: CogoPoint;
  updatedAt: string;
}

export class CogoPointRepository {
  private readonly collectionName = 'domain_cogo_points';

  constructor(private readonly adapter: StorageAdapter) {}

  /**
   * Bulk inserts or updates COGO points transactionally.
   */
  public async savePoints(siteId: string, points: CogoPoint[]): Promise<CogoPoint[]> {
    return this.adapter.transaction(async () => {
      const now = new Date().toISOString();
      for (const point of points) {
        const record: CogoPointRecord = Object.freeze({
          id: `${siteId}-${point.pointNumber}`,
          pointNumber: point.pointNumber,
          siteId,
          data: point,
          updatedAt: now,
        });
        await this.adapter.put(this.collectionName, record);
      }
      return points;
    });
  }

  /**
   * Queries all COGO points for a specific Site.
   */
  public async getPointsBySite(siteId: string): Promise<CogoPoint[]> {
    const records = await this.adapter.list<CogoPointRecord>(this.collectionName);
    return records.filter((r) => r.siteId === siteId).map((r) => r.data);
  }

  /**
   * Performs spatial bounding box query for points within minX, minY, maxX, maxY.
   */
  public async queryBoundingBox(
    siteId: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Promise<CogoPoint[]> {
    const points = await this.getPointsBySite(siteId);
    return points.filter((p) => {
      return p.easting >= minX && p.easting <= maxX && p.northing >= minY && p.northing <= maxY;
    });
  }
}
