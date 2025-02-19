import { SerialPort } from 'serialport'

const port = new SerialPort({ path: '/dev/ttyV0', baudRate: 9600 })

port.write('hi', function (err: any) {
    if (err) {
        return console.log('Error on write: ', err.message)
    }
    console.log('message written')
})

// Open errors will be emitted as an error event
port.on('error', function (err) {
    console.log('Error: ', err.message)
})
