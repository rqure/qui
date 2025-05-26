/**
 * FormulaParser service
 * 
 * This service parses and evaluates formulas that can reference entity fields.
 * Supported operations include basic arithmetic, common functions, and field references.
 */

// Field reference pattern: {FieldName}
const FIELD_REFERENCE_REGEX = /\{([^}]+)\}/g;

/**
 * Extract field references from a formula
 */
export function extractFieldReferences(formula: string): string[] {
  const fields: string[] = [];
  let match;
  
  while ((match = FIELD_REFERENCE_REGEX.exec(formula)) !== null) {
    fields.push(match[1]);
  }
  
  return [...new Set(fields)]; // Return unique field names
}

/**
 * Replace field references with actual values
 */
export function replaceFieldReferences(formula: string, fieldValues: Record<string, number>): string {
  return formula.replace(FIELD_REFERENCE_REGEX, (match, fieldName) => {
    const value = fieldValues[fieldName];
    
    if (value === undefined || value === null) {
      console.warn(`Field "${fieldName}" not found or has no value`);
      return '0';
    }
    
    return value.toString();
  });
}

/**
 * Validate a formula for syntax errors
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    // Replace field references with dummy values for validation
    const dummyFormula = formula.replace(FIELD_REFERENCE_REGEX, '1');
    
    // Try to evaluate the formula with dummy values
    // eslint-disable-next-line no-new-func
    new Function(`return ${dummyFormula}`)();
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Syntax error in formula: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Evaluate a formula with field values
 */
export function evaluateFormula(formula: string, fieldValues: Record<string, number>): number {
  try {
    // First handle common functions not available in JavaScript
    let processedFormula = formula
      // Replace field references with actual values
      .replace(FIELD_REFERENCE_REGEX, (match, fieldName) => {
        const value = fieldValues[fieldName];
        return value !== undefined ? value.toString() : '0';
      })
      // Add support for common math functions
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
      .replace(/\bsin\s*\(/g, 'Math.sin(')
      .replace(/\bcos\s*\(/g, 'Math.cos(')
      .replace(/\btan\s*\(/g, 'Math.tan(')
      .replace(/\bmin\s*\(/g, 'Math.min(')
      .replace(/\bmax\s*\(/g, 'Math.max(')
      .replace(/\bfloor\s*\(/g, 'Math.floor(')
      .replace(/\bceil\s*\(/g, 'Math.ceil(')
      .replace(/\bround\s*\(/g, 'Math.round(')
      .replace(/\bpow\s*\(/g, 'Math.pow(')
      .replace(/\blog\s*\(/g, 'Math.log(')
      .replace(/\blog10\s*\(/g, 'Math.log10(')
      .replace(/\bexp\s*\(/g, 'Math.exp(')
      .replace(/\bpi\b/g, 'Math.PI');

    // Custom avg function for average
    if (processedFormula.includes('avg(')) {
      processedFormula = processedFormula.replace(
        /\bavg\s*\(([^)]+)\)/g,
        (match, args) => {
          const argArray = args.split(',').map((arg: string) => arg.trim());
          return `(${argArray.join('+')})/parseFloat(${argArray.length})`;
        }
      );
    }
    
    // Evaluate the formula using Function constructor
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${processedFormula}`)();
    
    // Ensure we return a number
    return typeof result === 'number' ? result : parseFloat(result);
  } catch (error) {
    console.error('Error evaluating formula:', error);
    return 0; // Default value on error
  }
}
```
