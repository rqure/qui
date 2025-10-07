
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
const commandHint = ref('');

// Available commands for auto-completion
const availableCommands = [
  'PING', 'GET', 'SET', 'CREATE', 'DELETE', 'DEL', 'EXISTS',
  'GETTYPE', 'RESTYPE', 'GETFLD', 'RESFLD', 'FIND', 'TYPES',
  'GETSCH', 'GETCSCH', 'LISTEN', 'UNLISTEN', 'POLL', 'INFO',
  'HELP', 'CLEAR', 'CLS'
];

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
      case 'CLS':
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
      case 'DEL':
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
      case 'GETSCH':
      case 'SCHEMA':
        await cmdSchema(args);
        break;
      case 'GETCSCH':
        await cmdCompleteSchema(args);
        break;
      case 'LISTEN':
        await cmdListen(args);
        break;
      case 'UNLISTEN':
        await cmdUnlisten(args);
        break;
      case 'POLL':
        await cmdPoll(args);
        break;
      case 'INFO':
        await cmdInfo();
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
  addOutput('  HELP                                      - Show this help message');
  addOutput('  CLEAR                                     - Clear terminal');
  addOutput('  PING                                      - Test connection');
  addOutput('  GET <entity_id> [field...]                - Get field value(s) (all fields if none specified)');
  addOutput('  SET <entity_id> <field> <value>           - Set field value');
  addOutput('  CREATE <type> <name> [parent]             - Create new entity');
  addOutput('  DELETE <entity_id>                        - Delete entity');
  addOutput('  EXISTS <entity_id>                        - Check if entity exists');
  addOutput('  GETTYPE <name>                            - Get entity type ID');
  addOutput('  RESTYPE <id>                              - Resolve entity type name');
  addOutput('  GETFLD <name>                             - Get field type ID');
  addOutput('  RESFLD <id>                               - Resolve field type name');
  addOutput('  FIND <type> [filter]                      - Find entities');
  addOutput('  TYPES                                     - List all entity types');
  addOutput('  GETSCH <type>                             - Get entity schema');
  addOutput('  GETCSCH <type>                            - Get complete entity schema (with inheritance)');
  addOutput('  LISTEN <target> <field> [CHANGE] [ctx...] - Listen for field changes');
  addOutput('  UNLISTEN <target> <field> [CHANGE] [...]  - Stop listening for field changes');
  addOutput('  POLL [interval_ms]                        - Poll for notifications continuously');
  addOutput('  INFO                                      - Server information');
  addOutput('');
  addOutput('Examples:');
  addOutput('  GET 12345              - Get all fields from entity 12345');
  addOutput('  GET 12345 Name         - Get Name field from entity 12345');
  addOutput('  SET 12345 Name "test"  - Set Name field');
  addOutput('  LISTEN 12345 Name      - Listen for changes to Name field on entity 12345');
  addOutput('  LISTEN User Email      - Listen for changes to Email field on all User entities');
  addOutput('  POLL                   - Start polling for notifications (Ctrl+C to stop)');
}

async function cmdGet(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: GET <entity_id> [field1] [field2...]', 'error');
    return;
  }

  const entityId = Number(args[0]);
  
  if (args.length === 1) {
    // Get all fields from complete schema
    // Extract entity type from entity ID (upper 32 bits)
    const entityType = Math.floor(entityId / (2 ** 32));
    const schema = await dataStore.getEntitySchema(entityType);
    
    for (const [fieldTypeStr, _fieldSchema] of Object.entries(schema.fields)) {
      const fieldType = Number(fieldTypeStr);
      const fieldName = await dataStore.resolveFieldType(fieldType);
      try {
        const [value, timestamp, writer] = await dataStore.read(entityId, [fieldType]);
        addOutput(`${fieldName}: ${formatValue(value)}`);
      } catch (error) {
        // Skip fields that don't have values
      }
    }
  } else {
    // Get specified fields
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
    addOutput('Usage: GETSCH <type>', 'error');
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

async function cmdCompleteSchema(args: string[]) {
  if (args.length < 1) {
    addOutput('Usage: GETCSCH <type>', 'error');
    return;
  }

  const typeName = args[0];
  const entityType = await dataStore.getEntityType(typeName);
  const schema = await dataStore.getEntitySchema(entityType);
  
  addOutput(`Complete Schema for ${typeName} (including inherited):`);
  addOutput(`  Inherits: ${schema.inherit.join(', ') || 'none'}`);
  addOutput(`  All Fields:`);
  
  for (const [fieldType, fieldSchema] of Object.entries(schema.fields)) {
    const fieldName = await dataStore.resolveFieldType(Number(fieldType));
    addOutput(`    ${fieldName}: ${JSON.stringify(fieldSchema)}`);
  }
}

async function cmdListen(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: LISTEN <target> <field> [CHANGE] [context_fields...]', 'error');
    addOutput('  target: entity_id or entity_type', 'error');
    return;
  }

  const target = args[0];
  const fieldName = args[1];
  const fieldType = await dataStore.getFieldType(fieldName);

  // Check if target is numeric (entity ID) or string (entity type)
  const isEntityId = !isNaN(Number(target));
  
  let config: NotifyConfig;
  let key: string;
  
  if (isEntityId) {
    const entityId = Number(target);
    config = {
      EntityId: {
        entity_id: entityId,
        field_type: fieldType,
        trigger_on_change: true,
        context: []
      }
    };
    key = `entity-${entityId}-${fieldType}`;
  } else {
    const entityType = await dataStore.getEntityType(target);
    config = {
      EntityType: {
        entity_type: entityType,
        field_type: fieldType,
        trigger_on_change: true,
        context: []
      }
    };
    key = `type-${entityType}-${fieldType}`;
  }
  
  if (notifications.value.has(key)) {
    addOutput('Already listening for this configuration', 'error');
    return;
  }

  const callback = (notification: Notification) => {
    const value = notification.current.value;
    const fieldPath = notification.current.field_path;
    const prevValue = notification.previous.value;
    addOutput(`[NOTIFY] Entity: ${notification.current.entity_id}, Field: ${fieldPath.join('->')}, ${prevValue ? formatValue(prevValue) : 'null'} -> ${value ? formatValue(value) : 'null'}`);
  };

  await dataStore.registerNotification(config, callback);

  notifications.value.set(key, { config, callback });
  addOutput('Listening for notifications');
}

