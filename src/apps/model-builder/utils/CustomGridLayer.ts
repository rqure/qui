import L from 'leaflet';

export class CustomGridLayer extends L.GridLayer {
    protected createTile(coords: L.Coords): HTMLElement {
        const tile = document.createElement('div');
        tile.style.width = '100px';
        tile.style.height = '100px';
        tile.style.border = `1px solid var(--qui-overlay-hover)`;
        return tile;
    }
}

export function createGridLayer() {
    return new CustomGridLayer({
        tileSize: 100,
        opacity: 0.3
    });
}
