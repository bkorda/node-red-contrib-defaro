module.exports = function(RED) {
    class DefaroItemIn {
        constructor(config) {
            RED.nodes.createNode(this, config);

            var node = this;
            node.config = config;

            // //get server node
            node.server = RED.nodes.getNode(node.config.server);
            if (node.server) {
                setTimeout(node.sendLastState, 15000, node);
                node.sendLastState(node); //tested for duplicate send with onSocketOpen
            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "node-red-contrib-defaro/in:status.server_node_error"
                });
            }
        }

        sendLastState(node) {
            // var node = this;
            var uniqueid = node.config.device;
            if (typeof (uniqueid) == 'string' && uniqueid.length) {
                var deviceMeta = node.server.getDevice(uniqueid);
                if (deviceMeta !== undefined) {
                    node.server.devices[node.id] = uniqueid;
                    node.meta = deviceMeta;
                    if (node.config.outputAtStartup) {
                        setTimeout(function () {
                            node.sendMetrics(deviceMeta, true);
                        }, 1500); //we need this timeout after restart of node-red  (homekit delays)
                    } else {
                        setTimeout(function () {
                            node.status({}); //clean
                            node.updateState(deviceMeta);
                            // node.sendStateHomekitOnly(deviceMeta); //always send for homekit
                        }, 1500); //update status with the same delay
                    }
                } else {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "node-red-contrib-defaro/in:status.disconnected"
                    });
                }
            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "node-red-contrib-defaro/in:status.device_not_set"
                });
            }
        }

        updateState(device) {
            var node = this;

            // var device;
            // if ("message" in message) {
            //     device = node.server.getDevice(message.source)
            // } else if ("metrics" in message) {
            //     device = message;
            // }

            if (device === undefined || !device.alive) {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "node-red-contrib-defaro/in:status.not_reachable"
                });
            } else {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "node-red-contrib-defaro/in:status.connected"
                });
            }

            if (device !== undefined && device.params !== undefined) {
                if (node.oldState === undefined && device.params[node.config.state]) { node.oldState = device.params[node.config.state]; }
                // if (node.prevUpdateTime === undefined && device.updateTime) { node.prevUpdateTime = device.updateTime; }
            } else {
                // if (node.oldLevel === undefined && device.message.l) { node.oldLevel = device.message.l; }
                //if (node.prevUpdateTime === undefined && device.updateTime) { node.prevUpdateTime = device.updateTime; }
            }

            return device;
        }

        sendMetrics(device, force=false) {
            var node = this;
            var device = node.updateState(device);
            if (device === undefined) {
                return;
            }
            //filter output
            if (!force && 'onchange' === node.config.output && device.params[node.config.state] !== undefined && device.params[node.config.state] === node.oldState) return;
            // if (!force && 'onupdate' === node.config.output && device.updateTime === node.prevUpdateTime) return;

            //outputs
            node.send([
                {
                    payload: (node.config.state in device.params) ? device.params[node.config.state] : device.params,
                    payload_raw: device.params,
                    meta: device
                },
                // node.formatHomeKit(device)
            ]);

            node.oldState = device.params[node.config.state];
            // node.prevUpdateTime = device.state['lastupdated'];
        };

        onSocketPongTimeout() {
            var node = this;
            node.onSocketError();
        }

        onSocketError() {
            var node = this;
            node.status({
                fill: "yellow",
                shape: "dot",
                text: "node-red-contrib-defaro/in:status.reconnecting"
            });

            //send NO_RESPONSE
            var deviceMeta = node.server.getDevice(node.config.device);
            if (deviceMeta) {
                node.send([
                    null,
                    node.formatHomeKit(deviceMeta, {reachable:false})
                ]);
            }
        }

        onClose() {
            var node = this;
            node.onSocketClose();
        }

        onSocketClose() {
            var node = this;
            node.status({
                fill: "red",
                shape: "dot",
                text: "node-red-contrib-defaro/in:status.disconnected"
            });
        }

        onSocketOpen() {
            var node = this;
            node.sendLastState();
        }

        onNewDevice(uniqueid) {
            var node = this;
            if (node.config.device === uniqueid) {
                node.sendLastState();
            }
        }
    }
    RED.nodes.registerType('defaro-input', DefaroItemIn);
};


