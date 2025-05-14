/**
 * Formats a timestamp into a readable string
 */
export function formatTimestamp(date: Date | string | number): string {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const oneMinute = 60 * 1000;
  
  // If less than a minute ago
  if (diff < oneMinute) {
    return 'Just now';
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
