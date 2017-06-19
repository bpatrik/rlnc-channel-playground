import {RLNCSimulator} from "./simulator/RLNCSimulator";
import {Channel} from "./simulator/Channel";
import {TCPSimulator} from "./simulator/TCPSimulator";
import {SlidingWindowSimulatorModule, SlidingWindowSimulator} from "./simulator/SlidingWindowSimulator";


const settings: SlidingWindowSimulatorModule.Settings = {
    latency: 2,
    generation_size: 10,
    packetCount: 10,
    fec:true
};

const channel = new Channel(0.1);
const tcp = new TCPSimulator(settings, channel);
const rlnc = new RLNCSimulator(settings, channel);
const sw = new SlidingWindowSimulator(settings, channel);


//console.log(tcp.simulate());
//console.log(rlnc.simulate());
console.log(sw.simulate().map(p => JSON.stringify(p['getSimplified'] ? p['getSimplified']() : p)));
console.log(channel.losses);



