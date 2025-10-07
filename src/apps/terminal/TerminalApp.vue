
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, h, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import { useMenuStore } from '@/stores/menu';
import EntityIdChip from './components/EntityIdChip.vue';
import type { EntityId, EntityType, FieldType, Value, Notification, NotifyConfig } from '@/core/data/types';
const menuStore = useMenuStore();

const dataStore = useDataStore();
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);
const currentCommand = ref('');
const outputLines = ref<Array<{ type: 'input' | 'output' | 'error', text: string }>>([]);
// Regex for entity IDs (assume 10+ digit numbers, or adjust as needed)
const ENTITY_ID_REGEX = /\b\d{6,}\b/g;

// Render output lines with entity IDs as chips
const renderedLines = computed(() => {
  return outputLines.value.map((line, idx) => {
    // Only parse for entity IDs in output lines (not input or error)
    if (line.type === 'output' || line.type === 'error') {
      const parts = [];
      let lastIdx = 0;
      let match;
      const text = line.text;
      ENTITY_ID_REGEX.lastIndex = 0;
      while ((match = ENTITY_ID_REGEX.exec(text)) !== null) {
        const entityId = Number(match[0]);
        // Push text before the match
        if (match.index > lastIdx) {
          parts.push(text.slice(lastIdx, match.index));
        }
        // Push the EntityIdChip
        parts.push(h(EntityIdChip, {
          entityId,
          onContextMenu: (e: any) => onEntityIdContextMenu(e, entityId)
        }));
        lastIdx = match.index + match[0].length;
      }
      // Push any remaining text
      if (lastIdx < text.length) {
        parts.push(text.slice(lastIdx));
      }
      return h('div', {
        class: ['terminal-line', `terminal-${line.type}`],
        key: idx
      }, parts);
    } else {
      // For input lines, just render as text
      return h('div', {
        class: ['terminal-line', `terminal-${line.type}`],
        key: idx
      }, line.text);
    }
  });
});

// Context menu handler for entity IDs
function onEntityIdContextMenu(e: { x: number, y: number }, entityId: EntityId) {
  // Show a context menu using the QUI menu system
  menuStore.showMenu(
    { x: e.x, y: e.y },
    [
      {
        id: 'open-db',
        label: 'Open in Database Browser',
        action: () => {
          // Broadcast navigation event (Database Browser listens for this)
          window.dispatchEvent(new CustomEvent('entity:navigate', { detail: { entityId } }));
        }
      },
      {
        id: 'copy-id',
        label: 'Copy Entity ID',
        action: () => {
          navigator.clipboard.writeText(String(entityId));
        }
      }
    ],
    { type: 'entity-id', data: { entityId } }
  );
}
const terminalOutput = ref<HTMLDivElement | null>(null);
const commandInput = ref<HTMLInputElement | null>(null);
const notifications = ref<Map<string, { config: NotifyConfig, callback: (notification: Notification) => void }>>(new Map());

// Scroll to bottom of terminal
function scrollToBottom() {
  nextTick(() => {
    if (terminalOutput.value) {
      terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight;
    }
  });
}

// Add output line
function addOutput(text: string, type: 'input' | 'output' | 'error' = 'output') {
  outputLines.value.push({ type, text });
  scrollToBottom();
}

// Format value for display
function formatValue(value: Value): string {
  if ('Bool' in value) return String(value.Bool);
  if ('Int' in value) return String(value.Int);
  if ('Float' in value) return String(value.Float);
  if ('String' in value) return value.String;
  if ('Blob' in value) return `<Blob ${value.Blob.length} bytes>`;
  if ('EntityReference' in value) return value.EntityReference !== null ? String(value.EntityReference) : 'null';
  if ('EntityList' in value) return `[${value.EntityList.join(', ')}]`;
  if ('Choice' in value) return `Choice(${value.Choice})`;
  if ('Timestamp' in value) return `Timestamp(${value.Timestamp})`;
  return 'Unknown';
}

