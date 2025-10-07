import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';

/**
 * Fetch entity name from the data store
 */
export async function fetchEntityName(entityId: EntityId): Promise<string> {
  try {
    const dataStore = useDataStore();
    
    // Get the Name field type
    const nameFieldType = await dataStore.getFieldType('Name');
    
    // Read the Name field
    const [value] = await dataStore.read(entityId, [nameFieldType]);
    
    let name = 'Unknown';
    if (ValueHelpers.isString(value)) {
      name = value.String;
    }
    
    return name;
  } catch (error) {
    console.warn(`Failed to fetch name for entity ${entityId}:`, error);
    return 'Unknown';
  }
}

/**
 * Format entity ID with name in parentheses
 * Example: "30064771073 (QOS)"
 */
export async function formatEntityIdWithName(entityId: EntityId): Promise<string> {
  const name = await fetchEntityName(entityId);
  return `${entityId} (${name})`;
}

/**
 * Rust timestamp array type
 * Format: [year, day_of_year, hour, minute, second, nanoseconds]
 */
type RustTimestampArray = [number, number, number, number, number, number];

/**
 * Convert timestamp (array or number) to Date
 * The Rust backend sends timestamps as arrays in UTC time
 */
function timestampToDate(timestamp: RustTimestampArray | number | string | null | undefined): Date | null {
  if (!timestamp) return null;
  
  // If it's a number (milliseconds since epoch), use it directly
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // If it's an array (Rust timestamp format in UTC)
  if (Array.isArray(timestamp) && timestamp.length >= 5) {
    try {
      const year = timestamp[0];
      const dayOfYear = timestamp[1];
      const hour = timestamp[2];
      const minute = timestamp[3];
      const second = timestamp[4];
      const nanoseconds = timestamp[5] || 0;
      const milliseconds = Math.floor(nanoseconds / 1000000);
      
      // Convert day of year to month and day using UTC methods
      const date = new Date(Date.UTC(year, 0, 1)); // January 1st of the year in UTC
      date.setUTCDate(dayOfYear); // Set to the day of year in UTC
      date.setUTCHours(hour, minute, second, milliseconds);
      
      return date;
    } catch (e) {
      console.error('Error converting timestamp array to date:', e, timestamp);
      return null;
    }
  }
  
  // Try to parse as a date string
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Formats a timestamp into a readable string
 */
export function formatTimestamp(date: Date | string | number | RustTimestampArray | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : timestampToDate(date);
  
  // Check if date is valid
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const oneMinute = 60 * 1000;
  const oneSecond = 1000;
  
  // If less than a minute ago, show seconds
  if (diff < oneMinute) {
    const seconds = Math.floor(diff / oneSecond);
    return seconds <= 0 ? 'Just now' : `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }
  
  // If less than an hour ago
  if (diff < oneHour) {
    const minutes = Math.floor(diff / oneMinute);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // If less than a day ago
  if (diff < oneDay) {
    const hours = Math.floor(diff / oneHour);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // If less than a week ago
  if (diff < 7 * oneDay) {
    const days = Math.floor(diff / oneDay);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // Format as date string
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats an entity ID for display, typically showing only first few and last few chars
 */
export function formatEntityId(id: string, showChars: number = 4): string {
  if (!id || id.length <= showChars * 2 + 3) return id;
  
  return `${id.substring(0, showChars)}...${id.substring(id.length - showChars)}`;
}
