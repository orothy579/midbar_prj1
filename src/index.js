"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var serialport_1 = require("serialport");
// Create a port
var port = new serialport_1.SerialPort({
    path: "/dev/ttyUSB0",
    baudRate: 9600,
});
port.write("hello");
port.open(function () {
    console.log("Port opened");
});
port.on("data", function (data) {
    console.log("Data:", data.toString());
});
