import { Model } from "./model";
import { Drawable } from "./drawable";
import type { Handle } from "./handles";
import { EResizeHandle, MoveHandle, NEResizeHandle, NResizeHandle, NWResizeHandle, SEResizeHandle, SResizeHandle, SWResizeHandle, WResizeHandle } from "./handles";
import { Xyz } from "./xyz";
import L from "leaflet";
import type { IRenderer } from "./canvas";

export class SelectionBox extends Model {
    private _targets: Drawable[] = [];
    private _markers: L.CircleMarker[] = [];

    constructor() {
        super();
        this._targets = [];
        this.isSelectable = false;
        this.isHoverable = false;
    }

    public get targets(): Drawable[] {
        return this._targets;
    }

    public addTarget(target: Drawable): void {
        if (!this._targets.includes(target)) {
            this._targets.push(target);
        }
    }

    public removeTarget(target: Drawable): void {
        const index = this._targets.indexOf(target);
        if (index !== -1) {
            this._targets.splice(index, 1);
        }
    }

    public clearTargets(): void {
        this._targets = [];
    }

    protected getSelectionBounds(): L.LatLngBounds {
        if (this._targets.length === 0) {
            return new L.LatLngBounds([0, 0], [0, 0]);
        }

        // Start with the bounds of the first target
        const bounds = this._targets[0].getBounds();
        
        // Extend with bounds of all other targets
        for (let i = 1; i < this._targets.length; i++) {
            bounds.extend(this._targets[i].getBounds());
        }

        return bounds;
    }

    protected getHandles(): Handle[] {
        const selectedTargets = this._targets.filter(target => target.selected);
        if (selectedTargets.length === 0) return [];

        const bounds = this.getSelectionBounds();
        if (!bounds.isValid()) return [];

        const nw = bounds.getNorthWest();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const se = bounds.getSouthEast();
        const n = L.latLng((nw.lat + ne.lat) / 2, (nw.lng + ne.lng) / 2);
        const e = L.latLng((ne.lat + se.lat) / 2, (ne.lng + se.lng) / 2);
        const s = L.latLng((sw.lat + se.lat) / 2, (sw.lng + se.lng) / 2);
        const w = L.latLng((nw.lat + sw.lat) / 2, (nw.lng + sw.lng) / 2);
        
        const handles: Handle[] = [];

        // Only add resize handles if we have exactly one target
        if (selectedTargets.length === 1) {
            handles.push(
                new NWResizeHandle(new Xyz(nw.lng, nw.lat)),
                new NEResizeHandle(new Xyz(ne.lng, ne.lat)),
                new SWResizeHandle(new Xyz(sw.lng, sw.lat)),
                new SEResizeHandle(new Xyz(se.lng, se.lat)),
                new NResizeHandle(new Xyz(n.lng, n.lat)),
                new EResizeHandle(new Xyz(e.lng, e.lat)),
                new SResizeHandle(new Xyz(s.lng, s.lat)),
                new WResizeHandle(new Xyz(w.lng, w.lat))
            );
        }

        // Always add move handle
        handles.push(
            new MoveHandle(new Xyz(bounds.getCenter().lng, bounds.getCenter().lat))
        );
        
        return handles;
    }

    private clearMarkers(): void {
        this._markers.forEach(marker => marker.remove());
        this._markers = [];
    }

    public override draw(r: IRenderer): void {
        this.clearMarkers();

        // Only draw if we have selected targets
        const selectedTargets = this._targets.filter(target => target.selected);
        if (selectedTargets.length === 0) return;

        // Draw single set of handles for all selected targets
        const handles = this.getHandles();
        for (const handle of handles) {
            const marker = L.circleMarker(
                [handle.position.y, handle.position.x],
                handle.getDrawOpts() as L.CircleMarkerOptions
            );
            
            marker.addTo(r.impl);
            
            marker.on('mouseover', () => {
                document.body.style.cursor = handle.cursor;
            });
            
            marker.on('mouseout', () => {
                document.body.style.cursor = '';
            });

            marker.on('mousedown', (e) => {
                // Apply handle action to all selected targets
                selectedTargets.forEach(target => {
                    handle.apply(target, new Xyz());
                });
            });
            
            this._markers.push(marker);
        }

        super.draw(r);
    }

    public override erase(): void {
        this.clearMarkers();
        super.erase();
    }
}
