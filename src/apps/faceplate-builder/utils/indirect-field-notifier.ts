/**
 * IndirectFieldNotifier
 * 
 * Manages notifications for indirect field paths (e.g., "Parent->Name").
 * Registers notifications on each field in the path, including intermediate
 * entity references. When an entity reference changes, automatically
 * re-resolves the path and updates downstream notifications.
 */

import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';

// Type for the data store instance returned by useDataStore()
type DataStoreInstance = ReturnType<typeof import('@/stores/data').useDataStore>;

interface PathSegment {
  entityId: EntityId;
  fieldType: FieldType;
  notifyConfig: NotifyConfig;
  callback: (notification: Notification) => void;
}

export class IndirectFieldNotifier {
  private dataStore: DataStoreInstance;
  private startEntityId: EntityId;
  private fieldPath: FieldType[];
  private onValueChange: (value: unknown) => void;
  private pathSegments: PathSegment[] = [];
  private isActive: boolean = false;

  constructor(
    dataStore: DataStoreInstance,
    startEntityId: EntityId,
    fieldPath: FieldType[],
    onValueChange: (value: unknown) => void
  ) {
    this.dataStore = dataStore;
    this.startEntityId = startEntityId;
    this.fieldPath = fieldPath;
    this.onValueChange = onValueChange;
  }

  /**
   * Start monitoring the field path
   */
  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;

    try {
      await this.registerPath(this.startEntityId, 0);
    } catch (error) {
      console.warn('Failed to start indirect field notifier:', error);
      this.isActive = false;
    }
  }

  /**
   * Stop monitoring and cleanup all notifications
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;

    await this.cleanupSegments(0);
  }

  /**
   * Register notifications for the path starting from a given segment index
   */
  private async registerPath(entityId: EntityId, segmentIndex: number): Promise<void> {
    // If we've reached the end of the path, read the final value
    if (segmentIndex >= this.fieldPath.length) {
      return;
    }

    const fieldType = this.fieldPath[segmentIndex];
    const isLastSegment = segmentIndex === this.fieldPath.length - 1;

    // Create notification config for this segment
    const notifyConfig: NotifyConfig = {
      EntityId: {
        entity_id: entityId,
        field_type: fieldType,
        trigger_on_change: true,
        context: [],
      },
    };

    // Create callback for this segment
    const callback = async (notification: Notification) => {
      if (!this.isActive) return;

      const value = notification.current.value;
      const extractedValue = value ? ValueHelpers.extract(value) : null;

      if (isLastSegment) {
        // Final segment - notify with the value
        this.onValueChange(extractedValue);
      } else {
        // Intermediate segment - check if entity reference changed
        if (value && ValueHelpers.isEntityRef(value)) {
          const newEntityId = value.EntityReference;

          // If the entity reference changed, cleanup and re-register downstream path
          if (newEntityId !== null) {
            await this.cleanupSegments(segmentIndex + 1);
            await this.registerPath(newEntityId, segmentIndex + 1);

            // After re-registering, read the final value
            await this.readFinalValue();
          } else {
            // Reference became null, cleanup downstream and notify with null
            await this.cleanupSegments(segmentIndex + 1);
            this.onValueChange(null);
          }
        }
      }
    };

    // Register the notification
    await this.dataStore.registerNotification(notifyConfig, callback);

    // Store segment info
    this.pathSegments[segmentIndex] = {
      entityId,
      fieldType,
      notifyConfig,
      callback,
    };

    // If this is not the last segment, resolve the entity reference and continue
    if (!isLastSegment) {
      try {
        const [value] = await this.dataStore.read(entityId, [fieldType]);
        
        if (value && ValueHelpers.isEntityRef(value)) {
          const nextEntityId = value.EntityReference;
          
          if (nextEntityId !== null) {
            await this.registerPath(nextEntityId, segmentIndex + 1);
          }
        }
      } catch (error) {
        console.warn(`Failed to read entity reference at segment ${segmentIndex}:`, error);
      }
    }

    // If this is the last segment, read and notify with initial value
    if (isLastSegment) {
      await this.readFinalValue();
    }
  }

  /**
   * Read the final value by traversing the full path
   */
  private async readFinalValue(): Promise<void> {
    if (!this.isActive || this.fieldPath.length === 0) return;

    try {
      const [value] = await this.dataStore.read(this.startEntityId, this.fieldPath);
      const extractedValue = ValueHelpers.extract(value);
      this.onValueChange(extractedValue);
    } catch (error) {
      console.warn('Failed to read final value:', error);
      this.onValueChange(null);
    }
  }

  /**
   * Cleanup notifications from a given segment index onwards
   */
  private async cleanupSegments(fromIndex: number): Promise<void> {
    const segmentsToCleanup = this.pathSegments.splice(fromIndex);

    await Promise.all(
      segmentsToCleanup.map(async (segment) => {
        try {
          await this.dataStore.unregisterNotification(segment.notifyConfig, segment.callback);
        } catch (error) {
          console.warn('Failed to unregister notification:', error);
        }
      })
    );
  }
}
