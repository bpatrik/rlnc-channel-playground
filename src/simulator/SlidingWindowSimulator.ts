import {Channel} from "./Channel";
import {TCPSimulator} from "./TCPSimulator";
import {RLNCSimulator} from "./RLNCSimulator";

export class SlidingWindowSimulator extends RLNCSimulator {


    constructor(settings: SlidingWindowSimulatorModule.Settings, channel: Channel) {
        super(settings, channel);
    }


    public  simulate(): TCPSimulator.TimeSlot[] {
        let stream: TCPSimulator.TimeSlot[] = [];


        let calcReceivedCount = (generationId: number) => {
            return stream.filter(p => p instanceof RLNCSimulator.Packet && p.isPacket() && p.generationId == generationId).length;
        };

        let closeWindow = (genId: number, startIndex: number) => {
            for (let i = startIndex; i < stream.length; i++) {
                if (stream[i] instanceof SlidingWindowSimulatorModule.Packet &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).generationId == genId &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).isPacket() == true) {
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).closeWindow();
                }
            }
        };


        let deCloseWindow = (genId: number, startIndex: number) => {
            for (let i = startIndex; i < stream.length; i++) {
                if (stream[i] instanceof SlidingWindowSimulatorModule.Packet &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).generationId == genId &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).isPacket() == true) {
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).deCloseWindow();
                }
            }
        };


        let shiftWindow = (genId: number, startIndex: number) => {
            for (let i = startIndex; i < stream.length; i++) {
                if (stream[i] instanceof SlidingWindowSimulatorModule.Packet &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).generationId == genId &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).isPacket() == true) {
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).shiftWindow();
                }
            }
        };

        let addPacket = (index: number, packet: SlidingWindowSimulatorModule.Packet) => {
            while (stream.length < index) {
                stream.push(new TCPSimulator.Space());
            }
            const oldId = packet.id;
            let oldest = packet;
            for (let i = index; i >= 0; i--) {
                if (stream[i] instanceof SlidingWindowSimulatorModule.Packet &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).generationId == packet.generationId &&
                    (<SlidingWindowSimulatorModule.Packet>stream[i]).isPacket() == true) {
                    oldest = <SlidingWindowSimulatorModule.Packet>stream[i];
                    break;
                }
            }
            let start = stream.slice(0, index - (this.settings.latency + 1)).filter(p => p instanceof SlidingWindowSimulatorModule.Packet &&
            (<SlidingWindowSimulatorModule.Packet>p).generationId == packet.generationId &&
            (<SlidingWindowSimulatorModule.Packet>p).isPacket() == true).length;

            stream.splice(index, 0,
                new SlidingWindowSimulatorModule.Packet(oldest.generationId,
                    oldId,
                    this.combinedPackets(oldest.generationId),
                    TCPSimulator.PacketTypes.Retransmit,
                    start,
                    oldest.windowEnd));
            shiftWindow(packet.generationId, index + 1);
        };


        for (let generation = 0; generation < this.generations; generation++) {

            for (let j = 0; j < this.maxRank(generation); j++) {

                stream.push(new SlidingWindowSimulatorModule.Packet(generation,
                    stream.length,
                    this.combinedPackets(generation),
                    TCPSimulator.PacketTypes.Original,
                    0,
                    j + 1));
            }

            if (this.settings.fec == true) {
                let fecCount = this.maxRank(generation) * (this.channel.Loss + this.channel.Loss * this.channel.Loss + this.channel.Loss * this.channel.Loss * this.channel.Loss); //rough estimation
                for (let j = 0; j < Math.ceil(fecCount) && j < this.settings.latency; j++) {

                    stream.push(new SlidingWindowSimulatorModule.Packet(generation,
                        stream.length,
                        this.combinedPackets(generation),
                        TCPSimulator.PacketTypes.FEC,
                        0,
                        this.maxRank(generation)));
                }
            }
        }

        for (let i = 0; i < stream.length; i++) {
            if (stream[i] instanceof SlidingWindowSimulatorModule.Packet) {
                let packet: SlidingWindowSimulatorModule.Packet = <SlidingWindowSimulatorModule.Packet>stream[i];
                if (this.channel.isLost(i) == 1) {
                    stream[i] = new SlidingWindowSimulatorModule.Loss(packet);
                    deCloseWindow(packet.generationId, i);
                    if (calcReceivedCount(packet.generationId) < this.maxRank(packet.generationId)) {
                        addPacket(i + this.settings.latency + 1, packet);
                    }
                } else {
                    closeWindow(packet.generationId, i + this.settings.latency + 1);
                }
            }
        }
        return stream;
    }
}

export module SlidingWindowSimulatorModule {
    export interface Settings extends TCPSimulator.Settings {
        generation_size: number;
        fec: boolean;
    }


    export class Packet extends RLNCSimulator.Packet {


        constructor(generationId: number,
                    id: number,
                    combinedPackets: number[],
                    type: TCPSimulator.PacketTypes,
                    public windowStart: number,
                    public  windowEnd: number) {
            super(generationId, id, combinedPackets, type);
        }

        closeWindow() {
            if (this.windowStart < this.windowEnd) {
                this.windowStart++;
            }
        }

        deCloseWindow() {
            if (this.windowStart > 0) {
                this.windowStart--;
            }
        }

        shiftWindow() {

            this.windowStart++;
            this.windowEnd++;
        }

        get Packets(): number[] {
            return this.combinedPackets;
        }

        get CombinedPackets(): number[] {
            return this.combinedPackets.slice(this.windowStart, this.windowEnd)
        }

        getSimplified() {
            return {
                genId: this.generationId,
                id: this.id,
                packets: this.CombinedPackets,
                start: this.windowStart,
                end: this.windowEnd
            };
        }


    }

    export class Loss extends Packet {

        constructor(packet: Packet) {
            super(packet.generationId, packet.id, packet.combinedPackets.slice(), packet.type, packet.windowStart, packet.windowEnd);
        }

        isPacket() {
            return false;
        }

        getSimplified() {
            let tmp = super.getSimplified();
            tmp['Loss'] = true;
            return tmp;

        }
    }
}
