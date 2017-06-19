import {Channel} from "./Channel";
export class TCPSimulator {

    constructor(private settings: TCPSimulator.Settings, private  channel: Channel) {
    }


    public  simulate(): TCPSimulator.TimeSlot[] {
        let stream: TCPSimulator.TimeSlot[] = [];

        for (let i = 0; i < this.settings.packetCount; i++) {
            stream.push(new TCPSimulator.Packet(i, TCPSimulator.PacketTypes.Original));
        }
        let extend = (index: number) => {
            while (stream.length < index) {
                stream.push(new TCPSimulator.Space());
            }
        };

        for (let i = 0; i < stream.length; i++) {
            if (stream[i] instanceof TCPSimulator.Packet) {
                let packet = <TCPSimulator.Packet>stream[i];
                if (this.channel.isLost(i) == 1) {
                    stream[i] = new TCPSimulator.Loss(packet);
                    extend(i + this.settings.latency + 1);
                    packet.type = TCPSimulator.PacketTypes.Retransmit;
                    stream.splice(i + this.settings.latency + 1, 0, packet);
                }
            }
        }
        return stream;
    }
}

export module TCPSimulator {
    export interface Settings {
        latency: number;
        packetCount: number;
    }
    export enum PacketTypes{
        Original,
        FEC,
        Retransmit
    }


    export interface TimeSlot {
        isPacket(): boolean;
    }

    export class Space implements TimeSlot {
        isPacket() {
            return false;
        }
    }
    export class Packet implements TimeSlot {
        constructor(public id: number, public type: TCPSimulator.PacketTypes) {
        }

        isPacket() {
            return true;
        }
    }

    export class Loss extends Packet {
        constructor(packet: Packet) {
            super(packet.id, packet.type);
        }

        isPacket() {
            return false;
        }
    }
}
