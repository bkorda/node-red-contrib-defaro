const request = require('request');

const api_url = "http://46.150.176.149:9999/api/v2/"

let userpass = 'admin:87654321';
let userdata = Buffer.from(userpass).toString('base64')

let loginUrl = api_url + "auth/login";
let devicesUrl = api_url + "devices";

const auth = {
    url: loginUrl, 
    headers: {
        'Authorization': 'Basic ' + userdata,
        'Content-Type': 'application/json'
    }
  };

  const devices = {
    url: devicesUrl, 
    headers: {
        'Authorization': 'Basic ' + userdata,
        'Content-Type': 'application/json'
    }
  };
  
request(devices, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log(body);
});