// Parse value from string
function parseValue(valueStr: string, fieldType?: string): Value {
  // Try to infer type
  if (valueStr === 'true' || valueStr === 'false') {
    return { Bool: valueStr === 'true' };
  }
  if (valueStr === 'null') {
    return { EntityReference: null };
  }
  if (!isNaN(Number(valueStr))) {
    const num = Number(valueStr);
    if (Number.isInteger(num)) {
      return { Int: num };
    }
    return { Float: num };
  }
  return { String: valueStr };
}

// Execute command
async function executeCommand() {
  const cmd = currentCommand.value.trim();
  if (!cmd) return;

  // Add to history
  commandHistory.value.push(cmd);
  historyIndex.value = commandHistory.value.length;
  
  // Show command in output
  addOutput(`> ${cmd}`, 'input');
  
  // Clear input
  currentCommand.value = '';

  try {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toUpperCase();
    const args = parts.slice(1);

    switch (command) {
      case 'HELP':
        showHelp();
        break;
      case 'CLEAR':
        outputLines.value = [];
        break;
      case 'PING':
        addOutput('PONG');
        break;
      case 'GET':
        await cmdGet(args);
        break;
      case 'SET':
        await cmdSet(args);
        break;
      case 'CREATE':
        await cmdCreate(args);
        break;
      case 'DELETE':
        await cmdDelete(args);
        break;
      case 'EXISTS':
        await cmdExists(args);
        break;
      case 'GETTYPE':
        await cmdGetType(args);
        break;
      case 'RESTYPE':
        await cmdResType(args);
        break;
      case 'GETFLD':
        await cmdGetField(args);
        break;
      case 'RESFLD':
        await cmdResField(args);
        break;
      case 'FIND':
        await cmdFind(args);
        break;
      case 'TYPES':
        await cmdTypes();
        break;
      case 'SCHEMA':
        await cmdSchema(args);
        break;
      case 'NOTIFY':
        await cmdNotify(args);
        break;
      case 'UNNOTIFY':
        await cmdUnnotify(args);
        break;
      default:
        addOutput(`Unknown command: ${command}. Type HELP for available commands.`, 'error');
    }
  } catch (error) {
    addOutput(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

// Command implementations
function showHelp() {
  addOutput('Available commands:');
  addOutput('  HELP                                    - Show this help message');
  addOutput('  CLEAR                                   - Clear terminal');
  addOutput('  PING                                    - Test connection');
  addOutput('  GET <entity_id> <field1> [field2...]   - Read entity fields');
  addOutput('  SET <entity_id> <field> <value>        - Write entity field');
  addOutput('  CREATE <type> <name> [parent_id]       - Create entity');
  addOutput('  DELETE <entity_id>                      - Delete entity');
  addOutput('  EXISTS <entity_id>                      - Check if entity exists');
  addOutput('  GETTYPE <name>                          - Get entity type ID');
  addOutput('  RESTYPE <type_id>                       - Resolve entity type name');
  addOutput('  GETFLD <name>                           - Get field type ID');
  addOutput('  RESFLD <field_id>                       - Resolve field type name');
  addOutput('  FIND <type> [filter]                    - Find entities by type');
  addOutput('  TYPES                                   - List all entity types');
  addOutput('  SCHEMA <type>                           - Get entity schema');
  addOutput('  NOTIFY <entity_id> <field>              - Subscribe to notifications');
  addOutput('  UNNOTIFY <entity_id> <field>            - Unsubscribe from notifications');
}

async function cmdGet(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: GET <entity_id> <field1> [field2...]', 'error');
    return;
  }

  const entityId = Number(args[0]);
  const fieldNames = args.slice(1);
  
  // Resolve field names to field types
  const fields: FieldType[] = [];
  for (const fieldName of fieldNames) {
    const fieldType = await dataStore.getFieldType(fieldName);
    fields.push(fieldType);
  }

  const [value, timestamp, writer] = await dataStore.read(entityId, fields);
  addOutput(`Value: ${formatValue(value)}`);
  addOutput(`Timestamp: ${timestamp}`);
  addOutput(`Writer: ${writer || 'none'}`);
}

async function cmdSet(args: string[]) {
  if (args.length < 3) {
    addOutput('Usage: SET <entity_id> <field> <value>', 'error');
    return;
  }

  const entityId = Number(args[0]);
  const fieldName = args[1];
  const valueStr = args.slice(2).join(' ');

  const fieldType = await dataStore.getFieldType(fieldName);
  const value = parseValue(valueStr);

  await dataStore.write(entityId, [fieldType], value);
  addOutput('OK');
}

async function cmdCreate(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: CREATE <type> <name> [parent_id]', 'error');
    return;
  }

  const typeName = args[0];
  const name = args[1];
  const parentId = args.length > 2 ? Number(args[2]) : null;

  const entityType = await dataStore.getEntityType(typeName);
  const entityId = await dataStore.createEntity(entityType, parentId, name);
  addOutput(`Created entity: ${entityId}`);
}

async function cmdDelete(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: DELETE <entity_id>', 'error');
    return;
  }

  const entityId = Number(args[0]);
  await dataStore.deleteEntity(entityId);
  addOutput('OK');
}

