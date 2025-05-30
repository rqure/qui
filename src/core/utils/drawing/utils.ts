
export function cvar(name: string): string {
    if ( name.startsWith("--") ) {
        return getComputedStyle(document.documentElement).getPropertyValue(name);
    }

    return name;
}