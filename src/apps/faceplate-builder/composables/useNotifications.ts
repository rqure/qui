import { ref } from 'vue';
import type { EntityId, FieldType, NotifyConfig, Notification } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import { logger } from '@/apps/faceplate-builder/utils/logger';
import { BindingService } from '@/apps/faceplate-builder/utils/binding-service';
import { IndirectFieldNotifier } from '@/apps/faceplate-builder/utils/indirect-field-notifier';
import type { FaceplateDataService, FaceplateRecord, FaceplateBindingDefinition } from '@/apps/faceplate-builder/utils/faceplate-data';
import type { NotificationSubscription } from '../components/types/faceplate-runtime';

export function useNotifications(
  dataStore: any,
  service: FaceplateDataService,
  entityId: () => EntityId | null,
  faceplate: () => FaceplateRecord | null,
  bindings: FaceplateBindingDefinition[],
  onBindingsChanged: () => void
) {
  const subscriptions = ref<NotificationSubscription[]>([]);
  const indirectNotifiers = ref(new Map<string, IndirectFieldNotifier>());
  const bindingService = new BindingService(dataStore, service, {}, new Map(), []);

  async function registerNotifications() {
    await cleanupNotifications();
    if (!isLive() || !entityId()) return;

    // Collect all field dependencies from bindings
    const dependencySet = new Set<string>();

    for (const binding of bindings) {
      if (binding.mode === 'field' || !binding.mode) {
        dependencySet.add(binding.expression);
      }
      // Add dependencies if they exist
      if (binding.dependencies && Array.isArray(binding.dependencies)) {
        binding.dependencies.forEach(dep => dependencySet.add(dep));
      }
    }

    // Add notification channel fields
    if (faceplate()) {
      const channels = Array.isArray(faceplate()!.notificationChannels)
        ? faceplate()!.notificationChannels
        : [];
      channels.forEach((channel) => {
        ensureArray(channel?.fields).forEach((field: string) => dependencySet.add(field));
      });
    }

    // Register notifications for each dependency
    for (const dependency of dependencySet) {
      // Skip literals
      if (isLiteral(dependency)) continue;

      try {
        const path = await bindingService['getFieldPath'](dependency);
        if (!path.length) continue;

        if (path.length > 1) {
          await registerIndirectNotification(dependency, path);
        } else {
          await registerDirectNotification(dependency, path[0]);
        }
      } catch (error) {
        logger.warn(`Failed to register notification for ${dependency}:`, error);
      }
    }
  }

  async function registerIndirectNotification(dependency: string, path: FieldType[]) {
    try {
      const notifier = new IndirectFieldNotifier(
        dataStore,
        entityId()!,
        path,
        (value) => handleNotification(dependency, value)
      );

      await notifier.start();
      indirectNotifiers.value.set(dependency, notifier);
    } catch (error) {
      logger.warn(`Failed to start IndirectFieldNotifier for dependency ${dependency}:`, error);
    }
  }

  async function registerDirectNotification(dependency: string, fieldType: FieldType) {
    const notifyConfig: NotifyConfig = {
      EntityId: {
        entity_id: entityId()!,
        field_type: fieldType,
        trigger_on_change: true,
        context: [],
      },
    };

    const callback = (notification: Notification) => {
      handleNotification(dependency, notification.current?.value ?
        ValueHelpers.extract(notification.current.value) : null);
    };

    try {
      await dataStore.registerNotification(notifyConfig, callback);
      subscriptions.value.push({ config: notifyConfig, callback });
    } catch (error) {
      logger.warn(`Failed to register notification for dependency ${dependency}:`, error);
    }
  }

  function handleNotification(dependency: string, value: unknown) {
    // When any field changes, re-evaluate all bindings
    // This is simpler than tracking complex dependencies
    onBindingsChanged();
  }

  async function cleanupNotifications() {
    const notifierStops = Array.from(indirectNotifiers.value.values()).map((notifier) =>
      notifier.stop().catch((err) => {
        logger.warn('Failed to stop IndirectFieldNotifier during cleanup:', err);
      })
    );
    indirectNotifiers.value.clear();

    const subscriptionCleanup = subscriptions.value.map(({ config, callback }) =>
      dataStore.unregisterNotification(config, callback).catch((err: any) => {
        logger.warn('Failed to unregister notification during cleanup:', err);
      })
    );
    subscriptions.value = [];

    await Promise.all([...notifierStops, ...subscriptionCleanup]);
  }

  function isLive() {
    return true; // Will be controlled by props
  }

  function isLiteral(expression: string): boolean {
    const trimmed = expression.trim();
    return (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      /^\d+(\.\d+)?$/.test(trimmed) ||
      ['true', 'false', 'null'].includes(trimmed)
    );
  }

  function ensureArray<T>(value: T[] | T | null | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  return {
    registerNotifications,
    cleanupNotifications,
  };
}