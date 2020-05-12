var request = require('request');

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
            node.port = 8083;
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
        }

        discoverDevices(callback, forceRefresh = false) {
            var node = this;

            if (forceRefresh || node.items === undefined) {
                node.discoverProcess = true;

                var url = "http://" + node.ip + ":" + node.port + "/api/v2/devices";
                let userpass = node.login + ':' + node.pass;
                let userdata = Buffer.from(userpass).toString('base64')
  
                const devicesRequest = {
                    url: url, 
                    headers: {
                        'Authorization': 'Basic ' + userdata,
                        'Content-Type': 'application/json'
                    }
                  };
                  
                request.get(devicesRequest, (error, result, data) => {
                    
                    if (error) {
                        node.discoverProcess = false;
                        callback(false);
                        return;
                    }

                    try {
                        var dataParsed = JSON.parse(data);
                    } catch (e) {
                        node.discoverProcess = false;
                        callback(false);
                        return;
                    }

                    node.oldItemsList = node.items !== undefined ? node.items : undefined;
                    node.items = [];

                    if (dataParsed) {
                        for (var index in dataParsed.data.devices) {
                            var device = dataParsed.data.devices[index];
                            // prop.device_id = parseInt(index);
                            node.items[device.id] = device;
                            
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

        // getDiscoverProcess() {
        //     var node = this;
        //     return node.discoverProcess;
        // }

        // getDevice(uniqueid) {
        //     var node = this;
        //     var result = undefined;

        //     if (node.items !== undefined && node.items) {
        //         for (var index in (node.items)) {
        //             var item = (node.items)[index];
        //             if (item.id === uniqueid) {
        //                 result = item;
        //                 break;
        //             }
        //         }
        //     }
        //     return result;
        // }

        // getItemsList(callback, forceRefresh = false) {
        //     var node = this;
        //     node.discoverDevices(function(items){
        //         node.items_list = [];
        //         for (var index in items) {
        //             var device = items[index];
                    
        //             node.items_list.push({
        //                 device_name: device.name,
        //                 uniqueid: device.id,
        //                 meta: device
        //             });
        //         }

        //         callback(node.items_list);
        //         return node.items_list;
        //     }, forceRefresh);
        // }

        // onSocketMessage(dataParsed) {
        //     var that = this;
        //     that.emit('onSocketMessage', dataParsed);

        //     for (var nodeId in this.devices) {
        //         var itemID = this.devices[nodeId];
        //         var node = RED.nodes.getNode(nodeId);

        //         if (dataParsed.source === itemID) {
        //             if (node && "server" in node) {
        //                 //update server items db
        //                 var serverNode = RED.nodes.getNode(node.server.id);
        //                 if ("items" in serverNode) { //} && dataParsed.id in serverNode.items) {
        //                     // update state of device in server node
        //                     for (var index in serverNode.items) {
        //                         var device = serverNode.items[index];
        //                         if (device.id === dataParsed.source) {
        //                             device.metrics.level = dataParsed.message.l
        //                             serverNode.items[index] = device;
        //                             break
        //                         }
        //                     }
                                
        //                     if (node.type === "zway-input") {
        //                         // console.log(dataParsed);
        //                         node.sendMetrics(dataParsed);
        //                     }
        //                 }
        //             } else {
        //                 console.log('ERROR: cant get '+nodeId+' node, removed from list');
        //                 delete node.devices[nodeId];

        //                 if ("server" in node) {
        //                     var serverNode = RED.nodes.getNode(node.server.id);
        //                     delete serverNode.items[dataParsed.uniqueid];
        //                 }
        //             }
        //         }
        //     }
        // }
    }

    RED.nodes.registerType('defaro-server', ServerNode);
};