async function cmdExists(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: EXISTS <entity_id>', 'error');
    return;
  }

  const entityId = Number(args[0]);
  const exists = await dataStore.entityExists(entityId);
  addOutput(exists ? '1' : '0');
}

async function cmdGetType(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: GETTYPE <name>', 'error');
    return;
  }

  const typeName = args.join(' ');
  const typeId = await dataStore.getEntityType(typeName);
  addOutput(String(typeId));
}

async function cmdResType(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: RESTYPE <type_id>', 'error');
    return;
  }

  const typeId = Number(args[0]);
  const typeName = await dataStore.resolveEntityType(typeId);
  addOutput(typeName);
}

async function cmdGetField(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: GETFLD <name>', 'error');
    return;
  }

  const fieldName = args.join(' ');
  const fieldId = await dataStore.getFieldType(fieldName);
  addOutput(String(fieldId));
}

async function cmdResField(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: RESFLD <field_id>', 'error');
    return;
  }

  const fieldId = Number(args[0]);
  const fieldName = await dataStore.resolveFieldType(fieldId);
  addOutput(fieldName);
}

async function cmdFind(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: FIND <type> [filter]', 'error');
    return;
  }

  const typeName = args[0];
  const filter = args.slice(1).join(' ') || undefined;

  const entityType = await dataStore.getEntityType(typeName);
  const entities = await dataStore.findEntities(entityType, filter);
  
  addOutput(`Found ${entities.length} entities:`);
  entities.forEach((id, index) => {
    addOutput(`${index + 1}) ${id}`);
  });
}

async function cmdTypes() {
  const types = await dataStore.getEntityTypes();
  addOutput(`Found ${types.length} entity types:`);
  types.forEach((type, index) => {
    addOutput(`${index + 1}) ${type}`);
  });
}

async function cmdSchema(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: SCHEMA <type>', 'error');
    return;
  }

  const typeName = args[0];
  const entityType = await dataStore.getEntityType(typeName);
  const schema = await dataStore.getEntitySchema(entityType);
  
  addOutput(`Schema for ${typeName}:`);
  addOutput(`  Inherits: ${schema.inherit.join(', ') || 'none'}`);
  addOutput(`  Fields:`);
  
  for (const [fieldType, fieldSchema] of Object.entries(schema.fields)) {
    const fieldName = await dataStore.resolveFieldType(Number(fieldType));
    addOutput(`    ${fieldName}: ${JSON.stringify(fieldSchema)}`);
  }
}

