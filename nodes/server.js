const request = require('request');

module.exports = function(RED) {
    class ServerNode {
        constructor(n) {
            RED.nodes.createNode(this, n);

            var node = this;

            node.items = undefined;
            node.items_list = undefined;
            node.discoverProcess = false;
            node.name = n.name;
            node.ip = n.ip;
            node.port = n.port;
            node.login = n.login;
            node.pass = n.pass;
            node.secure = n.secure || false;
            node.devices = {};

            node.setMaxListeners(255);
            node.refreshDiscoverTimer = null;
            node.refreshDiscoverInterval = 15000;

            node.discoverDevices(function(){}, true);

            this.refreshDiscoverTimer = setInterval(function () {
                node.discoverDevices(function(){}, true);
            }, node.refreshDiscoverInterval);

            function subscribe(last) {
                
                var url = "http://" + node.ip + ":" + node.port + "/api/v2/poll";
                
                if (last) {
                    url += "?last=" + last;
                }
                
                node.log('making request: ' + url);

                request(url, { json : true}, (error, response, body) => {
                    if (response) {
                        if (response.statusCode == 200) {
                            node.onEventMessage(body.events);
                            subscribe(body.last);
                        } else if (response.statusCode == 500) {
                            node.error(response.body.serverError);
                            subscribe(null);
                        }
                    } else if (error) {
                        node.error(error);
                        subscribe(null);
                    }
                }).auth(node.login, node.pass);
            }

            subscribe(null);
        }

        discoverDevices(callback, forceRefresh = false) {
            var node = this;

            if (forceRefresh || node.items === undefined) {
                node.discoverProcess = true;
                var url = "http://" + node.ip + ":" + node.port + "/api/v2/devices";
                  
                request.get(url, {json : true }, (error, result, data) => {
                    if (error) {
                        node.discoverProcess = false;
                        callback(false);
                        return;
                    }

                    node.oldItemsList = node.items !== undefined ? node.items : undefined;
                    node.items = {};

                    if (data) {
                        for (var index in data.devices) {
                            var device = data.devices[index];
                            // prop.device_id = parseInt(index);
                            var key = device.id.toString();
                            node.items[key] = device;
                            
                            if (node.oldItemsList !== undefined && device.id in node.oldItemsList) {} else {
                                node.emit("onNewDevice", device.id);
                            }
                        }
                    }

                    node.discoverProcess = false;
                    callback(node.items);
                    return node.items;
                }).auth(node.login, node.pass);
            } else {
                node.log('discoverDevices: Using cached devices');
                callback(node.items);
                return node.items;
            }
        }

        getActionsForDeviceId(deviceId, callback) {
            var node = this;
            var url = "http://" + node.ip + ":" + node.port + "/api/v2/devices/" + deviceId + "/actions";
            
            request.get(url, {json : true }, (error, result, data) => {
                if (error) {
                    callback(false);
                    return;
                }
                if (data.success === true) {
                    callback(data.actions);
                    return data.actions;
                }
                callback(false);
                return;
            }).auth(node.login, node.pass);;
        }

        getDiscoverProcess() {
            var node = this;
            return node.discoverProcess;
        }

        getDevice(uniqueid) {
            var node = this;
            var result = undefined;

            if (node.items !== undefined && node.items) {
                for (var index in (node.items)) {
                    var item = (node.items)[index];
                    if (item.id === parseInt(uniqueid)) {
                        result = item;
                        break;
                    }
                }
            }
            return result;
        }

        getItemsList(callback, forceRefresh = false) {
            var node = this;
            node.discoverDevices(function(items){
                node.items_list = [];
                for (var index in items) {
                    var device = items[index];
                    
                    node.items_list.push({
                        device_name: device.name,
                        uniqueid: device.id,
                        meta: device
                    });
                }

                callback(node.items_list);
                return node.items_list;
            }, forceRefresh);
        }

        onEventMessage(events) {
            var node = this;
            node.emit('onEventMessage', events);

            if (!events) {
                return
            }

            var eventsDevices = events.filter(event => "device_id" in event);

            for (var nodeId in node.devices) {
                var itemID = this.devices[nodeId];
                var nodeIn = RED.nodes.getNode(nodeId);
                var event = eventsDevices.find(event => event.device_id === parseInt(itemID));
                if (event && event.type === "DeviceChanged") {
                    if (nodeIn && "server" in nodeIn) {
                        //update server items db
                        var serverNode = RED.nodes.getNode(nodeIn.server.id);
                        if ("items" in serverNode) { //} && dataParsed.id in serverNode.items) {
                            // update state of device in server node
                            for (var index in serverNode.items) {
                                var device = serverNode.items[index];
                                if (device.id === event.device_id) {
                                    event.params.forEach((param) => { 
                                        var metricName = param.name;
                                        device.params[metricName] = param.new_value;
                                    })
                                    serverNode.items[index] = device;
                                    break
                                }
                            }
                                
                            if (nodeIn.type === "defaro-input") {
                                // console.log(dataParsed);
                                nodeIn.sendMetrics(device);
                            }
                        }
                    } else {
                        console.log('ERROR: cant get '+nodeId+' node, removed from list');
                        delete node.devices[nodeId];

                        if ("server" in node) {
                            var serverNode = RED.nodes.getNode(node.server.id);
                            delete serverNode.items[dataParsed.uniqueid];
                        }
                    }
                }
            }
        }
    }

    RED.nodes.registerType('defaro-server', ServerNode);
};

