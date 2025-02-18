import { SerialPort, ReadlineParser } from 'serialport'
import mqtt from 'mqtt'

// Create a port
const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
})

port.write('hello')

port.open(() => {
  console.log('Port opened')
})

port.on('data', function (data: Buffer) {
  console.log('Data:', data.toString())
})
