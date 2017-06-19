import * as seedrandom from "seedrandom";
import * as _ from "lodash";


export class Channel {
    losses: number[] = [];
    rand: any = null;

    constructor(protected loss: number) {
        this.rand = seedrandom('seed');
        this.losses = _.times(1000, () => 0);
        this.losses[5] = 1;
    }

    isLost(index: number) {
        if (typeof this.losses[index] == "undefined") {
            this.losses[index] = this.rand() <= this.loss ? 1 : 0;
        }
        return this.losses[index];
    };

    get Loss(): number {
        return this.loss;
    }

    set Loss(value: number) {
        if (value > 0.99) {
            this.loss = 0.99;
        }
        if (value < 0) {
            this.loss = 0;
        }

        this.loss = value;
    }

    randomize() {
        this.losses = [];
    }
}