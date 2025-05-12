import type { Directive } from 'vue'

/**
 * A directive that detects when content overflows and applies appropriate classes
 * to show or hide scrollbars only when needed.
 *
 * Usage: v-scroll-visibility
 */
export const scrollVisibility: Directive = {
  mounted(el) {
    // Initial check
    updateScrollVisibility(el)
    
    // Set up mutation observer to watch for content changes
    const observer = new MutationObserver(() => {
      updateScrollVisibility(el)
    })
    
    // Set up resize observer to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollVisibility(el)
    })
    
    // Start observing
    observer.observe(el, { 
      childList: true, 
      subtree: true, 
      characterData: true,
      attributes: true 
    })
    resizeObserver.observe(el)
    
    // Store observers for cleanup
    el._scrollVisibilityObserver = observer
    el._scrollVisibilityResizeObserver = resizeObserver
  },
  
  unmounted(el) {
    // Clean up observers
    if (el._scrollVisibilityObserver) {
      el._scrollVisibilityObserver.disconnect()
    }
    if (el._scrollVisibilityResizeObserver) {
      el._scrollVisibilityResizeObserver.disconnect()
    }
  }
}

function updateScrollVisibility(el: HTMLElement) {
  // Check if content overflows vertically
  const hasVerticalOverflow = el.scrollHeight > el.clientHeight
  
  // Check if content overflows horizontally
  const hasHorizontalOverflow = el.scrollWidth > el.clientWidth
  
  // Update classes based on overflow state
  if (!hasVerticalOverflow && !hasHorizontalOverflow) {
    el.classList.add('no-overflow')
  } else {
    el.classList.remove('no-overflow')
  }
}

export default scrollVisibility
