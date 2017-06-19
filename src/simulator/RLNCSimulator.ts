import {Channel} from "./Channel";
import {TCPSimulator} from "./TCPSimulator";
import * as _ from "lodash";

export class RLNCSimulator {

    generations: number;

    constructor(protected settings: RLNCSimulator.Settings, protected  channel: Channel) {
        this.update(settings);
    }

    update(settings: RLNCSimulator.Settings) {
        this.settings = settings;
        this.generations = Math.ceil(settings.packetCount / settings.generation_size);
    }

    public  maxRank(genId: number) {
        if (genId == this.generations - 1) {
            return this.settings.packetCount - (this.settings.generation_size * genId);
        }
        return this.settings.generation_size;
    }

    public combinedPackets(genId: number): number[] {
        return _.range(genId * this.settings.generation_size, genId * this.settings.generation_size + this.maxRank(genId));
    }

    public  simulate(): TCPSimulator.TimeSlot[] {
        let stream: TCPSimulator.TimeSlot[] = [];


        for (let generation = 0; generation < this.generations; generation++) {
            for (let j = 0; j < this.maxRank(generation); j++) {
                stream.push(new RLNCSimulator.Packet(generation, stream.length, this.combinedPackets(generation), TCPSimulator.PacketTypes.Original));
            }
            if (this.settings.fec == true) {
                let fecCount = this.maxRank(generation) *
                    (this.channel.Loss +
                    this.channel.Loss * this.channel.Loss +
                    this.channel.Loss * this.channel.Loss * this.channel.Loss); //rough estimation

                for (let j = 0; j < Math.ceil(fecCount) && j < this.settings.latency; j++) {
                    stream.push(new RLNCSimulator.Packet(generation, stream.length, this.combinedPackets(generation), TCPSimulator.PacketTypes.FEC));
                }
            }
        }

        let extend = (index: number) => {
            while (stream.length < index) {
                stream.push(new TCPSimulator.Space());
            }
        };

        let calcReceivedCount = (generationId: number) => {
            return stream.filter(p => p instanceof RLNCSimulator.Packet && p.isPacket() && p.generationId == generationId).length;
        };

        for (let i = 0; i < stream.length; i++) {
            if (stream[i] instanceof RLNCSimulator.Packet) {
                let packet = <RLNCSimulator.Packet>stream[i];
                if (this.channel.isLost(i) == 1) {
                    stream[i] = new RLNCSimulator.Loss(packet);
                    if (calcReceivedCount(packet.generationId) < this.maxRank(packet.generationId)) {
                        extend(i + this.settings.latency + 1);
                        packet.type = TCPSimulator.PacketTypes.Retransmit;
                        stream.splice(i + this.settings.latency + 1, 0, packet);
                    }
                }
            }
        }
        return stream;
    }
}

export module RLNCSimulator {
    export interface Settings extends TCPSimulator.Settings {
        generation_size: number;
        fec: boolean;
    }


    export class Packet extends TCPSimulator.Packet {
        constructor(public generationId: number, public  id: number, public combinedPackets: number[], type: TCPSimulator.PacketTypes) {
            super(id,type);
        }

        get Packets(): number[] {
            return this.combinedPackets;
        }

        get CombinedPackets(): number[] {
            return this.combinedPackets;
        }

        isPacket() {
            return true;
        }

    }

    export class Loss extends Packet {
        constructor(packet: Packet) {
            super(packet.generationId, packet.id, packet.combinedPackets.slice(), packet.type);
        }

        isPacket() {
            return false;
        }
    }
}
