import {Channel} from "./src/simulator/Channel";
import {SlidingWindowSimulator} from "./src/simulator/SlidingWindowSimulator";
import {TCPSimulator} from "./src/simulator/TCPSimulator";
import {RLNCSimulator} from "./src/simulator/RLNCSimulator";


const settings = {
    tcp: {
        latency: 2,
        packetCount: 10
    },
    rlnc: {
        latency: 2,
        packetCount: 10,
        generation_size: 5,
        fec: true
    },
    sw: {
        latency: 2,
        packetCount: 10,
        generation_size: 10,
        fec: true
    }
};

const channel = new Channel(0.2);
const tcp = new TCPSimulator(settings.tcp, channel);
const rlnc = new RLNCSimulator(settings.rlnc, channel);
const sw = new SlidingWindowSimulator(settings.sw, channel);

const showDetails = {
    rlnc: false,
    sw: false
};

$("#settings-loss-random").click(() => {
    channel.randomize();
    render();
});

$("#settings-rlnc-details").click(() => {
    showDetails.rlnc = !showDetails.rlnc;
    render();
});
$("#settings-sw-details").click(() => {
    showDetails.sw = !showDetails.sw;
    render();
});


let updateSettings = () => {
    settings.rlnc.packetCount = settings.sw.packetCount = settings.tcp.packetCount = parseFloat($("#settings-packet-count").val().toString());
    settings.sw.latency = settings.rlnc.latency = settings.tcp.latency = parseFloat($("#settings-latency").val().toString());
    settings.rlnc.generation_size = parseInt($("#settings-rlnc-gen-size").val().toString());
    settings.sw.generation_size = parseInt($("#settings-sw-gen-size").val().toString());
    if (settings.rlnc.generation_size <= 0) {
        settings.rlnc.generation_size = 1;
    }
    if (settings.sw.generation_size <= 0) {
        settings.sw.generation_size = 1;
    }
    settings.rlnc.fec = $("#settings-rlnc-fec").is(':checked');
    settings.sw.fec = $("#settings-sw-fec").is(':checked');
    channel.Loss = parseFloat($("#settings-loss").val().toString());

    rlnc.update(settings.rlnc);
    sw.update(settings.sw);
    render();
};

$("#settings-loss").click(updateSettings).change(updateSettings);
$("#settings-latency").click(updateSettings).change(updateSettings);
$("#settings-packet-count").click(updateSettings).change(updateSettings);
$("#settings-rlnc-gen-size").click(updateSettings).change(updateSettings);
$("#settings-sw-gen-size").click(updateSettings).change(updateSettings);
$("#settings-rlnc-fec").click(updateSettings).change(updateSettings);
$("#settings-sw-fec").click(updateSettings).change(updateSettings);


let renderLosses = () => {
    let $losses = $("#losses .packets");
    let length = Math.max(tcp.simulate().length, rlnc.simulate().length, sw.simulate().length)
    $losses.empty();


    for (let i = 0; i < length; i++) {
        let $tile = $("<div/>", {'class': 'tile loss-tile'}).html("" + i).data("index", i);
        if (channel.isLost(i) == 1) {
            $tile.addClass("lost");
        }
        $losses.append($tile);
    }
};

let renderTCP = () => {
    let $tcp = $("#tcp .packets");
    let stream = tcp.simulate();
    $tcp.empty();

    for (let i = 0; i < stream.length; i++) {
        let $tile = $("<div/>", {'class': 'tile tcp-tile'}).data("index", i);

        if (stream[i] instanceof TCPSimulator.Space) {
            $tile.addClass("space");
        } else {
            $tile.html("" + (<TCPSimulator.Packet>stream[i]).id);
            $tile.addClass(stream[i].isPacket() ? "received" : "lost");

            if ((<TCPSimulator.Packet>stream[i]).type == TCPSimulator.PacketTypes.FEC) {
                $tile.append($("<span>", {"class": "tile-tag", "title": "FEC packet"}).html("FEC"));
            }

            if ((<TCPSimulator.Packet>stream[i]).type == TCPSimulator.PacketTypes.Retransmit) {
                $tile.append($("<span>", {
                    "class": "tile-tag glyphicon glyphicon-repeat",
                    "title": "Error correction"
                }));
            }
        }

        $tcp.append($tile);
    }
};


let renderNC = (simulator: any, $div: JQuery, showDetails: boolean) => {
    let stream = simulator.simulate();
    $div.empty();

    let renderMatrixRow = (packets: number[], combinedPackets: number[]) => {
        let $row = $("<div/>", {"class": "matrix-row"});
        for (let i = 0; i < packets.length; i++) {
            let $cell = $("<div/>", {"class": "tile matrix-cell"});
            if (combinedPackets.indexOf(packets[i]) != -1) {
                $cell.html("" + packets[i]);
            }
            $row.append($cell);
        }
        return $row;
    };

    for (let i = 0; i < stream.length; i++) {
        let $tile = $("<div/>", {'class': 'tile rlnc-tile'}).data("index", i);
        if (stream[i] instanceof TCPSimulator.Space) {
            $tile.addClass("space");
        } else {
            $tile.html("G<sub>" + (<RLNCSimulator.Packet>stream[i]).generationId + "</sub>");
            if ((<RLNCSimulator.Packet>stream[i]).generationId % 2 == 1) {
                $tile.addClass("odd");
            }
            $tile.addClass(stream[i].isPacket() ? "received" : "lost");

            if ((<RLNCSimulator.Packet>stream[i]).type == TCPSimulator.PacketTypes.FEC) {
                $tile.append($("<span>", {"class": "tile-tag", "title": "FEC packet"}).html("FEC"));
            }

            if ((<RLNCSimulator.Packet>stream[i]).type == TCPSimulator.PacketTypes.Retransmit) {
                $tile.append($("<span>", {
                    "class": "tile-tag glyphicon glyphicon-repeat",
                    "title": "Error correction"
                }));
            }
        }
        if (showDetails == true) {

            let $row = $("<div/>");
            $row.append($("<div/>", {'class': 'tile no-border'}).html("#" + i));
            $row.append($tile);
            if (stream[i] instanceof RLNCSimulator.Packet) {
                $row.append(renderMatrixRow((<RLNCSimulator.Packet>stream[i]).Packets, (<RLNCSimulator.Packet>stream[i]).CombinedPackets));
            }
            $div.append($row);
        } else {
            $div.append($tile);
        }

    }

};

let render = () => {
    renderLosses();
    renderTCP();

    renderNC(rlnc, $("#rlnc .packets"), showDetails.rlnc);
    renderNC(sw, $("#sliding-window .packets"), showDetails.sw);


    $(".tile").click(function () {
        let index = $(this).data("index");
        channel.losses[index] = channel.losses[index] == 1 ? 0 : 1;
        render();
    });
};


render();