async function cmdNotify(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: NOTIFY <entity_id> <field>', 'error');
    return;
  }

  const entityId = Number(args[0]);
  const fieldName = args[1];
  const fieldType = await dataStore.getFieldType(fieldName);

  const config: NotifyConfig = {
    EntityId: {
      entity_id: entityId,
      field_type: fieldType,
      trigger_on_change: true,
      context: []
    }
  };

  const key = `${entityId}-${fieldType}`;
  
  if (notifications.value.has(key)) {
    addOutput('Already subscribed to this notification', 'error');
    return;
  }

  const callback = (notification: Notification) => {
    const value = notification.current.value;
    const fieldPath = notification.current.field_path;
    addOutput(`[NOTIFICATION] Entity: ${notification.current.entity_id}, Field: ${fieldPath.join('->')}, Value: ${value ? formatValue(value) : 'null'}`);
  };

  await dataStore.registerNotification(config, callback);

  notifications.value.set(key, { config, callback });
  addOutput('Subscribed to notifications');
}

async function cmdUnnotify(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: UNNOTIFY <entity_id> <field>', 'error');
    return;
  }

  const entityId = Number(args[0]);
  const fieldName = args[1];
  const fieldType = await dataStore.getFieldType(fieldName);

  const key = `${entityId}-${fieldType}`;
  const sub = notifications.value.get(key);
  
  if (!sub) {
    addOutput('Not subscribed to this notification', 'error');
    return;
  }

  await dataStore.unregisterNotification(sub.config, sub.callback);
  notifications.value.delete(key);
  addOutput('Unsubscribed from notifications');
}

// Handle keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (historyIndex.value > 0) {
      historyIndex.value--;
      currentCommand.value = commandHistory.value[historyIndex.value];
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++;
      currentCommand.value = commandHistory.value[historyIndex.value];
    } else if (historyIndex.value === commandHistory.value.length - 1) {
      historyIndex.value = commandHistory.value.length;
      currentCommand.value = '';
    }
  } else if (event.key === 'Tab') {
    event.preventDefault();
    // TODO: Add command completion
  }
}

// Focus input when terminal is clicked
function focusInput() {
  commandInput.value?.focus();
}

onMounted(async () => {
  addOutput('QCore Terminal v1.0.0');
  addOutput('Type HELP for available commands.');
  addOutput('');
  
  // Ensure connection
  if (!dataStore.isConnected) {
    await dataStore.connect();
  }
  
  // Focus input
  focusInput();
});

onUnmounted(async () => {
  // Clean up all notifications
  for (const sub of notifications.value.values()) {
    await dataStore.unregisterNotification(sub.config, sub.callback);
  }
  notifications.value.clear();
});
</script>

<template>
  <div class="terminal-app" @click="focusInput">
    <div class="terminal-output" ref="terminalOutput">
      <component v-for="(vnode, idx) in renderedLines" :key="idx" :is="vnode" />
    </div>
    <div class="terminal-input-container">
      <span class="terminal-prompt">&gt;</span>
      <input
        ref="commandInput"
        v-model="currentCommand"
        @keydown.enter="executeCommand"
        @keydown="handleKeyDown"
        class="terminal-input"
        type="text"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  </div>
</template>

<style scoped>
.terminal-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-primary);
  color: var(--qui-accent-color);
  font-family: var(--qui-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
  font-size: var(--qui-font-size-base, 14px);
  padding: 12px;
  overflow: hidden;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  line-height: 1.5;
  color: var(--qui-accent-color);
}

.terminal-line {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.terminal-input {
  color: var(--qui-accent-color);
}

.terminal-error {
  color: var(--qui-danger-color);
}

.terminal-input-container {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--qui-accent-color);
  padding-top: 8px;
}

.terminal-prompt {
  color: var(--qui-accent-color);
  margin-right: 8px;
  font-weight: bold;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  caret-color: var(--qui-accent-color);
}

/* Scrollbar styling */
.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track, #111111);
}

.terminal-output::-webkit-scrollbar-thumb {
  background: var(--qui-accent-color);
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: var(--qui-accent-secondary, #00b4ff);
}
</style>
