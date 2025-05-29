
export class Xyz {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public plus(other: Xyz): Xyz {
        return new Xyz(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    public minus(other: Xyz): Xyz {
        return new Xyz(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    public multiply(other: Xyz): Xyz {
        return new Xyz(this.x * other.x, this.y * other.y, this.z * other.z);
    }

    public multiplyScalar(scalar: number): Xyz {
        return new Xyz(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    public divide(other: Xyz): Xyz {
        return new Xyz(this.x / other.x, this.y / other.y, this.z / other.z);
    }

    public divideScalar(scalar: number): Xyz {
        return new Xyz(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    public equals(other: Xyz): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    public midpoint(other: Xyz): Xyz {
        return new Xyz((this.x + other.x) / 2, (this.y + other.y) / 2, (this.z + other.z) / 2);
    }

    public rotate(angle: number): Xyz {
        const radians = angle * Math.PI / 180;
        return new Xyz(
            this.x * Math.cos(radians) - this.y * Math.sin(radians),
            this.x * Math.sin(radians) + this.y * Math.cos(radians),
            this.z
        );
    }
}