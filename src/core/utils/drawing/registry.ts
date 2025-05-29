import type { Drawable } from "./drawable";
import { Xyz } from "./xyz";
import type { Pane } from "./drawable";
import { Circle } from "./circle";

export interface ModelConfig {
    type: string;
    offset?: {
        x: number;
        y: number;
        z: number;
    };
    scale?: {
        x: number;
        y: number;
        z: number;
    };
    pivot?: {
        x: number;
        y: number;
        z: number;
    };
    rotation?: number;
    pane?: Pane;
    minZoom?: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    // Circle specific
    radius?: number;
    // Polygon/Polyline specific
    edges?: Array<{ x: number; y: number; z: number }>;
    // Text specific
    text?: string;
    direction?: string;
    // Image specific
    url?: string;
    width?: number;
    height?: number;
    // Div specific
    html?: string;
    styleSheet?: string;
    scaleWithZoom?: boolean;
    submodels?: Array<ModelConfig>;
}

export type ModelGenerator = (config: ModelConfig) => Drawable;

export class ModelRegistry {
    private _models: Map<string, ModelGenerator>;

    constructor() {
        this._models = new Map<string, ModelGenerator>();
        this.register("circle", (config: ModelConfig) => {
            return this.tryApplyConfig(new Circle(), config);
        });
    }

    private tryApplyConfig<T extends Drawable>(instance: T, config: ModelConfig): T {
        if (config.offset) {
            instance.offset = new Xyz(config.offset.x, config.offset.y, config.offset.z);
        }

        if (config.scale) {
            instance.scale = new Xyz(config.scale.x, config.scale.y, config.scale.z);
        }

        if (config.pivot) {
            instance.pivot = new Xyz(config.pivot.x, config.pivot.y, config.pivot.z);
        }

        if (config.rotation) {
            instance.rotation = config.rotation;
        }

        if (config.pane) {
            instance.pane = config.pane;
        }

        if (config.minZoom) {
            instance.minZoom = config.minZoom;
        }

        if (config.color) {
            const instanceWithColor = instance as unknown as { color: string };
            if (instanceWithColor.color) {
                instanceWithColor.color = config.color;
            }
        }

        if (config.fillColor) {
            const instanceWithFillColor = instance as unknown as { fillColor: string };
            if (instanceWithFillColor.fillColor) {
                instanceWithFillColor.fillColor = config.fillColor;
            }
        }

        if (config.fillOpacity) {
            const instanceWithFillOpacity = instance as unknown as { fillOpacity: number };
            if (instanceWithFillOpacity.fillOpacity) {
                instanceWithFillOpacity.fillOpacity = config.fillOpacity;
            }
        }

        if (config.weight) {
            const instanceWithWeight = instance as unknown as { weight: number };
            if (instanceWithWeight.weight) {
                instanceWithWeight.weight = config.weight;
            }
        }

        if (config.radius) {
            const instanceWithRadius = instance as unknown as { radius: number };
            if (instanceWithRadius.radius) {
                instanceWithRadius.radius = config.radius;
            }
        }

        if (config.edges) {
            const instanceWithEdges = instance as unknown as { edges: Array<Xyz> };
            if (instanceWithEdges.edges) {
                instanceWithEdges.edges = config.edges.map(edge => new Xyz(edge.x, edge.y, edge.z));
            }
        }

        if (config.text) {
            const instanceWithText = instance as unknown as { text: string };
            if (instanceWithText.text) {
                instanceWithText.text = config.text;
            }
        }

        if (config.direction) {
            const instanceWithDirection = instance as unknown as { direction: string };
            if (instanceWithDirection.direction) {
                instanceWithDirection.direction = config.direction;
            }
        }

        if (config.url) {
            const instanceWithUrl = instance as unknown as { url: string };
            if (instanceWithUrl.url) {
                instanceWithUrl.url = config.url;
            }
        }

        if (config.width) {
            const instanceWithWidth = instance as unknown as { width: number };
            if (instanceWithWidth.width) {
                instanceWithWidth.width = config.width;
            }
        }

        if (config.height) {
            const instanceWithHeight = instance as unknown as { height: number };
            if (instanceWithHeight.height) {
                instanceWithHeight.height = config.height;
            }
        }

        if (config.html) {
            const instanceWithHtml = instance as unknown as { html: string };
            if (instanceWithHtml.html) {
                instanceWithHtml.html = config.html;
            }
        }

        if (config.styleSheet) {
            const instanceWithStyleSheet = instance as unknown as { styleSheet: string };
            if (instanceWithStyleSheet.styleSheet) {
                instanceWithStyleSheet.styleSheet = config.styleSheet;
            }
        }

        if (config.scaleWithZoom) {
            const instanceWithScaleWithZoom = instance as unknown as { scaleWithZoom: boolean };
            if (instanceWithScaleWithZoom.scaleWithZoom) {
                instanceWithScaleWithZoom.scaleWithZoom = config.scaleWithZoom;
            }
        }

        if (config.submodels) {
            const instanceWithSubmodels = instance as unknown as { submodels: Array<Drawable> };
            if (instanceWithSubmodels.submodels) {
                instanceWithSubmodels.submodels = config.submodels.reduce((acc, submodelConfig) => {
                    const submodel = this.get(submodelConfig.type);
                    if (!submodel) {
                        console.warn(`Model type "${submodelConfig.type}" is not registered.`);
                    } else {
                        acc.push(submodel(submodelConfig));
                    }
                    return acc;
                }, [] as Array<Drawable>);
            }
        }

        return instance;
    }

    public get(type: string): ModelGenerator | undefined {
        return this._models.get(type);
    }

    public register(type: string, generator: ModelGenerator): void {
        if (this._models.has(type)) {
            console.warn(`Model with name "${type}" is already registered. Overwriting.`);
        }

        this._models.set(type, generator);
    }

    public unregister(type: string): void {
        this._models.delete(type);
    }
}