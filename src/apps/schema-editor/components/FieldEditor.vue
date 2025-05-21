<template>
  <div class="field-editor">
    <!-- Field type selector -->
    <div class="field-type-selector">
      <label for="field-type">Field Type:</label>
      <select id="field-type" v-model="selectedFieldType" @change="onFieldTypeChange">
        <option v-for="type in availableFieldTypes" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
    </div>

    <!-- Common field properties -->
    <div class="field-properties">
      <div class="property-group">
        <label for="field-name">Field Name:</label>
        <input
          id="field-name"
          type="text"
          v-model="fieldName"
          placeholder="Enter field name"
        />
      </div>

      <div class="property-group">
        <label for="field-required">Required:</label>
        <input
          id="field-required"
          type="checkbox"
          v-model="isFieldRequired"
        />
      </div>

      <div class="property-group">
        <label for="field-unique">Unique:</label>
        <input
          id="field-unique"
          type="checkbox"
          v-model="isFieldUnique"
        />
      </div>
    </div>

    <!-- String and Text area settings -->
    <div v-if="isStringType" class="string-settings">
      <div class="property-group">
        <label for="max-length">Max Length:</label>
        <input
          id="max-length"
          type="number"
          v-model="maxLength"
          placeholder="Enter max length"
        />
      </div>

      <div class="property-group">
        <label for="default-value">Default Value:</label>
        <input
          id="default-value"
          type="text"
          v-model="defaultStringValue"
          placeholder="Enter default value"
        />
      </div>
    </div>

    <!-- Number settings -->
    <div v-else-if="isNumberType" class="number-settings">
      <div class="property-group">
        <label for="min-value">Min Value:</label>
        <input
          id="min-value"
          type="number"
          v-model="minValue"
          placeholder="Enter min value"
        />
      </div>

      <div class="property-group">
        <label for="max-value">Max Value:</label>
        <input
          id="max-value"
          type="number"
          v-model="maxValue"
          placeholder="Enter max value"
        />
      </div>

      <div class="property-group">
        <label for="default-value">Default Value:</label>
        <input
          id="default-value"
          type="number"
          v-model="defaultNumberValue"
          placeholder="Enter default value"
        />
      </div>
    </div>

    <!-- Boolean settings -->
    <div v-else-if="isBooleanType" class="boolean-settings">
      <div class="property-group">
        <label for="default-boolean">Default Value:</label>
        <select
          id="default-boolean"
          v-model="defaultBooleanValue"
        >
          <option :value="true">True</option>
          <option :value="false">False</option>
        </select>
      </div>
    </div>

    <!-- Timestamp settings -->
    <div v-else-if="isTimestampType" class="timestamp-settings">
      <div class="property-group">
        <label for="default-timestamp">Default Value:</label>
        <input
          id="default-timestamp"
          type="datetime-local"
          v-model="defaultTimestampValue"
        />
      </div>
    </div>

    <!-- Choice type settings -->
    <div v-else-if="isChoiceType" class="choice-settings">
      <div class="property-group">
        <label for="choices">Choices:</label>
        <div class="choices-container">
          <div class="choice-item" v-for="(choice, index) in choices" :key="index">
            <input
              type="text"
              v-model="choice.value"
              placeholder="Enter choice value"
              class="choice-input"
            />
            <button
              class="remove-choice-button"
              @click="removeChoice(index)"
              title="Remove choice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            </button>
          </div>
          <button class="add-choice-button" @click="addChoice">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            Add Choice
          </button>
        </div>
      </div>

      <div v-if="choiceError" class="choice-error">{{ choiceError }}</div>

      <div class="choices-list">
        <div v-for="(choice, index) in choices" :key="index" class="choice-item">
          <div class="choice-index">{{ index + 1 }}</div>
          <div class="db-choice-value">{{ choice.value }}</div>
          <div class="choice-actions">
            <button
              class="move-up-button"
              @click="moveChoice(index, 'up')"
              :disabled="index === 0"
              title="Move up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M7 14l5-5 5 5z"/>
              </svg>
            </button>
            <button
              class="move-down-button"
              @click="moveChoice(index, 'down')"
              :disabled="index === choices.length - 1"
              title="Move down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            <button
              class="remove-choice-button"
              @click="removeChoice(index)"
              title="Remove choice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Permissions section -->
    <div class="permissions-section">
      <h3>Permissions</h3>
      <p class="permissions-note">Set the permissions for this field. Leave blank for public access.</p>
      <div class="property-group">
        <label for="read-permissions">Read Permissions:</label>
        <input
          id="read-permissions"
          type="text"
          v-model="readPermissions"
          placeholder="Enter read permissions (comma-separated)"
        />
      </div>

      <div class="property-group">
        <label for="write-permissions">Write Permissions:</label>
        <input
          id="write-permissions"
          type="text"
          v-model="writePermissions"
          placeholder="Enter write permissions (comma-separated)"
        />
      </div>
    </div>

    <!-- Editor actions -->
    <div class="editor-actions">
      <button class="cancel-button" @click="handleCancel">
        Cancel
      </button>
      <button class="save-button" @click="handleSave">
        Save
      </button>
    </div>
  </div>
</template>

<style scoped>
.field-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--qui-bg-primary);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.field-type-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-type-selector label {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.field-type-selector select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.field-type-selector select:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.field-properties {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-group label {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.property-group input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.property-group input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

/* String and Text area settings */
.string-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-area {
  resize: vertical;
  min-height: 100px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.text-area:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

/* Number settings */
.number-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.number-input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.number-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

/* Boolean settings */
.boolean-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Timestamp settings */
.timestamp-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timestamp-input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  transition: all 0.2s var(--qui-animation-bounce);
}

.timestamp-input:focus {
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

/* Choice type settings */
.choice-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-choice-button {
  background: #9c27b0;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.add-choice-button:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
}

.choice-error {
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
  margin-top: 6px;
}

.choices-list {
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--qui-bg-primary);
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
}

.choice-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.choice-item:last-child {
  border-bottom: none;
}

.choice-index {
  background: rgba(156, 39, 176, 0.1);
  color: #9c27b0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--qui-font-size-small);
  margin-right: 12px;
  flex-shrink: 0;
}

.db-choice-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.choice-item:hover .choice-actions {
  opacity: 1;
}

.move-up-button, .move-down-button, .remove-choice-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--qui-animation-bounce);
}

.move-up-button:hover, .move-down-button:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.remove-choice-button {
  color: var(--qui-danger-color);
}

.remove-choice-button:hover {
  background: rgba(244, 67, 54, 0.1);
  transform: translateY(-1px);
}

.move-up-button:disabled, .move-down-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.no-choices {
  padding: 16px;
  text-align: center;
  color: var(--qui-text-secondary);
  font-style: italic;
}

.permissions-section {
  margin-top: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.permissions-note {
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  font-style: italic;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--qui-hover-border);
}

.cancel-button, .save-button {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.cancel-button {
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary);
}

.save-button {
  background: #9c27b0;
  color: white;
  border: none;
}

.save-button:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
}
</style>