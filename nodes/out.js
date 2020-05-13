var request = require('request');

module.exports = function(RED) {
    class DefaroOut {
        constructor(config) {
            RED.nodes.createNode(this, config);

            var node = this;
            node.config = config;
            node.cleanTimer = null;
            
            //get server node
            node.server = RED.nodes.getNode(node.config.server);
            if (node.server) {
                node.status({}); //clean
                // node.server.devices[node.id] = node.config.device; //register node in devices list
                node.on('input', function (message) {
                    clearTimeout(node.cleanTimer);
                    if (node.config.device) {
                        var payload;
                        var args;
                        var finalCommand = {};
                        switch (node.payloadType) {
                        case 'flow':
                        case 'global': 
                            RED.util.evaluateNodeProperty(node.payload, node.payloadType, this, message, function (error, result) {
                                if (error) {
                                    node.error(error, message);
                                } else {
                                    payload = result;
                                }
                            });
                        break;
                        
                        case 'msg':
                        default: 
                            payload = message.payload;
                            finalCommand = payload;
                            break;
                        }

                        var command;
                        switch (node.commandType) {
                        case 'msg': 
                            command = message[node.command];
                        break;
                        
                        case 'defaro_cmd':
                            command = node.command;
                            switch (command) {
                                case 'setStatus':
                                    var payloadBool = payload === 1 || payload === true || payload === "true"                        
                                    args = {status : payloadBool}
                                break;

                                case 'setLevel':
                                    var payloadNum = parseInt(payload);
                                    args = {level : payloadNum}
                                break;

                                case 'startLevelChange':
                                    args = {level : payloadNum}
                                break;

                                case 'setSetpoint':
                                    var setpoint = parseDouble(payload[0]);
                                    var setpointType = payload[1];
                                    args = {setpoint : setpoint, setpointType: setpointType}
                                break;

                                case 'setMode':
                                    var mode = payload[0];
                                    args = {mode : mode}
                                break;
                            }

                            finalCommand = {
                                method : command,
                                params : args
                            }
                        break;

                        case 'object':
                            finalCommand = message.payload;
                        break;
                        default: 
                            command = node.command;
                        break;
                        }
                        //empty payload, stop
                        if (payload === null) {
                            return false;
                        }
                        //send data to API
                        var deviceMeta = node.server.getDevice(node.config.device);
                        if (deviceMeta !== undefined && deviceMeta && "id" in deviceMeta) {
                        
                            if (command == null || command == undefined) {
                                return false;
                            }

                            node.postData(deviceMeta.id, finalCommand);
                        } else {
                            node.cleanTimer = setTimeout(function(){
                                node.status({}); //clean
                            }, 3000);
                        }
                    } else {
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: "node-red-contrib-defaro/out:status.device_not_set"
                        });
                    }
                });
            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "node-red-contrib-defaro/out:status.server_node_error"
                });
            }

            node.payload = config.payload;
            node.command = config.command;
            node.payloadType = config.payloadType;
            node.commandType = config.commandType;
            node.cleanTimer = null;
        }

        postData(deviceId, actions) {
            var node = this;
            // node.log('Requesting url: '+url);
            // console.log(post);
            var url = 'http://' + node.server.ip + ':' + node.server.port + '/api/v2/devices/' + deviceId + '/actions';
        
            request.post({ url : url, json : true, body : [actions]}, function(error, response, body){
                if (error && typeof(error) === 'object') {
                    node.warn(error);
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "node-red-contrib-defaro/out:status.connection"
                    });

                    node.cleanTimer = setTimeout(function(){
                        node.status({}); //clean
                    }, 3000);
                } else if (response.statusCode == 200) {
                    if (response.body && response.body.length && response.body[0].success) {
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "node-red-contrib-defaro/out:status.ok"
                        });
                    } else {
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: response.body[0].errorMessage
                        });
                    }
                    
                    node.cleanTimer = setTimeout(function(){
                        node.status({}); //clean
                    }, 5000);
                } else if (response.statusCode == 404) {
                    node.warn('defaro-out ERROR: '+ response.error.errorMessage);
                    node.warn(response.error);
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "node-red-contrib-defaro/out:status.error"
                    });
                }
            }).auth(node.server.login, node.server.pass);
        }
    }

    RED.nodes.registerType('defaro-output', DefaroOut);
};