async function cmdUnlisten(args: string[]) {
  if (args.length < 2) {
    addOutput('Usage: UNLISTEN <target> <field> [CHANGE] [context_fields...]', 'error');
    return;
  }

  const target = args[0];
  const fieldName = args[1];
  const fieldType = await dataStore.getFieldType(fieldName);

  const isEntityId = !isNaN(Number(target));
  let key: string;
  
  if (isEntityId) {
    const entityId = Number(target);
    key = `entity-${entityId}-${fieldType}`;
  } else {
    const entityType = await dataStore.getEntityType(target);
    key = `type-${entityType}-${fieldType}`;
  }

  const sub = notifications.value.get(key);
  
  if (!sub) {
    addOutput('Not listening for this configuration', 'error');
    return;
  }

  await dataStore.unregisterNotification(sub.config, sub.callback);
  notifications.value.delete(key);
  addOutput('Stopped listening');
}

let pollingInterval: number | null = null;

async function cmdPoll(args: string[]) {
  const intervalMs = args.length > 0 ? Number(args[0]) : 100;
  
  if (pollingInterval !== null) {
    addOutput('Already polling. Stop with Ctrl+C or type another command.', 'error');
    return;
  }
  
  addOutput(`Polling for notifications every ${intervalMs}ms. Type any command to stop.`);
  
  pollingInterval = window.setInterval(() => {
    // Notifications are automatically delivered via WebSocket
    // This just keeps the message visible
  }, intervalMs);
}

function stopPolling() {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    addOutput('Stopped polling');
  }
}

async function cmdInfo() {
  const types = await dataStore.getEntityTypes();
  
  addOutput('# Server');
  addOutput('qcore_version: 0.1.0');
  addOutput('');
  addOutput('# Stats');
  addOutput(`entity_types: ${types.length}`);
}

// Update command hint as user types
function updateCommandHint() {
  const input = currentCommand.value.toUpperCase();
  if (!input || input.includes(' ')) {
    commandHint.value = '';
    return;
  }
  
  // Find matching command
  const match = availableCommands.find(cmd => cmd.startsWith(input) && cmd !== input);
  if (match) {
    // Set hint to show the rest of the command
    commandHint.value = currentCommand.value + match.slice(input.length);
  } else {
    commandHint.value = '';
  }
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
    // Tab completion
    const input = currentCommand.value.trim().toUpperCase();
    if (!input) return;
    
    // Find matching command
    const matches = availableCommands.filter(cmd => cmd.startsWith(input));
    if (matches.length === 1) {
      currentCommand.value = matches[0] + ' ';
      commandHint.value = '';
    } else if (matches.length > 1) {
      addOutput(`Possible commands: ${matches.join(', ')}`);
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    commandHint.value = '';
  }
}

// Stop polling when user starts typing a new command
function onCommandInput() {
  stopPolling();
  updateCommandHint();
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
      <div class="terminal-input-wrapper">
        <input
          ref="commandInput"
          v-model="currentCommand"
          @keydown.enter="executeCommand"
          @keydown="handleKeyDown"
          @input="onCommandInput"
          class="terminal-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
        <span class="terminal-hint" v-if="commandHint">{{ commandHint }}</span>
      </div>
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

.terminal-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
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
  position: relative;
  z-index: 2;
}

.terminal-hint {
  position: absolute;
  left: 0;
  color: var(--qui-text-secondary);
  opacity: 0.4;
  pointer-events: none;
  font-family: inherit;
  font-size: inherit;
  white-space: pre;
  z-index: 1;
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
