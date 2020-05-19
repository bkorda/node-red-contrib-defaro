// var request = require('request');
var NODE_PATH = '/defaro/';

module.exports = function (RED) {
    /**
     * Enable http route to static files
     */
    RED.httpAdmin.get(NODE_PATH + 'static/*', function (req, res) {
        var options = {
            root: __dirname + '/static/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });

    /**
     * Enable http route to JSON itemlist for each controller (controller id passed as GET query parameter)
     */
    RED.httpAdmin.get(NODE_PATH + 'getDevices', function (req, res) {
        var config = req.query;
        var controller = RED.nodes.getNode(config.controllerID);
        var forceRefresh = config.forceRefresh ? ['1', 'yes', 'true'].includes(config.forceRefresh.toLowerCase()) : false;

        if (controller && controller.constructor.name === "ServerNode") {
            controller.discoverDevices(function (items) {
                if (items) {
                    res.json(items);
                } else {
                    res.status(404).end();
                }
            }, forceRefresh);
        } else {
            res.status(404).end();
        }
    });

    RED.httpAdmin.get(NODE_PATH + 'getStatesForDevice', function(req, res) {
        var config = req.query;
        var controller = RED.nodes.getNode(config.controllerID);

        if (controller && controller.constructor.name === "ServerNode") {
            var device = controller.getDevice(config.device_id);
            if (device) {
                var states = Object.keys(device.params).filter(k => k[0] !== k[0].toLowerCase());
                res.json(states);
            } else {
                res.status(404).end();
            }

        } else {
            res.status(404).end();
        }
    })

    RED.httpAdmin.get(NODE_PATH + 'getActionsForDevice', function(req, res) {
        var config = req.query;
        var controller = RED.nodes.getNode(config.server_id);
        if (!controller) {
            return;
        }

        if (controller && controller.constructor.name === "ServerNode") {
            controller.getActionsForDeviceId(config.device_id, function(actions) {
                if (actions) {
                    res.json(actions);
                } else {
                    res.status(404).end();
                }
            });
        } else {
            res.status(404).end();
        }
    })
}
